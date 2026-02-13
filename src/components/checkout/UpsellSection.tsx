import { useState } from 'react';
import { Plus, ShoppingBag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useCart } from '@/contexts/CartContext';
import type { CartItem, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface UpsellSectionProps {
  cartItems: CartItem[];
}

export function UpsellSection({ cartItems }: UpsellSectionProps) {
  const { restaurantId } = useRestaurantContext();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Get category IDs already in cart to suggest from OTHER categories
  const cartCategoryIds = [...new Set(cartItems.map(i => i.product.category_id).filter(Boolean))];
  const cartProductIds = cartItems.map(i => i.product.id);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['upsell-products', restaurantId, cartCategoryIds.join(',')],
    queryFn: async (): Promise<Product[]> => {
      if (!restaurantId) return [];

      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true })
        .limit(8);

      // Exclude products already in cart
      if (cartProductIds.length > 0) {
        query = query.not('id', 'in', `(${cartProductIds.join(',')})`);
      }

      // Prefer products from different categories
      if (cartCategoryIds.length > 0) {
        query = query.not('category_id', 'in', `(${cartCategoryIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If not enough from other categories, fetch from same categories too
      if ((data?.length || 0) < 4 && cartCategoryIds.length > 0) {
        const { data: sameCategory } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('restaurant_id', restaurantId)
          .not('id', 'in', `(${cartProductIds.join(',')})`)
          .in('category_id', cartCategoryIds)
          .order('order_index', { ascending: true })
          .limit(4);

        const existingIds = new Set(data?.map(p => p.id) || []);
        const extra = (sameCategory || []).filter(p => !existingIds.has(p.id));
        return [...(data || []), ...extra].slice(0, 6);
      }

      return (data || []).slice(0, 6);
    },
    enabled: !!restaurantId && cartItems.length > 0,
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const handleAdd = (product: Product) => {
    addItem(product, 1, [], '');
    setAddedIds(prev => new Set(prev).add(product.id));
    toast({
      title: 'Adicionado!',
      description: `${product.name} foi adicionado ao pedido.`,
    });
  };

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Que tal adicionar?</h3>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {suggestions.map((product) => {
          const wasAdded = addedIds.has(product.id);
          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-32 rounded-xl border border-border/50 bg-card overflow-hidden"
            >
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-20 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2 flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                  {product.name}
                </p>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-xs font-bold text-primary">
                    {formatPrice(product.price)}
                  </span>
                  <button
                    onClick={() => handleAdd(product)}
                    disabled={wasAdded}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      wasAdded
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary text-primary-foreground hover:scale-110 active:scale-90'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
