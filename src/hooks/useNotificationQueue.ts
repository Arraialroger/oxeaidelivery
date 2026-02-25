import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function useNotificationQueue() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);

  // Notifications list
  const { data: notifications = [], isLoading: loadingNotifications } = useQuery({
    queryKey: ['notification-queue', 'list', statusFilter, channelFilter, restaurantId],
    queryFn: async () => {
      let query = supabase
        .from('notification_queue')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (channelFilter) query = query.eq('channel', channelFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Pending count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['notification-queue', 'pending-count', restaurantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Failed count
  const { data: failedCount = 0 } = useQuery({
    queryKey: ['notification-queue', 'failed-count', restaurantId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'failed');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Sent last 24h
  const { data: sentLast24h = 0 } = useQuery({
    queryKey: ['notification-queue', 'sent-24h', restaurantId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'sent')
        .gte('sent_at', since);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Failed last 24h
  const { data: failedLast24h = 0 } = useQuery({
    queryKey: ['notification-queue', 'failed-24h', restaurantId],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('notification_queue')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'failed')
        .gte('created_at', since);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Last sent notification
  const { data: lastSent } = useQuery({
    queryKey: ['notification-queue', 'last-sent', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Success rate
  const total24h = sentLast24h + failedLast24h;
  const successRate = total24h > 0 ? Math.round((sentLast24h / total24h) * 100) : null;

  // Trigger health-check
  const triggerHealthCheck = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('health-check', {
        method: 'POST',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Health-check executado. Verifique os alertas gerados.');
      queryClient.invalidateQueries({ queryKey: ['payment-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-alerts-count'] });
      queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao disparar health-check: ${err.message}`);
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('monitor-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notification_queue',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, restaurantId]);

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
