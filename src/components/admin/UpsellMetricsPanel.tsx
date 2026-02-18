import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBag, Eye, MousePointerClick, DollarSign, TrendingUp } from 'lucide-react';
import { useUpsellMetrics } from '@/hooks/useUpsellMetrics';
import { formatPrice } from '@/lib/formatUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DateRange {
  from: Date;
  to: Date;
}

export function UpsellMetricsPanel({ dateRange }: { dateRange: DateRange }) {
  const { data: metrics, isLoading } = useUpsellMetrics(dateRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[120px]" /></CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const hasData = metrics.totalImpressions > 0 || metrics.totalAdded > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Métricas de Upsell
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasData ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dado de upsell neste período. As métricas aparecerão conforme clientes interagirem com as sugestões no checkout.
          </p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5" />
                  Exibições
                </div>
                <p className="text-xl font-bold">{metrics.totalImpressions}</p>
                <p className="text-[10px] text-muted-foreground">sessões com upsell</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Conversões
                </div>
                <p className="text-xl font-bold">{metrics.totalAdded}</p>
                <p className="text-[10px] text-muted-foreground">sessões que adicionaram</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Taxa de Conversão
                </div>
                <p className="text-xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">adições / exibições</p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  Receita Upsell
                </div>
                <p className="text-xl font-bold">{formatPrice(metrics.revenueGenerated)}</p>
                <p className="text-[10px] text-muted-foreground">receita gerada</p>
              </div>
            </div>

            {/* Top products table */}
            {metrics.topProducts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Top Produtos de Upsell</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Adições</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.topProducts.map((p) => (
                      <TableRow key={p.productId}>
                        <TableCell className="font-medium text-sm">{p.productName}</TableCell>
                        <TableCell className="text-right">{p.addedCount}</TableCell>
                        <TableCell className="text-right">{formatPrice(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              💡 Taxa de conversão ideal para upsell é entre 10-25%. Abaixo disso, revise os produtos oferecidos ou o valor mínimo do carrinho.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
