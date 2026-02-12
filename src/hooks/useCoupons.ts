import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useToast } from '@/hooks/use-toast';

export interface Coupon {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  first_purchase_only: boolean;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function useCoupons() {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['coupons', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (coupon: Omit<Coupon, 'id' | 'restaurant_id' | 'current_uses' | 'created_at'>) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...coupon, restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Cupom criado com sucesso!' });
    },
    onError: (error: Error) => {
      const isDuplicate = error.message?.includes('idx_coupons_code_restaurant');
      toast({
        title: isDuplicate ? 'Código já existe' : 'Erro ao criar cupom',
        description: isDuplicate ? 'Já existe um cupom com esse código.' : error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...coupon }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(coupon)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Cupom atualizado!' });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: 'Cupom excluído!' });
    },
  });
}

/**
 * Validate and apply a coupon code for checkout.
 */
export function useValidateCoupon() {
  const { restaurantId } = useRestaurantContext();

  return useMutation({
    mutationFn: async ({
      code,
      subtotal,
      customerPhone,
    }: {
      code: string;
      subtotal: number;
      customerPhone: string;
    }) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');

      // Fetch coupon by code
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .ilike('code', code.trim())
        .maybeSingle();

      if (error) throw error;
      if (!coupon) throw new Error('Cupom não encontrado');

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error('Este cupom expirou');
      }

      // Check max uses
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        throw new Error('Este cupom atingiu o limite de uso');
      }

      // Check min order
      if (subtotal < coupon.min_order_value) {
        throw new Error(`Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2).replace('.', ',')} para este cupom`);
      }

      // Check first purchase only
      if (coupon.first_purchase_only && customerPhone) {
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('status', 'delivered')
          .limit(1);

        // Check if this phone has previous orders via customer lookup
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', customerPhone)
          .eq('restaurant_id', restaurantId)
          .maybeSingle();

        if (customer) {
          const { count } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('customer_id', customer.id)
            .eq('restaurant_id', restaurantId)
            .not('status', 'eq', 'cancelled');

          if (count && count > 0) {
            throw new Error('Este cupom é válido apenas para primeira compra');
          }
        }
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'fixed') {
        discount = Math.min(coupon.discount_value, subtotal);
      } else {
        discount = Math.min((subtotal * coupon.discount_value) / 100, subtotal);
      }

      return {
        coupon: coupon as Coupon,
        discount: Math.round(discount * 100) / 100,
      };
    },
  });
}
