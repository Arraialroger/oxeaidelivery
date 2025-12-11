import { Home, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface BottomNavProps {
  onCartClick: () => void;
}

export function BottomNav({ onCartClick }: BottomNavProps) {
  const { totalItems, subtotal } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        <button className="flex flex-col items-center gap-1 px-4 py-2 text-primary">
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Cardápio</span>
        </button>

        <button
          onClick={onCartClick}
          className="relative flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">
            {totalItems > 0 ? formatPrice(subtotal) : 'Carrinho'}
          </span>
        </button>

        <button className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors">
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Conta</span>
        </button>
      </div>
    </div>
  );
}
