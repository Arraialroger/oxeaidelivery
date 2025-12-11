import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductOption } from '@/types';

export function useProductOptions(productId: string | null) {
  return useQuery({
    queryKey: ['product-options', productId],
    queryFn: async (): Promise<ProductOption[]> => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', productId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId,
  });
}
