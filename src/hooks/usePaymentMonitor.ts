import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function usePaymentMonitor() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  // Last reconciliation run (filtered by restaurant or global)
  const { data: lastRun, isLoading: loadingRun } = useQuery({
    queryKey: ['reconciliation-last-run', restaurantId],
    queryFn: async () => {
      let query = supabase
        .from('reconciliation_runs')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(1);

      // Include global runs (restaurant_id IS NULL) and restaurant-specific
      if (restaurantId) {
        query = query.or(`restaurant_id.is.null,restaurant_id.eq.${restaurantId}`);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    refetchInterval: 60000,
  });

  // Active (unresolved) alerts count
  const { data: activeAlertsCount = 0 } = useQuery({
    queryKey: ['payment-alerts-count', restaurantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payment_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .eq('restaurant_id', restaurantId!);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Alerts list
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['payment-alerts', severityFilter, restaurantId],
    queryFn: async () => {
      let query = supabase
        .from('payment_alerts')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (severityFilter) {
        query = query.eq('severity', severityFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Inconsistent payments (approved payment + pending order)
  const { data: inconsistentPayments = [], isLoading: loadingInconsistent } = useQuery({
    queryKey: ['inconsistent-payments', restaurantId],
    queryFn: async () => {
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('id, order_id, amount, created_at, restaurant_id, paid_at')
        .eq('status', 'approved')
        .eq('restaurant_id', restaurantId!)
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
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Cron stale detection
  const lastRunAge = lastRun?.executed_at
    ? (Date.now() - new Date(lastRun.executed_at).getTime()) / 60000
    : null;
  const cronStale = lastRunAge !== null && lastRunAge > 15;

  // Resolve alert mutation
  const resolveAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('payment_alerts')
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-alerts-count'] });
      toast.success('Alerta marcado como resolvido');
    },
    onError: () => toast.error('Erro ao resolver alerta'),
  });

  // Force reconciliation for a specific payment
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
      queryClient.invalidateQueries({ queryKey: ['reconciliation-last-run'] });
      queryClient.invalidateQueries({ queryKey: ['inconsistent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-alerts-count'] });
      toast.success(`Reconciliação concluída: ${data?.fixed || 0} corrigido(s)`);
    },
    onError: (err: Error) => toast.error(`Erro na reconciliação: ${err.message}`),
  });

  // Realtime subscriptions with restaurant_id filter
  useEffect(() => {
    if (!restaurantId) return;

    const alertsChannel = supabase
      .channel('monitor-alerts')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payment_alerts',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
        queryClient.invalidateQueries({ queryKey: ['payment-alerts-count'] });
      })
      .subscribe();

    const runsChannel = supabase
      .channel('monitor-runs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reconciliation_runs',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['reconciliation-last-run'] });
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('monitor-payments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['inconsistent-payments'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [queryClient, restaurantId]);

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
