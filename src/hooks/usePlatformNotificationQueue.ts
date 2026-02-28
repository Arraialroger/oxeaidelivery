import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Platform-level notification queue hook (no restaurant context needed).
 */
export function usePlatformNotificationQueue() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['platform-notification-queue', 'list', statusFilter, channelFilter],
    queryFn: async () => {
      let query = supabase
        .from('notification_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (channelFilter) query = query.eq('channel', channelFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['platform-notification-queue', 'pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: failedCount = 0 } = useQuery({
    queryKey: ['platform-notification-queue', 'failed-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: sentLast24h = 0 } = useQuery({
    queryKey: ['platform-notification-queue', 'sent-24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', since);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: failedLast24h = 0 } = useQuery({
    queryKey: ['platform-notification-queue', 'failed-24h'],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('created_at', since);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: lastSent } = useQuery({
    queryKey: ['platform-notification-queue', 'last-sent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const total24h = sentLast24h + failedLast24h;
  const successRate = total24h > 0 ? Math.round((sentLast24h / total24h) * 100) : null;

  const triggerHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-check', { method: 'POST' });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Health-check executado.');
      queryClient.invalidateQueries({ queryKey: ['platform-payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['platform-notification-queue'] });
    },
    onError: (err: Error) => toast.error(`Erro: ${err.message}`),
  });

  useEffect(() => {
    const channel = supabase
      .channel('platform-monitor-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notification_queue' }, () => {
        queryClient.invalidateQueries({ queryKey: ['platform-notification-queue'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return {
    notifications,
    loadingNotifications,
    pendingCount,
    failedCount,
    sentLast24h,
    successRate,
    lastSent,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    triggerHealthCheck,
  };
}
