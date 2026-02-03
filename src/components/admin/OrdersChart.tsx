import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface DailyOrders {
  date: string;
  label: string;
  orders: number;
}

export function OrdersChart() {
  const { restaurantId } = useRestaurantContext();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['orders-chart', restaurantId],
    queryFn: async (): Promise<DailyOrders[]> => {
      if (!restaurantId) return [];

      const now = new Date();
      const days: DailyOrders[] = [];

      // Generate last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = subDays(now, i);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .neq('status', 'cancelled')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        days.push({
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'EEE', { locale: ptBR }),
          orders: count || 0,
        });
      }

      return days;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalOrders = chartData?.reduce((sum, day) => sum + day.orders, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pedidos nos Últimos 7 Dias
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {totalOrders} pedidos
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={30}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="orders" 
                name="Pedidos"
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
