import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useSystemHealth() {
  const { restaurant } = useRestaurantContext();
  const restaurantId = restaurant?.id;
  const queryClient = useQueryClient();

  // Recent events
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['system-health-events', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_events' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  // Counts by severity (last 24h)
  const { data: counts } = useQuery({
    queryKey: ['system-health-counts', restaurantId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('system_health_events' as any)
        .select('severity')
        .gte('created_at', since);
      if (error) throw error;
      const critical = (data || []).filter((e: any) => e.severity === 'critical').length;
      const warning = (data || []).filter((e: any) => e.severity === 'warning').length;
      const info = (data || []).filter((e: any) => e.severity === 'info').length;
      return { critical, warning, info, total: (data || []).length };
    },
    enabled: !!restaurantId,
    refetchInterval: 30_000,
  });

  // Last critical event
  const lastCritical = events.find((e: any) => e.severity === 'critical') || null;

  // Avg order-to-payment time (last 24h)
  const { data: avgConfirmationTime } = useQuery({
    queryKey: ['avg-confirmation-time', restaurantId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('payments')
        .select('created_at, paid_at')
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'approved')
        .not('paid_at', 'is', null)
        .gte('created_at', since);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const totalMs = data.reduce((sum, p) => {
        return sum + (new Date(p.paid_at!).getTime() - new Date(p.created_at).getTime());
      }, 0);
      return Math.round(totalMs / data.length / 1000); // seconds
    },
    enabled: !!restaurantId,
  });

  // Hourly failure chart data (last 24h)
  const { data: hourlyData = [] } = useQuery({
    queryKey: ['health-hourly', restaurantId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase
        .from('system_health_events' as any)
        .select('created_at, severity')
        .gte('created_at', since)
        .order('created_at', { ascending: true }) as any);
      if (error) throw error;
      // Group by hour
      const hourMap = new Map<string, { hour: string; critical: number; warning: number }>();
      for (const e of (data as any[]) || []) {
        const hour = new Date(e.created_at).toISOString().slice(0, 13) + ':00';
        if (!hourMap.has(hour)) hourMap.set(hour, { hour, critical: 0, warning: 0 });
        const entry = hourMap.get(hour)!;
        if (e.severity === 'critical') entry.critical++;
        else if (e.severity === 'warning') entry.warning++;
      }
      return Array.from(hourMap.values());
    },
    enabled: !!restaurantId,
  });

  // Test alert mutation
  const testAlert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('log_health_event' as any, {
        p_event_type: 'test_alert',
        p_severity: 'critical',
        p_source: 'admin-panel',
        p_restaurant_id: restaurantId,
        p_correlation_id: `test-${Date.now()}`,
        p_message: '🧪 Alerta de teste disparado pelo painel admin',
        p_metadata: { test: true, triggered_by: 'admin' },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alerta de teste disparado! Verifique seu Telegram em até 2 minutos.');
      queryClient.invalidateQueries({ queryKey: ['system-health-events'] });
      queryClient.invalidateQueries({ queryKey: ['system-health-counts'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao disparar alerta: ${err.message}`);
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel('system-health-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'system_health_events',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['system-health-events'] });
        queryClient.invalidateQueries({ queryKey: ['system-health-counts'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, queryClient]);

  return {
    events,
    loadingEvents,
    counts: counts || { critical: 0, warning: 0, info: 0, total: 0 },
    lastCritical,
    avgConfirmationTime,
    hourlyData,
    testAlert,
  };
}
