import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal } from 'lucide-react';
import { useTopProducts } from '@/hooks/useTopProducts';
import { formatPrice } from '@/lib/formatUtils';

interface DateRange {
  from: Date;
  to: Date;
}

export function TopProductsRanking({ dateRange }: { dateRange: DateRange }) {
  const { data: products, isLoading } = useTopProducts(dateRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[200px]" /></CardContent>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum produto vendido neste período.
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxQty = products[0]?.total_qty || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Produtos Mais Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map((product, index) => (
          <div key={product.product_id} className="flex items-center gap-3">
            <div className="w-7 text-center flex-shrink-0">
              {index === 0 ? (
                <Medal className="h-5 w-5 text-yellow-500 mx-auto" />
              ) : index === 1 ? (
                <Medal className="h-5 w-5 text-gray-400 mx-auto" />
              ) : index === 2 ? (
                <Medal className="h-5 w-5 text-amber-700 mx-auto" />
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{product.product_name}</span>
                <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                  {product.total_qty}x · {formatPrice(product.total_revenue)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${(product.total_qty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
