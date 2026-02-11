import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';
import type { DeliveryZone } from './useDeliveryZones';

type DeliveryZoneInsert = Omit<DeliveryZone, 'id'>;
type DeliveryZoneUpdate = Partial<DeliveryZone> & { id: string };

export function useDeliveryZonesMutations() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();

  const createZone = useMutation({
    mutationFn: async (zone: Omit<DeliveryZoneInsert, 'restaurant_id'>) => {
      if (!restaurantId) throw new Error('Restaurant ID not found');

      const { data, error } = await supabase
        .from('delivery_zones')
        .insert({
          ...zone,
          restaurant_id: restaurantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', restaurantId] });
      toast.success('Zona de entrega criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating delivery zone:', error);
      toast.error('Erro ao criar zona de entrega');
    },
  });

  const updateZone = useMutation({
    mutationFn: async ({ id, ...zone }: DeliveryZoneUpdate) => {
      const updateData: Record<string, unknown> = { ...zone };
      
      // polygon_coords is passed as-is; Supabase handles JSONB serialization

      const { data, error } = await supabase
        .from('delivery_zones')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', restaurantId] });
      toast.success('Zona de entrega atualizada!');
    },
    onError: (error) => {
      console.error('Error updating delivery zone:', error);
      toast.error('Erro ao atualizar zona de entrega');
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', restaurantId] });
      toast.success('Zona de entrega removida!');
    },
    onError: (error) => {
      console.error('Error deleting delivery zone:', error);
      toast.error('Erro ao remover zona de entrega');
    },
  });

  const toggleZoneActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones', restaurantId] });
      toast.success(variables.is_active ? 'Zona ativada!' : 'Zona desativada!');
    },
    onError: (error) => {
      console.error('Error toggling delivery zone:', error);
      toast.error('Erro ao alterar status da zona');
    },
  });

  return {
    createZone,
    updateZone,
    deleteZone,
    toggleZoneActive,
  };
}
