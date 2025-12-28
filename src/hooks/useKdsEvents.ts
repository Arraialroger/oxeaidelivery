import { supabase } from '@/integrations/supabase/client';

type KdsEventType = 
  | 'order_received'
  | 'status_changed_preparing'
  | 'status_changed_ready'
  | 'status_changed_out_for_delivery'
  | 'status_changed_delivered'
  | 'order_cancelled'
  | 'receipt_printed';

/**
 * Hook para registrar eventos do KDS (Kitchen Display System)
 * 
 * IMPORTANTE: Este hook é fail-safe - erros no registro de eventos
 * NUNCA bloqueiam o fluxo principal da aplicação. Todos os métodos
 * retornam Promises que resolvem silenciosamente mesmo em caso de erro.
 */
export const useKdsEvents = () => {
  /**
   * Registra um evento genérico no KDS
   * @param orderId - ID do pedido
   * @param event - Tipo do evento
   */
  const logEvent = async (orderId: string, event: KdsEventType): Promise<void> => {
    try {
      const { error } = await supabase
        .from('kds_events')
        .insert({ 
          order_id: orderId, 
          event 
        });

      if (error) {
        console.warn('[KDS Events] Erro ao registrar evento:', event, error);
      }
    } catch (error) {
      // Silently fail - eventos são não-críticos
      console.warn('[KDS Events] Falha silenciosa ao registrar evento:', event, error);
    }
  };

  /**
   * Registra que um novo pedido foi recebido
   */
  const logOrderReceived = (orderId: string): Promise<void> => {
    return logEvent(orderId, 'order_received');
  };

  /**
   * Registra mudança de status do pedido
   */
  const logStatusChange = (orderId: string, newStatus: string): Promise<void> => {
    const eventMap: Record<string, KdsEventType> = {
      preparing: 'status_changed_preparing',
      ready: 'status_changed_ready',
      out_for_delivery: 'status_changed_out_for_delivery',
      delivered: 'status_changed_delivered',
    };

    const event = eventMap[newStatus];
    if (!event) {
      console.warn('[KDS Events] Status desconhecido:', newStatus);
      return Promise.resolve();
    }

    return logEvent(orderId, event);
  };

  /**
   * Registra que o recibo do pedido foi impresso
   */
  const logOrderPrinted = (orderId: string): Promise<void> => {
    return logEvent(orderId, 'receipt_printed');
  };

  /**
   * Registra que o pedido foi cancelado
   */
  const logOrderCancelled = (orderId: string): Promise<void> => {
    return logEvent(orderId, 'order_cancelled');
  };

  return {
    logOrderReceived,
    logStatusChange,
    logOrderPrinted,
    logOrderCancelled,
  };
};
