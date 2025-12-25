import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import BottomNav from '@/components/layout/BottomNav';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomerOrders } from '@/hooks/useCustomerOrders';

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pendente', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-500' },
  confirmed: { label: 'Confirmado', icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-500' },
  preparing: { label: 'Preparando', icon: <Package className="w-4 h-4" />, color: 'text-orange-500' },
  ready: { label: 'Pronto', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-500' },
  delivered: { label: 'Entregue', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600' },
  cancelled: { label: 'Cancelado', icon: <XCircle className="w-4 h-4" />, color: 'text-destructive' },
};

export default function Account() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [searchPhone, setSearchPhone] = useState<string | null>(null);

  const { data: orders, isLoading, error } = useCustomerOrders(searchPhone);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setSearchPhone(phone);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.slice(0, 11);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Minha Conta</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-24 space-y-6">
        {/* Busca por telefone */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="tel"
                placeholder="Digite seu telefone (DDD + número)"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="flex-1"
                maxLength={11}
              />
              <Button 
                type="submit" 
                disabled={phone.length < 10}
                className="shrink-0"
              >
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2">
              Ex: 11999999999 (sem espaços ou traços)
            </p>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Erro */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-destructive text-sm">
                Erro ao buscar pedidos. Tente novamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sem resultados */}
        {searchPhone && !isLoading && !error && orders?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                Nenhum pedido encontrado para este telefone.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lista de pedidos */}
        {orders && orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground">
              {orders.length} pedido{orders.length > 1 ? 's' : ''} encontrado{orders.length > 1 ? 's' : ''}
            </h2>

            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={status.color}>{status.icon}</span>
                        <span className={`text-sm font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* Itens do pedido */}
                    <div className="space-y-1 mb-3">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-foreground">
                            {item.quantity}x {item.product?.name || 'Produto'}
                          </span>
                          <span className="text-muted-foreground">
                            {formatPrice(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Totais */}
                    <div className="border-t border-border pt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-foreground">{formatPrice(order.subtotal)}</span>
                      </div>
                      {order.delivery_fee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entrega</span>
                          <span className="text-foreground">{formatPrice(order.delivery_fee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">Total</span>
                        <span className="text-primary">{formatPrice(order.total)}</span>
                      </div>
                    </div>

                    {/* Método de pagamento */}
                    {order.payment_method && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Pagamento: {order.payment_method === 'pix' ? 'PIX' : 
                                   order.payment_method === 'cash' ? 'Dinheiro' : 
                                   order.payment_method === 'card' ? 'Cartão' : 
                                   order.payment_method}
                      </div>
                    )}

                    {/* Link para acompanhar */}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        Acompanhar Pedido
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
