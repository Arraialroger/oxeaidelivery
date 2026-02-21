import { useState, useEffect, useCallback, useRef } from 'react';
import { QrCode, Copy, CheckCircle2, Clock, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatUtils';
import { cn } from '@/lib/utils';

interface PixPaymentModalProps {
  isOpen: boolean;
  orderId: string;
  restaurantId: string;
  amount: number;
  slug: string;
  onClose: () => void;
  onPaymentApproved: () => void;
}

type PixState = 'loading' | 'ready' | 'approved' | 'rejected' | 'error';

// localStorage helpers
const PIX_STORAGE_KEY = (orderId: string) => `pix_pending_${orderId}`;

interface PixStorageData {
  paymentId: string;
  pixQrCode: string | null;
  pixQrCodeBase64: string | null;
  expiresAt: string | null;
  amount: number;
  correlationId: string | null;
  createdAt: string;
}

function savePixToStorage(orderId: string, data: PixStorageData) {
  try {
    localStorage.setItem(PIX_STORAGE_KEY(orderId), JSON.stringify(data));
  } catch { /* silent */ }
}

function loadPixFromStorage(orderId: string): PixStorageData | null {
  try {
    const raw = localStorage.getItem(PIX_STORAGE_KEY(orderId));
    if (!raw) return null;
    const data = JSON.parse(raw) as PixStorageData;
    // Check if expired
    if (data.expiresAt && new Date(data.expiresAt) <= new Date()) {
      localStorage.removeItem(PIX_STORAGE_KEY(orderId));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function clearPixStorage(orderId: string) {
  try {
    localStorage.removeItem(PIX_STORAGE_KEY(orderId));
  } catch { /* silent */ }
}

export function PixPaymentModal({
  isOpen,
  orderId,
  restaurantId,
  amount,
  slug,
  onClose,
  onPaymentApproved,
}: PixPaymentModalProps) {
  const [state, setState] = useState<PixState>('loading');
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('disconnected');
  const pollCountRef = useRef(0);
  const { toast } = useToast();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create PIX payment (or restore from localStorage)
  const createPayment = useCallback(async () => {
    // Try to restore from localStorage first
    const cached = loadPixFromStorage(orderId);
    if (cached) {
      console.log(`[PIX] Restored from localStorage, paymentId=${cached.paymentId}`);
      setPixQrCode(cached.pixQrCode);
      setPixQrCodeBase64(cached.pixQrCodeBase64);
      setPaymentId(cached.paymentId);
      setCorrelationId(cached.correlationId);
      if (cached.expiresAt) setExpiresAt(new Date(cached.expiresAt));
      setState('ready');
      return;
    }

    setState('loading');
    console.log(`[PIX] Creating payment for order=${orderId}, amount=${amount}`);
    try {
      const { data, error } = await supabase.functions.invoke('process-payment', {
        body: {
          order_id: orderId,
          restaurant_id: restaurantId,
          amount,
          description: `Pedido ${orderId.slice(0, 8)}`,
        },
      });

      if (error) throw error;
      if (!data) throw new Error('Empty response');

      console.log(`[PIX] Payment created: paymentId=${data.payment_id}, cid=${data.correlation_id}`);

      setPixQrCode(data.pix_qr_code);
      setPixQrCodeBase64(data.pix_qr_code_base64);
      setPaymentId(data.payment_id);
      setCorrelationId(data.correlation_id || null);
      
      if (data.pix_expiration_date) {
        setExpiresAt(new Date(data.pix_expiration_date));
      }

      // Save to localStorage for recovery
      savePixToStorage(orderId, {
        paymentId: data.payment_id,
        pixQrCode: data.pix_qr_code,
        pixQrCodeBase64: data.pix_qr_code_base64,
        expiresAt: data.pix_expiration_date || null,
        amount,
        correlationId: data.correlation_id || null,
        createdAt: new Date().toISOString(),
      });

      setState('ready');
    } catch (err) {
      console.error('[PIX] Error creating payment:', err);
      setState('error');
      toast({
        title: 'Erro ao gerar PIX',
        description: 'Tente novamente em alguns segundos.',
        variant: 'destructive',
      });
    }
  }, [orderId, restaurantId, amount, toast]);

  // Realtime + Polling fallback for payment status
  useEffect(() => {
    if (!paymentId) return;

    let isActive = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    pollCountRef.current = 0;

    const handleStatusChange = (status: string, source: string) => {
      if (!isActive) return;
      console.log(`[PIX] Status change detected via ${source}: ${status}`);
      if (status === 'approved') {
        setState('approved');
        clearPixStorage(orderId);
        setTimeout(() => onPaymentApproved(), 2000);
      } else if (status === 'rejected') {
        setState('rejected');
        clearPixStorage(orderId);
      }
    };

    // 1. Realtime subscription
    const channel = supabase
      .channel(`pix-payment:${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          console.log(`[PIX-RT] Realtime event: status=${newStatus}`);
          handleStatusChange(newStatus, 'realtime');
        }
      )
      .subscribe((status) => {
        setRealtimeStatus(status);
        console.log(`[PIX-RT] Channel: ${status}`);
      });

    // 2. Polling fallback every 5s
    const poll = async () => {
      if (!isActive) return;
      pollCountRef.current++;
      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('id', paymentId)
          .single();
        console.log(`[PIX-POLL] #${pollCountRef.current}: status=${payment?.status}`);
        if (payment?.status) handleStatusChange(payment.status, 'polling');
      } catch { /* silent */ }
    };

    poll();
    pollInterval = setInterval(poll, 5000);

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
      console.log(`[PIX] Cleanup: channel removed, polls=${pollCountRef.current}`);
    };
  }, [paymentId, onPaymentApproved, orderId]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expirado');
        setState('error');
        clearPixStorage(orderId);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt, orderId]);

  // Create payment on mount
  useEffect(() => {
    if (isOpen && orderId) {
      createPayment();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, orderId, createPayment]);

  // Copy PIX code
  const handleCopy = async () => {
    if (!pixQrCode) return;
    try {
      await navigator.clipboard.writeText(pixQrCode);
      setCopied(true);
      toast({ title: 'Código PIX copiado!' });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie o código manualmente.',
        variant: 'destructive',
      });
    }
  };

  // Retry: clear storage and create new payment
  const handleRetry = () => {
    clearPixStorage(orderId);
    setPaymentId(null);
    setPixQrCode(null);
    setPixQrCodeBase64(null);
    setExpiresAt(null);
    setTimeLeft('');
    pollCountRef.current = 0;
    createPayment();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={state === 'approved' ? undefined : onClose} />

      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Pagamento PIX</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Realtime status indicator (DEV only) */}
            {import.meta.env.DEV && (
              <div className={cn(
                'w-2 h-2 rounded-full',
                realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500' :
                realtimeStatus === 'CHANNEL_ERROR' ? 'bg-red-500' : 'bg-yellow-500'
              )} title={`RT: ${realtimeStatus}`} />
            )}
            {state !== 'approved' && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Gerando código PIX...</p>
            </div>
          )}

          {state === 'ready' && (
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
              </div>

              {pixQrCodeBase64 && (
                <div className="bg-white p-4 rounded-xl">
                  <img
                    src={`data:image/png;base64,${pixQrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}

              {timeLeft && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expira em {timeLeft}</span>
                </div>
              )}

              {pixQrCode && (
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className={cn('w-full gap-2', copied && 'border-primary text-primary')}
                >
                  {copied ? (
                    <><CheckCircle2 className="w-4 h-4" /> Copiado!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copiar código PIX</>
                  )}
                </Button>
              )}

              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando pagamento...</span>
              </div>

              <div className="w-full mt-4 p-4 bg-secondary rounded-xl text-sm space-y-2">
                <p className="font-medium text-foreground">Como pagar:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Abra o app do seu banco</li>
                  <li>Escaneie o QR Code ou cole o código</li>
                  <li>Confirme o pagamento</li>
                  <li>A tela atualizará automaticamente</li>
                </ol>
              </div>
            </div>
          )}

          {state === 'approved' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Pagamento Aprovado!</h3>
              <p className="text-muted-foreground text-center">Seu pedido está sendo preparado.</p>
              <p className="text-sm text-primary font-medium">{formatPrice(amount)}</p>
            </div>
          )}

          {state === 'rejected' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Pagamento Rejeitado</h3>
              <p className="text-muted-foreground text-center">O pagamento não foi aprovado. Tente novamente.</p>
              <Button onClick={handleRetry} className="w-full">Gerar novo PIX</Button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Erro</h3>
              <p className="text-muted-foreground text-center">Não foi possível gerar o PIX. Tente novamente.</p>
              <Button onClick={handleRetry} className="w-full">Tentar novamente</Button>
            </div>
          )}
        </div>

        {/* Debug info (DEV only) */}
        {import.meta.env.DEV && correlationId && (
          <div className="px-4 pb-2 text-[10px] text-muted-foreground font-mono">
            cid: {correlationId} | polls: {pollCountRef.current} | rt: {realtimeStatus}
          </div>
        )}
      </div>
    </div>
  );
}
