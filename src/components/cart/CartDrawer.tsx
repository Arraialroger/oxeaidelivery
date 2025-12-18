import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useConfig } from '@/hooks/useConfig';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { data: config } = useConfig();
  const navigate = useNavigate();

  const deliveryFee = config?.delivery_fee ?? 0;
  const total = subtotal + deliveryFee;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[85vh] bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Seu Pedido</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione itens do cardápio
              </p>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 bg-secondary rounded-xl"
                >
                  {item.product.image_url && (
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {item.product.name}
                    </h4>

                    {/* Combo selections - show grouped by slot */}
                    {item.selectedOptions.some(o => o.type === 'combo-selection') && (
                      <div className="mt-1 space-y-0.5">
                        {item.selectedOptions
                          .filter(o => o.type === 'combo-selection')
                          .map((o, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              • {o.name}
                              {o.price > 0 && (
                                <span className="text-primary ml-1">
                                  (+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.price)})
                                </span>
                              )}
                            </p>
                          ))}
                      </div>
                    )}

                    {/* Regular options */}
                    {item.selectedOptions.some(o => o.type !== 'combo-selection') && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.selectedOptions.filter(o => o.type !== 'combo-selection').map((o) => o.name).join(', ')}
                      </p>
                    )}

                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">
                        {item.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary font-bold text-sm">
                        {formatPrice(item.totalPrice)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-2 bg-card rounded-full px-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-4 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="w-6 h-6 rounded-full flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex-shrink-0 p-4 border-t border-border bg-card safe-bottom">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de entrega</span>
                <span className="text-foreground">
                  {formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            {!config?.restaurant_open ? (
              <div className="text-center">
                <p className="text-destructive font-medium mb-2">
                  Restaurante fechado no momento
                </p>
                <Button disabled className="w-full h-12 text-base font-semibold opacity-50">
                  Finalizar Pedido
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleCheckout}
                className="w-full h-12 text-base font-semibold"
              >
                Finalizar Pedido
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
