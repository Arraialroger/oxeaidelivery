import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Platform-level payment monitor hook (no restaurant context needed).
 * Queries ALL restaurants' data for super_admin users.
 */
export function usePlatformPaymentMonitor() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const { data: lastRun, isLoading: loadingRun } = useQuery({
    queryKey: ['platform-reconciliation-last-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_runs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
  });

  const { data: activeAlertsCount = 0 } = useQuery({
    queryKey: ['platform-payment-alerts-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['platform-payment-alerts', severityFilter],
    queryFn: async () => {
      let query = supabase
        .from('payment_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (severityFilter) query = query.eq('severity', severityFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: inconsistentPayments = [], isLoading: loadingInconsistent } = useQuery({
    queryKey: ['platform-inconsistent-payments'],
    queryFn: async () => {
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('id, order_id, amount, created_at, restaurant_id, paid_at')
        .eq('status', 'approved')
        .not('order_id', 'is', null);
      if (pErr) throw pErr;
      if (!payments || payments.length === 0) return [];

      const orderIds = payments.map(p => p.order_id!).filter(Boolean);
      const { data: pendingOrders, error: oErr } = await supabase
        .from('orders')
        .select('id, status')
        .in('id', orderIds)
        .eq('status', 'pending');
      if (oErr) throw oErr;

      const pendingOrderIds = new Set((pendingOrders || []).map(o => o.id));
      return payments.filter(p => pendingOrderIds.has(p.order_id!));
    },
    refetchInterval: 30000,
  });

  const lastRunAge = lastRun?.executed_at
    ? (Date.now() - new Date(lastRun.executed_at).getTime()) / 60000
    : null;
  const cronStale = lastRunAge !== null && lastRunAge > 15;

  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('payment_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts-count'] });
      toast.success('Alerta marcado como resolvido');
    },
    onError: () => toast.error('Erro ao resolver alerta'),
  });

  const forceReconcile = useMutation({
    mutationFn: async (paymentId?: string) => {
      const body = paymentId ? { payment_id: paymentId } : {};
      const { data, error } = await supabase.functions.invoke('reconcile-payments', {
        method: 'POST',
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['platform-reconciliation-last-run'] });
      queryClient.invalidateQueries({ queryKey: ['platform-inconsistent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts'] });
      toast.success(`Reconciliação concluída: ${data?.fixed || 0} corrigido(s)`);
    },
    onError: (err: Error) => toast.error(`Erro na reconciliação: ${err.message}`),
  });

  useEffect(() => {
    const alertsChannel = supabase
      .channel('platform-monitor-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts'] });
        queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts-count'] });
      })
      .subscribe();

    const runsChannel = supabase
      .channel('platform-monitor-runs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reconciliation_runs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['platform-reconciliation-last-run'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(runsChannel);
    };
  }, [queryClient]);

  return {
    lastRun,
    loadingRun,
    activeAlertsCount,
    alerts,
    loadingAlerts,
    inconsistentPayments,
    loadingInconsistent,
    severityFilter,
    setSeverityFilter,
    resolveAlert,
    forceReconcile,
    cronStale,
    lastRunAge,
  };
}
