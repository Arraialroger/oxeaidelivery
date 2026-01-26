import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface KdsMetrics {
  // Tempos médios em minutos
  avgPrepTime: number | null;
  avgTimeToReady: number | null;
  avgTimeToDelivery: number | null;
  
  // Taxas
  cancellationRate: number;
  totalOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  
  // Volume por hora
  volumeByHour: { hour: string; count: number }[];
  
  // Status distribution
  statusDistribution: { status: string; count: number; label: string }[];
}

interface KdsEvent {
  id: string;
  order_id: string;
  event: string;
  created_at: string;
}

type DateRange = {
  start: Date;
  end: Date;
};

export const useKdsMetrics = () => {
  const [metrics, setMetrics] = useState<KdsMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (restaurantId: string | null, dateRange?: DateRange) => {
    if (!restaurantId) {
      setMetrics(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Buscar todos os eventos do período para o restaurante específico
      let eventsQuery = supabase
        .from('kds_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });

      if (dateRange) {
        eventsQuery = eventsQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: events, error: eventsError } = await eventsQuery;

      if (eventsError) {
        throw new Error('Erro ao buscar eventos KDS');
      }

      const kdsEvents = (events || []) as KdsEvent[];

      // Agrupar eventos por pedido
      const eventsByOrder = new Map<string, KdsEvent[]>();
      kdsEvents.forEach(event => {
        const orderId = event.order_id;
        if (!eventsByOrder.has(orderId)) {
          eventsByOrder.set(orderId, []);
        }
        eventsByOrder.get(orderId)!.push(event);
      });

      // Calcular métricas de tempo
      const prepTimes: number[] = [];
      const readyTimes: number[] = [];
      const deliveryTimes: number[] = [];
      let cancelledCount = 0;
      let deliveredCount = 0;

      eventsByOrder.forEach((orderEvents) => {
        const received = orderEvents.find(e => e.event === 'order_received');
        const preparing = orderEvents.find(e => e.event === 'status_changed_preparing');
        const ready = orderEvents.find(e => e.event === 'status_changed_ready');
        const delivered = orderEvents.find(e => e.event === 'status_changed_delivered');
        const cancelled = orderEvents.find(e => e.event === 'order_cancelled');

        if (cancelled) {
          cancelledCount++;
        }

        if (delivered) {
          deliveredCount++;
        }

        // Tempo de preparo: received -> preparing
        if (received && preparing) {
          const diff = (new Date(preparing.created_at).getTime() - new Date(received.created_at).getTime()) / 1000 / 60;
          if (diff > 0 && diff < 180) { // Ignorar valores anormais (> 3h)
            prepTimes.push(diff);
          }
        }

        // Tempo até pronto: received -> ready
        if (received && ready) {
          const diff = (new Date(ready.created_at).getTime() - new Date(received.created_at).getTime()) / 1000 / 60;
          if (diff > 0 && diff < 180) {
            readyTimes.push(diff);
          }
        }

        // Tempo até entrega: received -> delivered
        if (received && delivered) {
          const diff = (new Date(delivered.created_at).getTime() - new Date(received.created_at).getTime()) / 1000 / 60;
          if (diff > 0 && diff < 300) { // Ignorar valores anormais (> 5h)
            deliveryTimes.push(diff);
          }
        }
      });

      // Calcular médias
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

      // Volume por hora
      const volumeMap = new Map<number, number>();
      for (let i = 0; i < 24; i++) {
        volumeMap.set(i, 0);
      }

      kdsEvents
        .filter(e => e.event === 'order_received')
        .forEach(event => {
          const hour = new Date(event.created_at).getHours();
          volumeMap.set(hour, (volumeMap.get(hour) || 0) + 1);
        });

      const volumeByHour = Array.from(volumeMap.entries())
        .map(([hour, count]) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Distribuição de status (baseado no último evento de cada pedido)
      const statusCounts = {
        delivered: deliveredCount,
        cancelled: cancelledCount,
        active: eventsByOrder.size - deliveredCount - cancelledCount
      };

      const statusLabels: Record<string, string> = {
        delivered: 'Entregues',
        cancelled: 'Cancelados',
        active: 'Em andamento'
      };

      const statusDistribution = Object.entries(statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
          status,
          count,
          label: statusLabels[status] || status
        }));

      const totalOrders = eventsByOrder.size;
      const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

      setMetrics({
        avgPrepTime: avg(prepTimes),
        avgTimeToReady: avg(readyTimes),
        avgTimeToDelivery: avg(deliveryTimes),
        cancellationRate,
        totalOrders,
        cancelledOrders: cancelledCount,
        deliveredOrders: deliveredCount,
        volumeByHour,
        statusDistribution
      });

    } catch (err) {
      console.error('Erro ao calcular métricas KDS:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    metrics,
    loading,
    error,
    fetchMetrics
  };
};
