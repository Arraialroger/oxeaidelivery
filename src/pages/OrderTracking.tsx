import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Package, ChefHat, CheckCircle, Truck, ArrowLeft, Bike, XCircle, Bell, BellRing, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PWAInstallModal } from '@/components/pwa';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface OrderData {
  id: string;
  status: string;
  created_at: string;
  total: number;
  delivery_fee: number;
  subtotal: number;
  payment_method: string;
  cancellation_reason: string | null;
  addresses: {
    street: string;
    number: string;
    neighborhood: string;
    complement: string | null;
    reference: string | null;
  } | null;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  note: string | null;
  products: {
    name: string;
  } | null;
}

const statusSteps = [
  { 
    key: 'pending', 
    label: 'Recebido', 
    icon: Package,
    description: 'Seu pedido foi recebido'
  },
  { 
    key: 'preparing', 
    label: 'Em Preparo', 
    icon: ChefHat,
    description: 'Estamos preparando seu pedido'
  },
  { 
    key: 'ready', 
    label: 'Pronto', 
    icon: CheckCircle,
    description: 'Pedido pronto para entrega'
  },
  { 
    key: 'out_for_delivery', 
    label: 'Saiu p/ Entrega', 
    icon: Bike,
    description: 'Seu pedido está a caminho!'
  },
  { 
    key: 'delivered', 
    label: 'Entregue', 
    icon: Truck,
    description: 'Pedido entregue com sucesso'
  },
];

export default function OrderTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPWAModal, setShowPWAModal] = useState(false);
  const { toast } = useToast();
  
  const { canShowInstallUI, promptInstall, dismissInstall } = usePWAInstall();
  const { isSupported: pushSupported, permission, isSubscribed, isLoading: pushLoading, subscribe, error: pushError } = usePushNotifications(orderId);
  
  // Show PWA modal after order (when coming from checkout with ?new=true)
  useEffect(() => {
    const isNewOrder = searchParams.get('new') === 'true';
    if (isNewOrder && canShowInstallUI && !loading) {
      const timer = setTimeout(() => setShowPWAModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, canShowInstallUI, loading]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Initial fetch
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          created_at,
          total,
          delivery_fee,
          subtotal,
          payment_method,
          cancellation_reason,
          addresses (
            street,
            number,
            neighborhood,
            complement,
            reference
          )
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        return;
      }

      if (orderData) {
        setOrder(orderData);
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          unit_price,
          note,
          products (
            name
          )
        `)
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
      } else {
        setItems(itemsData || []);
      }

      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  // Real-time subscription
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order updated:', payload.new);
          setOrder((prev) => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const isCancelled = order?.status === 'cancelled';
  const isOrderFinished = order?.status === 'delivered' || order?.status === 'cancelled';
  
  // Mostrar botão de push se: suportado, não inscrito, permissão não negada, pedido não finalizado
  const canShowPushButton = pushSupported && !isSubscribed && permission !== 'denied' && !isOrderFinished;
  
  const handleEnablePush = async () => {
    const success = await subscribe();
    if (success) {
      toast({
        title: '🔔 Notificações ativadas!',
        description: 'Você será notificado quando o status do pedido mudar.',
      });
    } else if (pushError) {
      toast({
        title: 'Não foi possível ativar',
        description: pushError,
        variant: 'destructive',
      });
    }
  };
  
  const getCurrentStepIndex = () => {
    if (!order || isCancelled) return -1;
    return statusSteps.findIndex((step) => step.key === order.status);
  };

  const currentStepIndex = getCurrentStepIndex();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Pedido não encontrado</p>
        <button onClick={() => navigate('/')} className="text-primary underline">
          Voltar ao Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate('/')}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-lg font-bold">Acompanhar Pedido</h1>
            <p className="text-sm text-muted-foreground">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Push Notifications Banner */}
        {canShowPushButton && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Receba atualizações</p>
                <p className="text-xs text-muted-foreground">Seja notificado quando o status mudar</p>
              </div>
              <Button
                size="sm"
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="flex items-center gap-1.5"
              >
                {pushLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Ativar</span>
              </Button>
            </div>
          </div>
        )}
        
        {/* Notification enabled confirmation */}
        {isSubscribed && !isOrderFinished && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-2">
            <BellRing className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-600">Notificações ativadas para este pedido</span>
          </div>
        )}
        
        {/* Cancelled Status */}
        {isCancelled && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="font-semibold text-destructive text-lg">Pedido Cancelado</p>
                <p className="text-sm text-muted-foreground">Este pedido foi cancelado</p>
              </div>
            </div>
            {order.cancellation_reason && (
              <div className="bg-background/50 rounded-lg p-3 mt-3">
                <p className="text-sm font-medium mb-1">Motivo:</p>
                <p className="text-sm text-muted-foreground">{order.cancellation_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Status Progress */}
        {!isCancelled && (
          <div className="bg-card rounded-2xl p-6 border border-border">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
              <div 
                className="absolute left-6 top-8 w-0.5 bg-primary transition-all duration-500"
                style={{ 
                  height: `${Math.min(currentStepIndex / (statusSteps.length - 1) * 100, 100)}%`,
                  maxHeight: 'calc(100% - 64px)'
                }}
              />

              {/* Steps */}
              <div className="space-y-8">
                {statusSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isPending = index > currentStepIndex;

                  const isOutForDelivery = isCurrent && step.key === 'out_for_delivery';

                  return (
                    <div key={step.key} className="flex items-center gap-4">
                      <div
                        className={cn(
                          'relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                          isCompleted && 'bg-primary text-primary-foreground',
                          isCurrent && 'bg-primary text-primary-foreground',
                          isCurrent && !isOutForDelivery && 'animate-pulse',
                          isPending && 'bg-secondary text-muted-foreground'
                        )}
                      >
                        <StepIcon className={cn(
                          "w-5 h-5",
                          isOutForDelivery && "animate-bounce"
                        )} />
                      </div>
                      <div className="flex-1">
                        <p
                          className={cn(
                            'font-semibold transition-colors',
                            (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                        {isOutForDelivery && (
                          <p className="text-sm text-primary font-medium mt-1 animate-pulse">
                            🏍️ O entregador está a caminho!
                          </p>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                          Agora
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Order Details */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <h3 className="font-semibold mb-3">Itens do Pedido</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}x {item.products?.name || 'Produto'}
                </span>
                <span>{formatPrice((item.unit_price || 0) * (item.quantity || 1))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.subtotal || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entrega</span>
              <span>{formatPrice(order.delivery_fee || 0)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Total</span>
              <span className="text-primary">{formatPrice(order.total || 0)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        {order.addresses && (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <h3 className="font-semibold mb-2">Endereço de Entrega</h3>
            <p className="text-sm text-muted-foreground">
              {order.addresses.street}, {order.addresses.number}
              {order.addresses.complement && ` - ${order.addresses.complement}`}
            </p>
            <p className="text-sm text-muted-foreground">{order.addresses.neighborhood}</p>
            {order.addresses.reference && (
              <p className="text-sm text-muted-foreground mt-1">
                Ref: {order.addresses.reference}
              </p>
            )}
          </div>
        )}

        {/* Order Info */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Pedido realizado às {formatTime(order.created_at)}</p>
          <p className="mt-1">
            Pagamento: {order.payment_method === 'pix' ? 'Pix' : order.payment_method === 'card' ? 'Cartão' : 'Dinheiro'}
          </p>
        </div>
      </div>

      {/* PWA Install Modal - After Order */}
      <PWAInstallModal
        isOpen={showPWAModal}
        onClose={() => {
          setShowPWAModal(false);
          dismissInstall();
        }}
        onInstall={promptInstall}
        variant="after-order"
      />
    </div>
  );
}
