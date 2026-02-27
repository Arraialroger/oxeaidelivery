import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrderTimestamps } from '@/hooks/useOrderTimestamps';
import { format, eachDayOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

interface OrdersChartProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function OrdersChart({ dateRange }: OrdersChartProps) {
  const { data: timestamps, isLoading } = useOrderTimestamps(dateRange);

  const { chartData, totalOrders, periodDays } = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const pDays = differenceInDays(dateRange.to, dateRange.from) + 1;
    const labelFormat = pDays > 14 ? 'dd/MM' : 'EEE dd';

    const ordersByDate = new Map<string, number>();
    (timestamps || []).forEach(ts => {
      const dateKey = format(new Date(ts), 'yyyy-MM-dd');
      ordersByDate.set(dateKey, (ordersByDate.get(dateKey) || 0) + 1);
    });

    const data = days.map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      label: format(date, labelFormat, { locale: ptBR }),
      orders: ordersByDate.get(format(date, 'yyyy-MM-dd')) || 0,
    }));

    return {
      chartData: data,
      totalOrders: data.reduce((sum, d) => sum + d.orders, 0),
      periodDays: pDays,
    };
  }, [timestamps, dateRange]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
      </Card>
    );
  }

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
