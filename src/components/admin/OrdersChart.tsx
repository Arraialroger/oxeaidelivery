import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { format, startOfDay, endOfDay, eachDayOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface DailyOrders {
  date: string;
  label: string;
  orders: number;
}

interface OrdersChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function OrdersChart({ dateRange }: OrdersChartProps) {
  const { restaurantId } = useRestaurantContext();

  const { data: chartData, isLoading } = useQuery({
    queryKey: ['orders-chart', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<DailyOrders[]> => {
      if (!restaurantId) return [];

      const { from, to } = dateRange;
      const days = eachDayOfInterval({ start: from, end: to });
      const periodDays = differenceInDays(to, from) + 1;

      // Fetch all orders in the period at once
      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay(from).toISOString())
        .lte('created_at', endOfDay(to).toISOString());

      if (error) throw error;

      // Group orders by date
      const ordersByDate = new Map<string, number>();
      (orders || []).forEach(order => {
        const dateKey = format(new Date(order.created_at || ''), 'yyyy-MM-dd');
        ordersByDate.set(dateKey, (ordersByDate.get(dateKey) || 0) + 1);
      });

      // Use shorter label format if more than 14 days
      const labelFormat = periodDays > 14 ? 'dd/MM' : 'EEE dd';

      return days.map(date => ({
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, labelFormat, { locale: ptBR }),
        orders: ordersByDate.get(format(date, 'yyyy-MM-dd')) || 0,
      }));
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
  const periodDays = differenceInDays(dateRange.to, dateRange.from) + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Pedidos no Período ({periodDays} dias)
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
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval={periodDays > 14 ? Math.floor(periodDays / 7) : 0}
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
                dot={periodDays <= 14}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
