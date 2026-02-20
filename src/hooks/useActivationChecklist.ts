import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  completed: boolean;
  actionLabel: string;
  actionTab?: string;
}

export function useActivationChecklist() {
  const { restaurantId, restaurant } = useRestaurantContext();

  return useQuery({
    queryKey: ['activation-checklist', restaurantId],
    queryFn: async (): Promise<ChecklistItem[]> => {
      if (!restaurantId) return [];

      // Parallel queries
      const [productsRes, hoursRes, eventsRes] = await Promise.all([
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId),
        supabase
          .from('business_hours')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId),
        supabase
          .from('onboarding_events')
          .select('event_type')
          .eq('restaurant_id', restaurantId),
      ]);

      const productCount = productsRes.count ?? 0;
      const hoursCount = hoursRes.count ?? 0;
      const events = eventsRes.data?.map(e => e.event_type) ?? [];

      return [
        {
          key: 'logo',
          label: 'Adicionar logo',
          description: 'Sua marca visível para os clientes',
          completed: !!restaurant?.logo_url,
          actionLabel: 'Adicionar',
          actionTab: 'perfil',
        },
        {
          key: 'products',
          label: 'Cadastrar 5+ produtos',
          description: `${productCount} produtos cadastrados`,
          completed: productCount >= 5,
          actionLabel: 'Adicionar',
          actionTab: 'produtos',
        },
        {
          key: 'hours',
          label: 'Configurar horários',
          description: 'Defina quando seu restaurante abre',
          completed: hoursCount > 0,
          actionLabel: 'Configurar',
          actionTab: 'horarios',
        },
        {
          key: 'share',
          label: 'Compartilhar link',
          description: 'Divulgue seu cardápio digital',
          completed: events.includes('link_shared'),
          actionLabel: 'Compartilhar',
        },
        {
          key: 'first_order',
          label: 'Receber primeiro pedido',
          description: 'Meta: primeiro pedido em 24h! 🚀',
          completed: events.includes('first_order'),
          actionLabel: 'Aguardando',
        },
      ];
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
  });
}
