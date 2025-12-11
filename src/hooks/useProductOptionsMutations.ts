import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductOption } from '@/types';

export function useCreateProductOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (option: Omit<ProductOption, 'id'>) => {
      const { data, error } = await supabase
        .from('product_options')
        .insert({
          product_id: option.product_id,
          name: option.name,
          type: option.type,
          group_name: option.group_name,
          price: option.price,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-options', variables.product_id] });
    },
  });
}

export function useUpdateProductOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...option }: Partial<ProductOption> & { id: string; product_id?: string | null }) => {
      const { data, error } = await supabase
        .from('product_options')
        .update({
          name: option.name,
          type: option.type,
          group_name: option.group_name,
          price: option.price,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['product-options', data.product_id] });
    },
  });
}

export function useDeleteProductOption() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, productId }: { id: string; productId: string }) => {
      const { error } = await supabase
        .from('product_options')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['product-options', productId] });
    },
  });
}
