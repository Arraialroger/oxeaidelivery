import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function usePaymentMonitor() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  // Last reconciliation run
  const { data: lastRun, isLoading: loadingRun } = useQuery({
    queryKey: ['reconciliation-last-run'],
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

  // Active (unresolved) alerts count
  const { data: activeAlertsCount = 0 } = useQuery({
    queryKey: ['payment-alerts-count'],
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

  // Alerts list
  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['payment-alerts', severityFilter],
    queryFn: async () => {
      let query = supabase
        .from('payment_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (severityFilter) {
        query = query.eq('severity', severityFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Inconsistent payments (approved payment + pending order)
  const { data: inconsistentPayments = [], isLoading: loadingInconsistent } = useQuery({
    queryKey: ['inconsistent-payments'],
    queryFn: async () => {
      // Get approved payments
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('id, order_id, amount, created_at, restaurant_id, paid_at')
        .eq('status', 'approved')
        .not('order_id', 'is', null);
      if (pErr) throw pErr;
      if (!payments || payments.length === 0) return [];

      // Check which have pending orders
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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('Não autenticado');

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

  // Realtime subscriptions
  useEffect(() => {
    const alertsChannel = supabase
      .channel('monitor-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_alerts' }, () => {
        queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
        queryClient.invalidateQueries({ queryKey: ['payment-alerts-count'] });
      })
      .subscribe();

    const runsChannel = supabase
      .channel('monitor-runs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reconciliation_runs' }, () => {
        queryClient.invalidateQueries({ queryKey: ['reconciliation-last-run'] });
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('monitor-payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['inconsistent-payments'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(paymentsChannel);
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
  };
}
