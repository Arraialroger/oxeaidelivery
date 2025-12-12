import { Plus, Flame } from 'lucide-react';
import type { Product } from '@/types';

interface FeaturedCardProps {
  product: Product;
  onClick: () => void;
}

export function FeaturedCard({ product, onClick }: FeaturedCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col w-[200px] bg-card rounded-2xl border-2 border-primary/30 hover:border-primary transition-all overflow-hidden group shadow-lg hover:shadow-primary/20"
    >
      {/* Badge */}
      <div className="absolute top-2 left-2 z-10 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
        <Flame className="w-3 h-3" />
        Popular
      </div>

      {/* Image */}
      <div className="relative w-full h-32 overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Flame className="w-10 h-10 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        <h3 className="font-bold text-foreground text-sm line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1">
            {product.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-primary font-bold text-base">{formatPrice(product.price)}</span>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>
      </div>
    </button>
  );
}
