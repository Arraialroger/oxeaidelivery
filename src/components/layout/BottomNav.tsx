import { Home, ShoppingBag, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useState, useEffect, useRef } from 'react';

interface BottomNavProps {
  onCartClick: () => void;
}

export function BottomNav({ onCartClick }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems, subtotal } = useCart();
  const [isPopping, setIsPopping] = useState(false);
  const prevTotalItems = useRef(totalItems);

  // Trigger pop animation when items are added
  useEffect(() => {
    if (totalItems > prevTotalItems.current) {
      setIsPopping(true);
      const timer = setTimeout(() => setIsPopping(false), 600);
      return () => clearTimeout(timer);
    }
    prevTotalItems.current = totalItems;
  }, [totalItems]);

  const isActive = (path: string) => location.pathname === path;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16">
        <button 
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs font-medium">Cardápio</span>
        </button>

        <button
          onClick={onCartClick}
          className="relative flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className={`relative transition-all duration-300 ease-out ${isPopping ? 'scale-150 animate-shake' : 'scale-100'}`}>
            <ShoppingBag className={`w-5 h-5 transition-all duration-300 ${isPopping ? 'text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]' : ''}`} />
            {totalItems > 0 && (
              <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1 ${isPopping ? 'animate-bounce' : ''}`}>
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">
            {totalItems > 0 ? formatPrice(subtotal) : 'Carrinho'}
          </span>
        </button>

        <button 
          onClick={() => navigate('/account')}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            isActive('/account') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs font-medium">Conta</span>
        </button>
      </div>
    </div>
  );
}
