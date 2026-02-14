import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { startOfDay, endOfDay } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame } from 'lucide-react';
import { useMemo } from 'react';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);

interface DemandHeatmapProps {
  dateRange: { from: Date; to: Date };
}

export function DemandHeatmap({ dateRange }: DemandHeatmapProps) {
  const { restaurantId } = useRestaurantContext();

  const { data, isLoading } = useQuery({
    queryKey: ['demand-heatmap', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
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

      // grid[day][hour] = count
      const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
      let max = 0;

      (orders || []).forEach(o => {
        const d = new Date(o.created_at || '');
        const day = d.getDay();
        const hour = d.getHours();
        grid[day][hour]++;
        if (grid[day][hour] > max) max = grid[day][hour];
      });

      return { grid, max, total: orders?.length || 0 };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });

  const visibleHours = useMemo(() => {
    if (!data) return [];
    // Show hours that have at least 1 order in any day, plus padding
    const hasOrders = new Set<number>();
    data.grid.forEach(row => row.forEach((v, h) => { if (v > 0) hasOrders.add(h); }));
    if (hasOrders.size === 0) return [];
    const min = Math.max(0, Math.min(...hasOrders) - 1);
    const max = Math.min(23, Math.max(...hasOrders) + 1);
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }, [data]);

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
            <Flame className="h-4 w-4" />
            Mapa de Calor da Demanda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados de pedidos no período.</p>
        </CardContent>
      </Card>
    );
  }

  const getColor = (value: number) => {
    if (value === 0) return 'bg-muted/30';
    const intensity = value / data.max;
    if (intensity <= 0.25) return 'bg-primary/15';
    if (intensity <= 0.5) return 'bg-primary/35';
    if (intensity <= 0.75) return 'bg-primary/60';
    return 'bg-primary';
  };

  const getTextColor = (value: number) => {
    if (value === 0) return 'text-muted-foreground/50';
    const intensity = value / data.max;
    if (intensity > 0.6) return 'text-primary-foreground';
    return 'text-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Flame className="h-4 w-4" />
          Mapa de Calor da Demanda
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pedidos por hora do dia × dia da semana ({data.total} pedidos no período)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Header row with hours */}
            <div className="flex">
              <div className="w-10 shrink-0" />
              {visibleHours.map(h => (
                <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground pb-1 min-w-[28px]">
                  {HOUR_LABELS[h]}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {DAY_LABELS.map((dayLabel, dayIndex) => (
              <div key={dayIndex} className="flex items-center gap-0">
                <div className="w-10 shrink-0 text-xs font-medium text-muted-foreground pr-1 text-right">
                  {dayLabel}
                </div>
                {visibleHours.map(h => {
                  const val = data.grid[dayIndex][h];
                  return (
                    <div
                      key={h}
                      className={`flex-1 min-w-[28px] h-7 flex items-center justify-center rounded-sm m-[1px] transition-colors ${getColor(val)} ${getTextColor(val)}`}
                      title={`${dayLabel} ${HOUR_LABELS[h]}: ${val} pedido${val !== 1 ? 's' : ''}`}
                    >
                      <span className="text-[10px] font-medium">
                        {val > 0 ? val : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-3">
              <span className="text-[10px] text-muted-foreground">Menos</span>
              <div className="flex gap-[2px]">
                <div className="w-4 h-4 rounded-sm bg-muted/30" />
                <div className="w-4 h-4 rounded-sm bg-primary/15" />
                <div className="w-4 h-4 rounded-sm bg-primary/35" />
                <div className="w-4 h-4 rounded-sm bg-primary/60" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
