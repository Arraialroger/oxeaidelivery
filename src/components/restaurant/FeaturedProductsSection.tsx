import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, ImageOff } from 'lucide-react';
import type { FeaturedProduct } from '@/hooks/useFeaturedProducts';

interface FeaturedProductsSectionProps {
  products: FeaturedProduct[];
  slug: string;
}

export function FeaturedProductsSection({ products, slug }: FeaturedProductsSectionProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Destaques do cardápio</h3>
          <Link 
            to={`/${slug}/menu`}
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver tudo
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <Link 
              key={product.id} 
              to={`/${slug}/menu`}
              className="group"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                {product.name}
              </h4>
              <p className="text-sm text-primary font-semibold">
                R$ {product.price.toFixed(2).replace('.', ',')}
              </p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
