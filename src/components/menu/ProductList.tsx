import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product } from '@/types';

interface ProductListProps {
  products: Product[];
  isLoading: boolean;
  onProductClick: (product: Product) => void;
}

export function ProductList({ products, isLoading, onProductClick }: ProductListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex gap-3 p-4 bg-card rounded-xl border border-border">
            <Skeleton className="w-24 h-24 rounded-lg" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3 mt-auto" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-muted-foreground">Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-24">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
    </div>
  );
}
