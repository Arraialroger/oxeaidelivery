import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

/**
 * Platform-level system health hook (no restaurant context needed).
 * Queries ALL restaurants' data for super_admin users.
 */
export function usePlatformSystemHealth() {
  const queryClient = useQueryClient();

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['platform-health-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health_events' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30_000,
  });

  const { data: counts } = useQuery({
    queryKey: ['platform-health-counts'],
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
    refetchInterval: 30_000,
  });

  const lastCritical = events.find((e: any) => e.severity === 'critical') || null;

  const { data: avgConfirmationTime } = useQuery({
    queryKey: ['platform-avg-confirmation-time'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('payments')
        .select('created_at, paid_at')
        .eq('status', 'approved')
        .not('paid_at', 'is', null)
        .gte('created_at', since);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const totalMs = data.reduce((sum, p) => {
        return sum + (new Date(p.paid_at!).getTime() - new Date(p.created_at).getTime());
      }, 0);
      return Math.round(totalMs / data.length / 1000);
    },
  });

  const { data: hourlyData = [] } = useQuery({
    queryKey: ['platform-health-hourly'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase
        .from('system_health_events' as any)
        .select('created_at, severity')
        .gte('created_at', since)
        .order('created_at', { ascending: true }) as any);
      if (error) throw error;
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
  });

  const testAlert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('log_health_event' as any, {
        p_event_type: 'test_alert',
        p_severity: 'critical',
        p_source: 'platform-admin',
        p_restaurant_id: null,
        p_correlation_id: `test-${Date.now()}`,
        p_message: '🧪 Alerta de teste disparado pelo painel Super Admin',
        p_metadata: { test: true, triggered_by: 'super_admin' },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Alerta de teste disparado! Verifique seu Telegram em até 2 minutos.');
      queryClient.invalidateQueries({ queryKey: ['platform-health-events'] });
      queryClient.invalidateQueries({ queryKey: ['platform-health-counts'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao disparar alerta: ${err.message}`);
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-health-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_health_events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['platform-health-events'] });
        queryClient.invalidateQueries({ queryKey: ['platform-health-counts'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

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
