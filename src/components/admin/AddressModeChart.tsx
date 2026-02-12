import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, PenLine } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { KdsPieTooltip } from '@/components/kitchen/KdsPieTooltip';

interface DateRange {
  from: Date;
  to: Date;
}

const COLORS = {
  map: 'hsl(210, 80%, 55%)',
  manual: 'hsl(30, 85%, 55%)',
};

export function AddressModeChart({ dateRange }: { dateRange: DateRange }) {
  const { restaurantId } = useRestaurantContext();

  const { data, isLoading } = useQuery({
    queryKey: ['address-mode-metrics', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurantId) throw new Error('Restaurant ID required');

      // Get order IDs in the date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, address_id')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (ordersError) throw ordersError;

      const addressIds = (orders || []).map(o => o.address_id).filter(Boolean) as string[];
      if (addressIds.length === 0) return { map: 0, manual: 0, total: 0 };

      const { data: addresses, error: addrError } = await supabase
        .from('addresses')
        .select('id, address_source')
        .in('id', addressIds);

      if (addrError) throw addrError;

      let map = 0;
      let manual = 0;
      (addresses || []).forEach(a => {
        if (a.address_source === 'map') map++;
        else manual++;
      });

      return { map, manual, total: map + manual };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-[180px]" /></CardContent>
      </Card>
    );
  }

  if (!data || data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Modo de Endereço: Mapa vs Manual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            Sem dados de endereço no período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  const mapPercent = ((data.map / data.total) * 100).toFixed(0);
  const manualPercent = ((data.manual / data.total) * 100).toFixed(0);

  const chartData = [
    { name: 'Mapa', value: data.map },
    { name: 'Manual', value: data.manual },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Modo de Endereço: Mapa vs Manual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Pie chart */}
          <div className="w-[140px] h-[140px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  <Cell fill={COLORS.map} />
                  <Cell fill={COLORS.manual} />
                </Pie>
                <Tooltip content={<KdsPieTooltip labelKey="Pedidos" />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend & stats */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.map }} />
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Mapa</span>
              <span className="ml-auto text-lg font-bold">{data.map}</span>
              <span className="text-xs text-muted-foreground">({mapPercent}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.manual }} />
              <PenLine className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Manual</span>
              <span className="ml-auto text-lg font-bold">{data.manual}</span>
              <span className="text-xs text-muted-foreground">({manualPercent}%)</span>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            {data.map > data.manual
              ? '📍 A maioria dos clientes usa o mapa — boa usabilidade! Considere torná-lo o modo padrão.'
              : data.manual > data.map
                ? '✏️ A maioria digita o endereço manualmente. Pode haver oportunidade de melhorar a experiência com mapa.'
                : '⚖️ Uso equilibrado entre mapa e manual.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
