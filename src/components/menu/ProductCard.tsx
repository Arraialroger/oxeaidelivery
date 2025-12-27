import { Plus } from 'lucide-react';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className="flex gap-3 p-4 rounded-xl border border-border/50 hover:border-primary/40 transition-all w-full text-left group backdrop-blur-md bg-card/60 hover:shadow-glow"
    >
      {product.image_url && (
        <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className="text-primary font-bold">{formatPrice(product.price)}</span>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform duration-150 group-active:scale-75 hover:scale-110">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>
    </button>
  );
}
