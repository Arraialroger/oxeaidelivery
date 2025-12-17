import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCreateComboSlot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (slot: {
      combo_id: string;
      slot_label: string;
      category_id: string | null;
      quantity: number;
      slot_order: number;
    }) => {
      const { data, error } = await supabase
        .from('combo_slots')
        .insert(slot)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slots', variables.combo_id] });
      toast({ title: 'Slot criado!' });
    },
  });
}

export function useUpdateComboSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, combo_id, ...slot }: {
      id: string;
      combo_id: string;
      slot_label?: string;
      category_id?: string | null;
      quantity?: number;
      slot_order?: number;
    }) => {
      const { data, error } = await supabase
        .from('combo_slots')
        .update(slot)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { data, combo_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slots', result.combo_id] });
    },
  });
}

export function useDeleteComboSlot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, combo_id }: { id: string; combo_id: string }) => {
      const { error } = await supabase
        .from('combo_slots')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { combo_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slots', result.combo_id] });
      toast({ title: 'Slot removido!' });
    },
  });
}

export function useAddSlotProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      slot_id: string;
      product_id: string;
      price_difference: number;
      is_default: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('combo_slot_products')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return { result, slot_id: data.slot_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slot-products', result.slot_id] });
      toast({ title: 'Produto adicionado ao slot!' });
    },
  });
}

export function useUpdateSlotProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, slot_id, ...data }: {
      id: string;
      slot_id: string;
      price_difference?: number;
      is_default?: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('combo_slot_products')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { result, slot_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slot-products', result.slot_id] });
    },
  });
}

export function useRemoveSlotProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, slot_id }: { id: string; slot_id: string }) => {
      const { error } = await supabase
        .from('combo_slot_products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { slot_id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['combo-slot-products', result.slot_id] });
      toast({ title: 'Produto removido do slot!' });
    },
  });
}
