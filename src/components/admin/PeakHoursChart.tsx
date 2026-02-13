import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface PeakHoursChartProps {
  dateRange: { from: Date; to: Date };
}

export function PeakHoursChart({ dateRange }: PeakHoursChartProps) {
  const { restaurantId } = useRestaurantContext();

  const { data, isLoading } = useQuery({
    queryKey: ['peak-hours', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data: orders, error } = await supabase
        .from('orders')
        .select('created_at')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', startOfDay(dateRange.from).toISOString())
        .lte('created_at', endOfDay(dateRange.to).toISOString());

      if (error) throw error;

      // By hour (0-23)
      const byHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: `${String(i).padStart(2, '0')}h`, orders: 0 }));
      // By day of week (0=Sun, 6=Sat)
      const byDay = DAY_LABELS.map((label, i) => ({ day: i, label, orders: 0 }));

      (orders || []).forEach(o => {
        const d = new Date(o.created_at || '');
        byHour[d.getHours()].orders++;
        byDay[d.getDay()].orders++;
      });

      const maxHour = byHour.reduce((max, h) => h.orders > max.orders ? h : max, byHour[0]);
      const maxDay = byDay.reduce((max, d) => d.orders > max.orders ? d : max, byDay[0]);

      return { byHour, byDay, peakHour: maxHour, peakDay: maxDay, total: orders?.length || 0 };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horários de Pico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados de pedidos no período.</p>
        </CardContent>
      </Card>
    );
  }

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Horários de Pico
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pico: <strong>{data.peakHour.label}</strong> ({data.peakHour.orders} pedidos) · Dia mais forte: <strong>{data.peakDay.label}</strong> ({data.peakDay.orders} pedidos)
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="hour">
          <TabsList className="mb-3">
            <TabsTrigger value="hour">Por Hora</TabsTrigger>
            <TabsTrigger value="day">Por Dia da Semana</TabsTrigger>
          </TabsList>

          <TabsContent value="hour">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byHour} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="orders" name="Pedidos" radius={[3, 3, 0, 0]}>
                    {data.byHour.map((entry) => (
                      <Cell
                        key={entry.hour}
                        fill={entry.hour === data.peakHour.hour ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="day">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
                  <Bar dataKey="orders" name="Pedidos" radius={[4, 4, 0, 0]}>
                    {data.byDay.map((entry) => (
                      <Cell
                        key={entry.day}
                        fill={entry.day === data.peakDay.day ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
