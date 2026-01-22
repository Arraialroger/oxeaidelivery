import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChefHat, Check, Truck, RefreshCw, CreditCard, Banknote, QrCode, Volume2, VolumeX, Printer, X, History, XCircle, Search, CalendarIcon, TrendingUp, ShoppingBag, DollarSign, Download, FileText, PieChartIcon, Loader2, BarChart3, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useKdsEvents } from '@/hooks/useKdsEvents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { KdsPerformanceReport } from '@/components/kitchen/KdsPerformanceReport';
import { KdsPieTooltip } from '@/components/kitchen/KdsPieTooltip';

// Print order receipt using iframe for reliable browser print dialog
const printOrderReceipt = (order: OrderWithDetails) => {
  const paymentMethodText = {
    pix: 'PIX',
    card: 'Cartão',
    cash: 'Dinheiro',
  }[order.payment_method || ''] || order.payment_method;

  const receiptHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Pedido #${order.id.slice(0, 8)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 280px; }
        .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
        .header h1 { font-size: 16px; margin-bottom: 5px; }
        .order-id { font-size: 14px; font-weight: bold; }
        .section { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #000; }
        .section-title { font-weight: bold; margin-bottom: 5px; }
        .item { margin-bottom: 8px; }
        .item-name { font-weight: bold; }
        .item-options { font-size: 11px; color: #555; margin-left: 15px; }
        .item-note { font-size: 11px; font-style: italic; margin-left: 15px; }
        .total { font-size: 14px; font-weight: bold; text-align: right; }
        .payment { background: #f0f0f0; padding: 5px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        @media print { body { max-width: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🍔 PEDIDO</h1>
        <div class="order-id">#${order.id.slice(0, 8).toUpperCase()}</div>
        <div>${new Date(order.created_at).toLocaleString('pt-BR')}</div>
      </div>

      <div class="section">
        <div class="section-title">CLIENTE:</div>
        <div>${order.customer?.name || 'Não informado'}</div>
        <div>${order.customer?.phone || ''}</div>
      </div>

      <div class="section">
        <div class="section-title">ENDEREÇO:</div>
        ${order.address ? `
          <div>${order.address.street}, ${order.address.number}</div>
          <div>${order.address.neighborhood}</div>
          ${order.address.reference ? `<div>Ref: ${order.address.reference}</div>` : ''}
          ${order.address.reference_point ? `<div>Ponto: ${order.address.reference_point}</div>` : ''}
        ` : '<div>Não informado</div>'}
      </div>

      <div class="section">
        <div class="section-title">ITENS:</div>
        ${order.items.map(item => {
          const comboOptions = item.options.filter(o => o.option_name.includes(':'));
          const normalOptions = item.options.filter(o => !o.option_name.includes(':'));
          return `
          <div class="item">
            <div class="item-name">${item.quantity}x ${item.product?.name}</div>
            ${comboOptions.length > 0 ? comboOptions.map(o => {
              const [slot, product] = o.option_name.split(':');
              return `<div class="item-options" style="margin-left: 10px;">• ${slot.trim()}: <strong>${product.trim()}</strong></div>`;
            }).join('') : ''}
            ${normalOptions.length > 0 ? normalOptions.map(o => {
              const isRemoval = o.option_name.toUpperCase().startsWith('SEM ');
              const isAddon = o.option_price > 0;
              const icon = isRemoval ? '❌' : isAddon ? '➕' : '🔄';
              return `<div class="item-options" style="margin-left: 10px;">${icon} ${o.option_name}${o.option_price > 0 ? ` (+R$ ${o.option_price.toFixed(2)})` : ''}</div>`;
            }).join('') : ''}
            ${item.note ? `<div class="item-note">📝 ${item.note}</div>` : ''}
          </div>
        `}).join('')}
      </div>

      <div class="total">TOTAL: R$ ${order.total.toFixed(2)}</div>

      <div class="payment">
        <strong>PAGAMENTO:</strong> ${paymentMethodText}
        ${order.payment_method === 'cash' && order.change ? `<br><strong>TROCO PARA:</strong> R$ ${order.change}` : ''}
      </div>

      <div class="footer">
        <p>Obrigado pela preferência!</p>
      </div>
    </body>
    </html>
  `;

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(receiptHtml);
  iframeDoc.close();

  // Wait for content to render, then print
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    }
    // Remove iframe after printing (with delay for the dialog)
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  // Fallback: trigger load manually if already loaded
  setTimeout(() => {
    if (iframe.parentNode) {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print fallback error:', e);
      }
    }
  }, 500);
};

interface OrderWithDetails {
  id: string;
  status: 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: string | null;
  change: string | null;
  total: number;
  created_at: string;
  cancellation_reason: string | null;
  customer: { name: string; phone: string } | null;
  address: { street: string; number: string; neighborhood: string; reference: string | null; reference_point: string | null } | null;
  items: {
    id: string;
    quantity: number;
    note: string | null;
    product: { name: string } | null;
    options: { option_name: string; option_price: number }[];
  }[];
}

// Format phone number into WhatsApp link
const formatWhatsAppLink = (phone: string | undefined) => {
  if (!phone) return null;
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  // Add Brazil country code if not present
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
  return `https://wa.me/${fullPhone}`;
};

// Format phone for display
const formatPhoneDisplay = (phone: string | undefined) => {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
};

// Persistent AudioContext reference - created once and reused
let sharedAudioContext: AudioContext | null = null;

const getSharedAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioContext;
};

// Function to unlock audio context after user interaction
const unlockAudioContext = async (): Promise<boolean> => {
  try {
    const audioContext = getSharedAudioContext();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    return audioContext.state === 'running';
  } catch (error) {
    console.error('Error unlocking audio context:', error);
    return false;
  }
};

// Notification sound using Web Audio API - LOUD alert for kitchen environment
const playNotificationSound = async (): Promise<boolean> => {
  try {
    const audioContext = getSharedAudioContext();
    
    // Try to resume if suspended
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn('Could not resume AudioContext:', e);
        return false;
      }
    }
    
    // Check if still not running
    if (audioContext.state !== 'running') {
      console.warn('AudioContext not running, state:', audioContext.state);
      return false;
    }
    
    // Create a loud, attention-grabbing notification sound
    const playTone = (frequency: number, startTime: number, duration: number, type: OscillatorType = 'square') => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      // Volume muito mais alto: 0.85 (era 0.3)
      gainNode.gain.setValueAtTime(0.85, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // Repetir o padrão 3 vezes para garantir que seja ouvido
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.7; // 700ms entre cada repetição
      
      // Bass hit inicial (grave, mais perceptível)
      playTone(200, now + offset, 0.1, 'square');
      
      // Melodia de alerta (notas mais longas)
      playTone(523.25, now + offset + 0.1, 0.2, 'square');   // C5
      playTone(659.25, now + offset + 0.3, 0.2, 'square');   // E5
      playTone(783.99, now + offset + 0.5, 0.25, 'square');  // G5
    }
    
    // Vibração do dispositivo se disponível
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    
    return true;
  } catch (error) {
    console.error('Error playing notification sound:', error);
    return false;
  }
};

export default function Kitchen() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { logStatusChange, logOrderPrinted, logOrderCancelled } = useKdsEvents();
  
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [historyOrders, setHistoryOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioActivated, setAudioActivated] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<OrderWithDetails | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const { toast } = useToast();

  // useCallback hooks - MUST be before any early returns
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        payment_method,
        change,
        total,
        created_at,
        cancellation_reason,
        customer:customers(name, phone),
        address:addresses(street, number, neighborhood, reference, reference_point),
        items:order_items(
          id,
          quantity,
          note,
          product:products(name),
          options:order_item_options(option_name, option_price)
        )
      `)
      .in('status', ['pending', 'preparing', 'ready', 'out_for_delivery'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }

    const newOrders = (data as OrderWithDetails[]) || [];
    
    // Check for new orders and play sound
    if (!isInitialLoadRef.current && soundEnabled && audioActivated) {
      const currentOrderIds = new Set(newOrders.map(o => o.id));
      const newOrderIds = [...currentOrderIds].filter(id => !previousOrderIdsRef.current.has(id));
      
      if (newOrderIds.length > 0) {
        playNotificationSound();
        toast({
          title: '🔔 Novo pedido!',
          description: `${newOrderIds.length} novo(s) pedido(s) recebido(s)`,
        });
      }
    }
    
    // Update refs
    previousOrderIdsRef.current = new Set(newOrders.map(o => o.id));
    isInitialLoadRef.current = false;

    setOrders(newOrders);
    setLoading(false);
  }, [soundEnabled, audioActivated, toast]);

  const fetchHistoryOrders = useCallback(async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        status,
        payment_method,
        change,
        total,
        created_at,
        cancellation_reason,
        customer:customers(name, phone),
        address:addresses(street, number, neighborhood, reference, reference_point),
        items:order_items(
          id,
          quantity,
          note,
          product:products(name),
          options:order_item_options(option_name, option_price)
        )
      `)
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(50);

    setHistoryLoading(false);

    if (error) {
      console.error('Error fetching history:', error);
      return;
    }

    setHistoryOrders((data as OrderWithDetails[]) || []);
  }, []);

  // useEffect hooks - MUST be before any early returns
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (historyOpen) {
      fetchHistoryOrders();
    }
  }, [historyOpen, fetchHistoryOrders]);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
          // Também atualiza histórico se estiver aberto
          if (historyOpen) {
            fetchHistoryOrders();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, fetchHistoryOrders, historyOpen]);

  // Early returns - AFTER all hooks
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Regular functions (not hooks) - can be after early returns
  const openCancelDialog = (orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason('');
    setCancelDialogOpen(true);
  };

  const cancelOrder = async () => {
    if (!cancelOrderId || !cancelReason.trim()) {
      toast({ title: 'Informe o motivo do cancelamento', variant: 'destructive' });
      return;
    }
    
    setCancelling(true);
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancellation_reason: cancelReason.trim() })
      .eq('id', cancelOrderId);

    setCancelling(false);
    
    if (error) {
      toast({ title: 'Erro ao cancelar pedido', variant: 'destructive' });
      return;
    }

    // Registrar evento KDS - fail-safe
    logOrderCancelled(cancelOrderId).catch(() => {});

    // Enviar push notification de cancelamento
    const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: { orderId: cancelOrderId, status: 'cancelled' }
    });
    if (pushError) {
      console.error('[Kitchen] Push notification error (cancel):', pushError);
    } else {
      console.log('[Kitchen] Push notification sent (cancel):', pushData);
    }

    toast({ title: 'Pedido cancelado' });
    setCancelDialogOpen(false);
    setCancelOrderId(null);
    setCancelReason('');
    fetchOrders();
  };

  const updateStatus = async (
    orderId: string,
    newStatus: 'preparing' | 'ready' | 'out_for_delivery' | 'delivered'
  ) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        variant: 'destructive',
      });
      return;
    }

    // Registrar evento KDS - fail-safe
    logStatusChange(orderId, newStatus).catch(() => {});

    // LOYALTY: Credit stamp if status = delivered (fail-safe)
    // Notificação unificada: combina status + selo quando aplicável
    let stampResult: { success?: boolean; stamps_count?: number; stamps_goal?: number; reward_available?: boolean } | null = null;
    
    if (newStatus === 'delivered') {
      try {
        const { data, error: stampError } = await supabase.functions.invoke('credit-stamp', {
          body: { orderId, status: newStatus }
        });
        if (stampError) {
          console.error('[Kitchen] Erro ao creditar selo:', stampError);
        } else {
          console.log('[Kitchen] Resultado credito selo:', data);
          stampResult = data;
          if (stampResult?.success) {
            toast({ 
              title: `🎉 Selo creditado! (${stampResult.stamps_count}/${stampResult.stamps_goal})`,
            });
          }
        }
      } catch (e) {
        console.error('[Kitchen] Falha ao chamar credit-stamp:', e);
        // Fail-safe: não impede o fluxo
      }
    }

    // Enviar push notification (unificada quando selo é ganho)
    let pushBody: { orderId: string; status: string; customTitle?: string; customBody?: string } = { 
      orderId, 
      status: newStatus 
    };

    // Se selo foi creditado com sucesso, enviar notificação unificada
    if (stampResult?.success) {
      const stampsCount = stampResult.stamps_count ?? 0;
      const stampsGoal = stampResult.stamps_goal ?? 8;
      
      if (stampResult.reward_available) {
        // Brinde disponível - mensagem especial
        pushBody = {
          orderId,
          status: 'delivered_with_reward',
          customTitle: '🎉 Entregue + 🎁 Brinde!',
          customBody: `Pedido entregue! Você completou ${stampsGoal} selos e ganhou um brinde! Resgate no próximo pedido.`,
        };
      } else {
        // Selo ganho - mensagem combinada
        pushBody = {
          orderId,
          status: 'delivered_with_stamp',
          customTitle: `🎉 Entregue + ⭐ Selo!`,
          customBody: `Pedido entregue! +1 selo de fidelidade (${stampsCount}/${stampsGoal}). Faltam ${stampsGoal - stampsCount} para seu brinde!`,
        };
      }
    }

    const { data: pushData, error: pushError } = await supabase.functions.invoke('send-push-notification', {
      body: pushBody
    });
    if (pushError) {
      console.error('[Kitchen] Push notification error:', pushError);
      toast({ title: 'Aviso: falha ao enviar notificação push', variant: 'destructive' });
    } else {
      console.log('[Kitchen] Push notification sent:', pushData);
    }

    toast({ title: `Status atualizado para ${newStatus}` });
    fetchOrders();
  };

  const getTimeSince = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diff = Math.floor((now.getTime() - created.getTime()) / 1000 / 60);

    if (diff < 1) return 'Agora';
    if (diff < 60) return `${diff}min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}min`;
  };

  const statusConfig = {
    pending: {
      label: 'Pendente',
      color: 'bg-yellow-500/20 text-yellow-500',
      icon: Clock,
      nextStatus: 'preparing' as const,
      nextLabel: 'Preparar',
    },
    preparing: {
      label: 'Preparando',
      color: 'bg-blue-500/20 text-blue-500',
      icon: ChefHat,
      nextStatus: 'ready' as const,
      nextLabel: 'Pronto',
    },
    ready: {
      label: 'Pronto',
      color: 'bg-green-500/20 text-green-500',
      icon: Check,
      nextStatus: 'out_for_delivery' as const,
      nextLabel: 'Saiu p/ Entrega',
    },
    out_for_delivery: {
      label: 'Saiu p/ Entrega',
      color: 'bg-purple-500/20 text-purple-500',
      icon: Truck,
      nextStatus: 'delivered' as const,
      nextLabel: 'Entregue',
    },
    delivered: {
      label: 'Entregue',
      color: 'bg-muted text-muted-foreground',
      icon: Truck,
      nextStatus: null,
      nextLabel: null,
    },
    cancelled: {
      label: 'Cancelado',
      color: 'bg-destructive/20 text-destructive',
      icon: Clock,
      nextStatus: null,
      nextLabel: null,
    },
  };

  const groupedOrders = {
    pending: orders.filter((o) => o.status === 'pending'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready' || o.status === 'out_for_delivery'),
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="w-7 h-7 text-primary" />
            KDS - Cozinha
          </h1>
          <p className="text-muted-foreground">
            {orders.length} pedidos ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={soundEnabled && !audioActivated ? "destructive" : "outline"}
            size="icon"
            className={soundEnabled && !audioActivated ? "animate-pulse" : ""}
            onClick={async () => {
              if (!soundEnabled) {
                // Turning on: unlock audio and play test sound
                const unlocked = await unlockAudioContext();
                if (unlocked) {
                  setAudioActivated(true);
                  setSoundEnabled(true);
                  await playNotificationSound();
                  toast({
                    title: '🔔 Som ativado!',
                    description: 'Você receberá alertas sonoros para novos pedidos.',
                  });
                } else {
                  toast({
                    title: 'Erro ao ativar som',
                    description: 'Tente novamente.',
                    variant: 'destructive',
                  });
                }
              } else {
                // Turning off
                setSoundEnabled(false);
              }
            }}
            title={soundEnabled ? (audioActivated ? 'Desativar som' : 'Clique para ativar o som') : 'Ativar som'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          {soundEnabled && !audioActivated && (
            <Badge variant="destructive" className="animate-pulse text-xs">
              Clique para ativar
            </Badge>
          )}
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="gap-2">
            <ChefHat className="w-4 h-4" />
            Pedidos
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatório de Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum pedido ativo
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['pending', 'preparing', 'ready'] as const).map((status) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    statusConfig[status].color
                  )}
                >
                  {statusConfig[status].label}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({groupedOrders[status].length})
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {groupedOrders[status].map((order) => {
                  const config = statusConfig[order.status];
                  const Icon = config.icon;
                  
                  // Check if pending order is older than 10 minutes
                  const isUrgent = order.status === 'pending' && 
                    (new Date().getTime() - new Date(order.created_at).getTime()) > 10 * 60 * 1000;

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        "bg-card border rounded-xl p-4",
                        isUrgent 
                          ? "border-destructive animate-pulse-urgent" 
                          : "border-border"
                      )}
                    >
                      {/* Order Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-mono text-sm text-muted-foreground">
                            #{order.id.slice(0, 8)}
                          </span>
                          <p className="font-semibold">
                            {order.customer?.name || 'Cliente'}
                          </p>
                          {order.customer?.phone && (
                            <a
                              href={formatWhatsAppLink(order.customer.phone) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline mt-0.5"
                            >
                              <MessageCircle className="w-3 h-3" />
                              {formatPhoneDisplay(order.customer.phone)}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary text-sm">
                          <Clock className="w-4 h-4" />
                          {getTimeSince(order.created_at || '')}
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-2 mb-4">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-secondary rounded-lg p-2"
                          >
                            <div className="flex items-start gap-2">
                              <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                                {item.quantity}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {item.product?.name}
                                </p>
                                {item.options.length > 0 && (
                                  <div className="mt-1 space-y-0.5">
                                    {/* Seleções de combo - exibir em lista vertical */}
                                    {item.options.filter(o => o.option_name.includes(':')).map((o, idx) => {
                                      const [slotName, productName] = o.option_name.split(':');
                                      return (
                                        <div key={idx} className="text-xs pl-2 border-l-2 border-primary/40">
                                          <span className="text-muted-foreground">{slotName.trim()}:</span>
                                          <span className="text-foreground font-medium ml-1">{productName.trim()}</span>
                                        </div>
                                      );
                                    })}
                                    
                                    {/* Opções normais - exibir linha por linha com ícones */}
                                    {item.options.filter(o => !o.option_name.includes(':')).map((o, idx) => {
                                      const isRemoval = o.option_name.toUpperCase().startsWith('SEM ');
                                      const isAddon = o.option_price > 0;
                                      
                                      return (
                                        <div key={idx} className="text-xs pl-2 border-l-2 border-muted-foreground/40 flex items-center gap-1">
                                          {isRemoval ? (
                                            <span className="text-destructive">❌</span>
                                          ) : isAddon ? (
                                            <span className="text-green-500">➕</span>
                                          ) : (
                                            <span className="text-blue-500">🔄</span>
                                          )}
                                          <span className="text-muted-foreground">{o.option_name}</span>
                                          {o.option_price > 0 && (
                                            <span className="text-primary">(+R$ {o.option_price.toFixed(2)})</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {item.note && (
                                  <p className="text-xs text-primary mt-1">
                                    📝 {item.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Payment Method */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {order.payment_method === 'pix' && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-600 gap-1">
                            <QrCode className="w-3 h-3" />
                            PIX
                          </Badge>
                        )}
                        {order.payment_method === 'card' && (
                          <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 gap-1">
                            <CreditCard className="w-3 h-3" />
                            Cartão
                          </Badge>
                        )}
                        {order.payment_method === 'cash' && (
                          <>
                            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 gap-1">
                              <Banknote className="w-3 h-3" />
                              Dinheiro
                            </Badge>
                            {order.change && (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
                                Troco: R$ {order.change}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      {/* Address */}
                      {order.address && (
                        <div className="text-xs text-muted-foreground mb-3 space-y-1">
                          <p>
                            📍 {order.address.street}, {order.address.number} -{' '}
                            {order.address.neighborhood}
                          </p>
                          {order.address.reference && (
                            <p className="text-muted-foreground">
                              📝 {order.address.reference}
                            </p>
                          )}
                          {order.address.reference_point && (
                            <p className="text-primary font-medium">
                              🚩 {order.address.reference_point}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {config.nextStatus && (
                          <Button
                            onClick={() =>
                              updateStatus(order.id, config.nextStatus!)
                            }
                            className="flex-1"
                            variant={
                              order.status === 'pending' ? 'default' : 'secondary'
                            }
                          >
                            <Icon className="w-4 h-4 mr-2" />
                            {config.nextLabel}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            printOrderReceipt(order);
                            logOrderPrinted(order.id).catch(() => {});
                          }}
                          title="Imprimir pedido"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openCancelDialog(order.id)}
                          title="Cancelar pedido"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order History Section */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="mt-8">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico de Pedidos
            </span>
            <span className="text-muted-foreground text-sm">
              {historyOpen ? 'Fechar' : 'Abrir'}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do cliente..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "De"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "Até"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setStartDate(undefined);
                        setEndDate(undefined);
                      }}
                      title="Limpar datas"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const filtered = historyOrders.filter(o => {
                        const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                        const orderDate = new Date(o.created_at);
                        const matchesStart = !startDate || orderDate >= startDate;
                        const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                        return matchesName && matchesStart && matchesEnd;
                      });
                      
                      // Use semicolon separator for Brazilian Excel compatibility
                      const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Status', 'Itens', 'Pagamento', 'Total'];
                      const rows = filtered.map(o => [
                        o.id.slice(0, 8),
                        format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
                        o.customer?.name || 'N/A',
                        o.customer?.phone || 'N/A',
                        o.status === 'delivered' ? 'Entregue' : 'Cancelado',
                        o.items.map(i => `${i.quantity}x ${i.product?.name || 'Produto'}`).join(', '),
                        o.payment_method === 'pix' ? 'PIX' : o.payment_method === 'card' ? 'Cartão' : 'Dinheiro',
                        `R$ ${o.total.toFixed(2).replace('.', ',')}`
                      ]);
                      
                      // Use semicolon as separator and escape properly for Brazilian locale
                      const csvContent = [
                        headers.join(';'),
                        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
                      ].join('\r\n');
                      
                      // UTF-8 BOM for proper encoding in Excel
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `pedidos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                      
                      toast({ title: 'Exportado com sucesso!' });
                    }}
                    title="Exportar CSV"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const filtered = historyOrders.filter(o => {
                        const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                        const orderDate = new Date(o.created_at);
                        const matchesStart = !startDate || orderDate >= startDate;
                        const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                        return matchesName && matchesStart && matchesEnd;
                      });
                      
                      const deliveredOrders = filtered.filter(o => o.status === 'delivered');
                      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                      const avgTicket = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
                      
                      const printHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>Relatório de Pedidos - Astral Gastro Bar</title>
                          <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                              font-family: Arial, sans-serif; 
                              font-size: 11px; 
                              padding: 15px;
                              color: #000;
                            }
                            .header { 
                              text-align: center; 
                              margin-bottom: 20px;
                              padding-bottom: 15px;
                              border-bottom: 2px solid #333;
                            }
                            .header h1 { 
                              font-size: 22px; 
                              font-weight: bold;
                              margin-bottom: 5px;
                            }
                            .header .subtitle { 
                              font-size: 12px; 
                              color: #666;
                            }
                            .stats {
                              display: flex;
                              justify-content: space-around;
                              background: #f5f5f5;
                              padding: 12px;
                              margin-bottom: 20px;
                              border-radius: 4px;
                            }
                            .stat-item {
                              text-align: center;
                            }
                            .stat-label {
                              font-size: 10px;
                              color: #666;
                            }
                            .stat-value {
                              font-size: 14px;
                              font-weight: bold;
                            }
                            table { 
                              width: 100%; 
                              border-collapse: collapse;
                              font-size: 10px;
                            }
                            th { 
                              background: #333; 
                              color: white; 
                              padding: 8px 4px;
                              text-align: left;
                              font-weight: bold;
                              white-space: nowrap;
                            }
                            td { 
                              padding: 6px 4px; 
                              border-bottom: 1px solid #ddd;
                              vertical-align: top;
                            }
                            tr:nth-child(even) { background: #f9f9f9; }
                            .status-delivered { color: #16a34a; font-weight: bold; }
                            .status-cancelled { color: #dc2626; font-weight: bold; }
                            .total-col { text-align: right; white-space: nowrap; }
                            .items-col { max-width: 200px; word-wrap: break-word; }
                            
                            @media print {
                              body { 
                                font-size: 10px; 
                                padding: 10px;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                              }
                              .header h1 { font-size: 18px; }
                              table { font-size: 9px; }
                              th, td { padding: 5px 3px; }
                              .stats { padding: 8px; }
                            }
                            
                            @page {
                              size: A4 landscape;
                              margin: 10mm;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="header">
                            <h1>🍔 Astral Gastro Bar</h1>
                            <div class="subtitle">Relatório de Pedidos - Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
                          </div>
                          
                          <div class="stats">
                            <div class="stat-item">
                              <div class="stat-label">Total Pedidos</div>
                              <div class="stat-value">${filtered.length}</div>
                            </div>
                            <div class="stat-item">
                              <div class="stat-label">Entregues</div>
                              <div class="stat-value">${deliveredOrders.length}</div>
                            </div>
                            <div class="stat-item">
                              <div class="stat-label">Faturamento</div>
                              <div class="stat-value">R$ ${totalRevenue.toFixed(2)}</div>
                            </div>
                            <div class="stat-item">
                              <div class="stat-label">Ticket Médio</div>
                              <div class="stat-value">R$ ${avgTicket.toFixed(2)}</div>
                            </div>
                          </div>
                          
                          <table>
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Cliente</th>
                                <th class="items-col">Itens</th>
                                <th>Pagamento</th>
                                <th class="total-col">Total</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${filtered.map(o => `
                                <tr>
                                  <td>${format(new Date(o.created_at), 'dd/MM HH:mm')}</td>
                                  <td>${o.customer?.name || 'N/A'}</td>
                                  <td class="items-col">${o.items.map(i => `${i.quantity}x ${i.product?.name || 'Produto'}`).join(', ')}</td>
                                  <td>${o.payment_method === 'pix' ? 'PIX' : o.payment_method === 'card' ? 'Cartão' : 'Dinheiro'}</td>
                                  <td class="total-col">R$ ${o.total.toFixed(2)}</td>
                                  <td class="${o.status === 'delivered' ? 'status-delivered' : 'status-cancelled'}">${o.status === 'delivered' ? 'Entregue' : 'Cancelado'}</td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </body>
                        </html>
                      `;
                      
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        printWindow.document.write(printHtml);
                        printWindow.document.close();
                        printWindow.onload = () => {
                          printWindow.focus();
                          printWindow.print();
                        };
                      }
                    }}
                    title="Imprimir Relatório"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </div>

              {/* Statistics Summary & Revenue Chart */}
              {(() => {
                const filteredDelivered = historyOrders.filter(o => {
                  if (o.status !== 'delivered') return false;
                  const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                  const orderDate = new Date(o.created_at);
                  const matchesStart = !startDate || orderDate >= startDate;
                  const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                  return matchesName && matchesStart && matchesEnd;
                });
                const totalRevenue = filteredDelivered.reduce((sum, o) => sum + (o.total || 0), 0);
                const totalOrders = filteredDelivered.length;
                const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

                // Calculate daily revenue data for chart
                const dailyRevenueMap = new Map<string, number>();
                filteredDelivered.forEach(o => {
                  const dayKey = format(new Date(o.created_at), 'dd/MM');
                  dailyRevenueMap.set(dayKey, (dailyRevenueMap.get(dayKey) || 0) + (o.total || 0));
                });
                const chartData = Array.from(dailyRevenueMap.entries())
                  .map(([day, revenue]) => ({ day, revenue }))
                  .sort((a, b) => {
                    const [dayA, monthA] = a.day.split('/').map(Number);
                    const [dayB, monthB] = b.day.split('/').map(Number);
                    return monthA !== monthB ? monthA - monthB : dayA - dayB;
                  });

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-green-500/20 p-3 rounded-full">
                          <DollarSign className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Faturamento</p>
                          <p className="text-2xl font-bold text-green-500">
                            R$ {totalRevenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-blue-500/20 p-3 rounded-full">
                          <ShoppingBag className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                          <p className="text-2xl font-bold text-blue-500">
                            {totalOrders}
                          </p>
                        </div>
                      </div>
                      <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
                        <div className="bg-primary/20 p-3 rounded-full">
                          <TrendingUp className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Ticket Médio</p>
                          <p className="text-2xl font-bold text-primary">
                            R$ {averageTicket.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Charts Row */}
                    {(chartData.length > 0 || filteredDelivered.length > 0) && (() => {
                      // Calculate top products data
                      const productSalesMap = new Map<string, number>();
                      filteredDelivered.forEach(o => {
                        o.items.forEach(item => {
                          const productName = item.product?.name || 'Produto';
                          productSalesMap.set(productName, (productSalesMap.get(productName) || 0) + (item.quantity || 1));
                        });
                      });
                      
                      const sortedProducts = Array.from(productSalesMap.entries())
                        .map(([name, quantity]) => ({ name, quantity }))
                        .sort((a, b) => b.quantity - a.quantity);
                      
                      const topProducts = sortedProducts.slice(0, 5);
                      const othersQuantity = sortedProducts.slice(5).reduce((sum, p) => sum + p.quantity, 0);
                      
                      const productColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6b7280'];
                      const productsChartData = [
                        ...topProducts.map((p, i) => ({ name: p.name, value: p.quantity, color: productColors[i] })),
                        ...(othersQuantity > 0 ? [{ name: 'Outros', value: othersQuantity, color: productColors[5] }] : [])
                      ];

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                          {/* Daily Revenue Chart */}
                          {chartData.length > 0 && (
                            <div className="bg-card border rounded-xl p-4">
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" />
                                Faturamento Diário
                              </h3>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis 
                                      dataKey="day" 
                                      tick={{ fontSize: 12 }}
                                      className="text-muted-foreground"
                                    />
                                    <YAxis 
                                      tick={{ fontSize: 12 }}
                                      tickFormatter={(value) => `R$${value}`}
                                      className="text-muted-foreground"
                                    />
                                    <Tooltip
                                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                                      labelFormatter={(label) => `Dia ${label}`}
                                      contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        border: '1px solid hsl(var(--border))',
                                        borderRadius: '8px',
                                        color: 'hsl(var(--card-foreground))',
                                      }}
                                    />
                                    <Bar 
                                      dataKey="revenue" 
                                      fill="hsl(var(--primary))"
                                      radius={[4, 4, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* Payment Method Pie Chart */}
                          {filteredDelivered.length > 0 && (() => {
                            const paymentData = [
                              { name: 'PIX', value: filteredDelivered.filter(o => o.payment_method === 'pix').reduce((sum, o) => sum + (o.total || 0), 0), color: '#8b5cf6' },
                              { name: 'Cartão', value: filteredDelivered.filter(o => o.payment_method === 'card').reduce((sum, o) => sum + (o.total || 0), 0), color: '#3b82f6' },
                              { name: 'Dinheiro', value: filteredDelivered.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (o.total || 0), 0), color: '#22c55e' },
                            ].filter(d => d.value > 0);

                            return (
                              <div className="bg-card border rounded-xl p-4">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                  <CreditCard className="w-5 h-5 text-primary" />
                                  Pagamentos
                                </h3>
                                <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={paymentData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={4}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                      >
                                        {paymentData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip
                                        content={
                                          <KdsPieTooltip 
                                            valueFormatter={(v) => `R$ ${v.toFixed(2)}`}
                                            labelKey="Faturamento"
                                          />
                                        }
                                      />
                                      <Legend 
                                        formatter={(value) => (
                                          <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                                        )}
                                      />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Top Products Donut Chart */}
                          {productsChartData.length > 0 && (
                            <div className="bg-card border rounded-xl p-4">
                              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-primary" />
                                Produtos Mais Vendidos
                              </h3>
                              <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={productsChartData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={45}
                                      outerRadius={70}
                                      paddingAngle={4}
                                      dataKey="value"
                                      label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '...' : name} ${(percent * 100).toFixed(0)}%`}
                                      labelLine={false}
                                    >
                                      {productsChartData.map((entry, index) => (
                                        <Cell key={`cell-product-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip
                                      content={
                                        <KdsPieTooltip 
                                          valueFormatter={(v) => `${v} unidades`}
                                          labelKey="Vendas"
                                        />
                                      }
                                    />
                                    <Legend 
                                      formatter={(value) => (
                                        <span style={{ color: 'hsl(var(--foreground))' }}>
                                          {value.length > 15 ? value.slice(0, 15) + '...' : value}
                                        </span>
                                      )}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">Todos ({historyOrders.filter(o => {
                  const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                  const orderDate = new Date(o.created_at);
                  const matchesStart = !startDate || orderDate >= startDate;
                  const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                  return matchesName && matchesStart && matchesEnd;
                }).length})</TabsTrigger>
                <TabsTrigger value="delivered">
                  Entregues ({historyOrders.filter(o => {
                    const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                    const orderDate = new Date(o.created_at);
                    const matchesStart = !startDate || orderDate >= startDate;
                    const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                    return o.status === 'delivered' && matchesName && matchesStart && matchesEnd;
                  }).length})
                </TabsTrigger>
                <TabsTrigger value="cancelled">
                  Cancelados ({historyOrders.filter(o => {
                    const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                    const orderDate = new Date(o.created_at);
                    const matchesStart = !startDate || orderDate >= startDate;
                    const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                    return o.status === 'cancelled' && matchesName && matchesStart && matchesEnd;
                  }).length})
                </TabsTrigger>
              </TabsList>

              {(['all', 'delivered', 'cancelled'] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-3">
                  {historyOrders
                    .filter(o => {
                      const matchesStatus = tab === 'all' || o.status === tab;
                      const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                      const orderDate = new Date(o.created_at);
                      const matchesStart = !startDate || orderDate >= startDate;
                      const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                      return matchesStatus && matchesName && matchesStart && matchesEnd;
                    })
                    .map((order) => (
                      <div
                        key={order.id}
                        onClick={() => setDetailsOrder(order)}
                        className={cn(
                          "bg-card border rounded-lg p-4 cursor-pointer hover:bg-accent/50 transition-colors",
                          order.status === 'cancelled' ? "border-destructive/50" : "border-border"
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                        <div>
                            <span className="font-mono text-sm text-muted-foreground">
                              #{order.id.slice(0, 8)}
                            </span>
                            <p className="font-semibold">{order.customer?.name || 'Cliente'}</p>
                            {order.customer?.phone && (
                              <a
                                href={formatWhatsAppLink(order.customer.phone) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 hover:underline"
                              >
                                <MessageCircle className="w-3 h-3" />
                                {formatPhoneDisplay(order.customer.phone)}
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={order.status === 'cancelled' ? 'destructive' : 'secondary'}
                              className="mb-1"
                            >
                              {order.status === 'cancelled' ? (
                                <><XCircle className="w-3 h-3 mr-1" /> Cancelado</>
                              ) : (
                                <><Check className="w-3 h-3 mr-1" /> Entregue</>
                              )}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        {order.status === 'cancelled' && order.cancellation_reason && (
                          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 mb-2">
                            <p className="text-sm text-destructive font-medium">Motivo: {order.cancellation_reason}</p>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground">
                          <p>{order.items.length} item(s) • R$ {order.total.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  {historyOrders.filter(o => {
                    const matchesStatus = tab === 'all' || o.status === tab;
                    const matchesName = o.customer?.name?.toLowerCase().includes(historySearch.toLowerCase());
                    const orderDate = new Date(o.created_at);
                    const matchesStart = !startDate || orderDate >= startDate;
                    const matchesEnd = !endDate || orderDate <= new Date(endDate.getTime() + 86400000);
                    return matchesStatus && matchesName && matchesStart && matchesEnd;
                  }).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum pedido encontrado
                    </div>
                  )}
                </TabsContent>
              ))}
              </Tabs>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
        </TabsContent>

        <TabsContent value="report">
          <KdsPerformanceReport />
        </TabsContent>
      </Tabs>

      {/* Cancel Order Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pedido</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. O cliente será notificado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={cancelOrder}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Details Modal */}
      <Dialog open={!!detailsOrder} onOpenChange={(open) => !open && setDetailsOrder(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Pedido #{detailsOrder?.id.slice(0, 8)}</span>
              <Badge variant={detailsOrder?.status === 'cancelled' ? 'destructive' : 'secondary'}>
                {detailsOrder?.status === 'cancelled' ? 'Cancelado' : 'Entregue'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {detailsOrder && new Date(detailsOrder.created_at).toLocaleString('pt-BR')}
            </DialogDescription>
          </DialogHeader>

          {detailsOrder && (
            <div className="space-y-4">
              {/* Cancellation Reason */}
              {detailsOrder.status === 'cancelled' && detailsOrder.cancellation_reason && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <p className="text-sm font-medium text-destructive">Motivo do cancelamento:</p>
                  <p className="text-sm text-destructive">{detailsOrder.cancellation_reason}</p>
                </div>
              )}

              {/* Customer */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Cliente</p>
                <p className="font-semibold">{detailsOrder.customer?.name || 'Não informado'}</p>
                {detailsOrder.customer?.phone ? (
                  <a
                    href={formatWhatsAppLink(detailsOrder.customer.phone) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {formatPhoneDisplay(detailsOrder.customer.phone)}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">Telefone não informado</p>
                )}
              </div>

              {/* Address */}
              {detailsOrder.address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Endereço</p>
                  <p>{detailsOrder.address.street}, {detailsOrder.address.number}</p>
                  <p className="text-sm text-muted-foreground">{detailsOrder.address.neighborhood}</p>
                  {detailsOrder.address.reference && (
                    <p className="text-sm text-muted-foreground">Ref: {detailsOrder.address.reference}</p>
                  )}
                  {detailsOrder.address.reference_point && (
                    <p className="text-sm text-primary">Ponto: {detailsOrder.address.reference_point}</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Itens</p>
                <div className="space-y-2">
                  {detailsOrder.items.map((item) => (
                    <div key={item.id} className="bg-secondary rounded-lg p-2">
                      <div className="flex items-start gap-2">
                        <span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded flex items-center justify-center flex-shrink-0">
                          {item.quantity}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product?.name}</p>
                          {item.options.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {item.options.map((o) => o.option_name).join(', ')}
                            </p>
                          )}
                          {item.note && (
                            <p className="text-xs text-primary mt-1">📝 {item.note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Pagamento</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {detailsOrder.payment_method === 'pix' && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-600 gap-1">
                      <QrCode className="w-3 h-3" /> PIX
                    </Badge>
                  )}
                  {detailsOrder.payment_method === 'card' && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 gap-1">
                      <CreditCard className="w-3 h-3" /> Cartão
                    </Badge>
                  )}
                  {detailsOrder.payment_method === 'cash' && (
                    <>
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600 gap-1">
                        <Banknote className="w-3 h-3" /> Dinheiro
                      </Badge>
                      {detailsOrder.change && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
                          Troco: R$ {detailsOrder.change}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Total */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold">R$ {detailsOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (detailsOrder) {
                printOrderReceipt(detailsOrder);
                logOrderPrinted(detailsOrder.id).catch(() => {});
              }
            }}>
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
            <Button onClick={() => setDetailsOrder(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
