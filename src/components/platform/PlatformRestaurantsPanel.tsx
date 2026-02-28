import { usePlatformRestaurants, PlatformRestaurant } from '@/hooks/usePlatformRestaurants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Store, Users, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { format } from 'date-fns';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  inactive: { label: 'Inativo', variant: 'destructive' },
  suspended: { label: 'Suspenso', variant: 'destructive' },
};

const planStatusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  trialing: { label: 'Trial', variant: 'secondary' },
  past_due: { label: 'Inadimplente', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  none: { label: 'Sem plano', variant: 'outline' },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function PlatformRestaurantsPanel() {
  const { data: restaurants, isLoading, error } = usePlatformRestaurants();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Erro ao carregar restaurantes: {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const list = restaurants || [];

  // Consolidated metrics
  const totals = list.reduce(
    (acc, r) => ({
      restaurants: acc.restaurants + 1,
      orders: acc.orders + r.total_orders,
      revenue: acc.revenue + r.total_revenue,
      revenue30d: acc.revenue30d + r.revenue_30d,
      orders30d: acc.orders30d + r.orders_30d,
      customers: acc.customers + r.total_customers,
      products: acc.products + r.total_products,
    }),
    { restaurants: 0, orders: 0, revenue: 0, revenue30d: 0, orders30d: 0, customers: 0, products: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="w-4 h-4" /> Restaurantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.restaurants}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Faturamento 30d
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.revenue30d)}</p>
            <p className="text-xs text-muted-foreground">{totals.orders30d} pedidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" /> Clientes Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.customers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" /> Pedidos Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totals.orders}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(totals.revenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Restaurants Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restaurantes Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Restaurante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Pedidos (30d)</TableHead>
                  <TableHead className="text-right">Faturamento (30d)</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                  <TableHead className="text-right">Produtos</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum restaurante cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((r: PlatformRestaurant) => {
                    const st = statusMap[r.status] || { label: r.status, variant: 'outline' as const };
                    const ps = planStatusMap[r.subscription_status] || { label: r.subscription_status, variant: 'outline' as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {r.logo_url ? (
                              <img src={r.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Store className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{r.name}</p>
                              <p className="text-xs text-muted-foreground">/{r.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm">{r.plan_name}</span>
                            <Badge variant={ps.variant} className="w-fit text-xs">{ps.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{r.orders_30d}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(r.revenue_30d)}</TableCell>
                        <TableCell className="text-right">{r.total_customers}</TableCell>
                        <TableCell className="text-right">{r.total_products}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(r.created_at), 'dd/MM/yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
