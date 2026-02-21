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
  const { toast } = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create PIX payment
  const createPayment = useCallback(async () => {
    setState('loading');
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

      setPixQrCode(data.pix_qr_code);
      setPixQrCodeBase64(data.pix_qr_code_base64);
      setPaymentId(data.payment_id);
      
      if (data.pix_expiration_date) {
        setExpiresAt(new Date(data.pix_expiration_date));
      }

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

    const handleStatusChange = (status: string) => {
      if (!isActive) return;
      if (status === 'approved') {
        setState('approved');
        setTimeout(() => onPaymentApproved(), 2000);
      } else if (status === 'rejected') {
        setState('rejected');
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
          console.log('[PIX-RT] Realtime event received:', newStatus);
          handleStatusChange(newStatus);
        }
      )
      .subscribe((status) => {
        console.log('[PIX-RT] Channel status:', status);
      });

    // 2. Polling fallback every 5s
    const poll = async () => {
      if (!isActive) return;
      try {
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('id', paymentId)
          .single();
        console.log('[PIX-POLL] Polling result:', payment?.status);
        if (payment?.status) handleStatusChange(payment.status);
      } catch {
        // Silent fail
      }
    };

    poll(); // immediate first check
    pollInterval = setInterval(poll, 5000);

    return () => {
      isActive = false;
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [paymentId, onPaymentApproved]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expirado');
        setState('error');
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
  }, [expiresAt]);

  // Create payment on mount
  useEffect(() => {
    if (isOpen && orderId) {
      createPayment();
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, orderId, createPayment]);

  // Copy PIX code to clipboard
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
          {state !== 'approved' && (
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Gerando código PIX...</p>
            </div>
          )}

          {/* QR Code Ready / Polling */}
          {state === 'ready' && (
            <div className="flex flex-col items-center gap-4">
              {/* Amount */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-bold text-primary">{formatPrice(amount)}</p>
              </div>

              {/* QR Code Image */}
              {pixQrCodeBase64 && (
                <div className="bg-white p-4 rounded-xl">
                  <img
                    src={`data:image/png;base64,${pixQrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
              )}

              {/* Expiration timer */}
              {timeLeft && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Expira em {timeLeft}</span>
                </div>
              )}

              {/* Copy button */}
              {pixQrCode && (
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className={cn(
                    'w-full gap-2',
                    copied && 'border-primary text-primary'
                  )}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copiar código PIX
                    </>
                  )}
                </Button>
              )}

              {/* Waiting indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Aguardando pagamento...</span>
              </div>

              {/* Instructions */}
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

          {/* Approved */}
          {state === 'approved' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Pagamento Aprovado!</h3>
              <p className="text-muted-foreground text-center">
                Seu pedido está sendo preparado.
              </p>
              <p className="text-sm text-primary font-medium">{formatPrice(amount)}</p>
            </div>
          )}

          {/* Rejected */}
          {state === 'rejected' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Pagamento Rejeitado</h3>
              <p className="text-muted-foreground text-center">
                O pagamento não foi aprovado. Tente novamente.
              </p>
              <Button onClick={createPayment} className="w-full">
                Gerar novo PIX
              </Button>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Erro</h3>
              <p className="text-muted-foreground text-center">
                Não foi possível gerar o PIX. Tente novamente.
              </p>
              <Button onClick={createPayment} className="w-full">
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
