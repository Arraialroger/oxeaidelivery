import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ComboSlot, ComboSlotProduct } from '@/types';

export function useComboSlots(comboId: string) {
  return useQuery({
    queryKey: ['combo-slots', comboId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combo_slots')
        .select('*')
        .eq('combo_id', comboId)
        .order('slot_order', { ascending: true });
      if (error) throw error;
      return data as ComboSlot[];
    },
    enabled: !!comboId,
  });
}

export function useComboSlotProducts(slotId: string) {
  return useQuery({
    queryKey: ['combo-slot-products', slotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('combo_slot_products')
        .select('*, products(id, name, price, image_url)')
        .eq('slot_id', slotId);
      if (error) throw error;
      return data as (ComboSlotProduct & { products: { id: string; name: string; price: number; image_url: string | null } })[];
    },
    enabled: !!slotId,
  });
}
