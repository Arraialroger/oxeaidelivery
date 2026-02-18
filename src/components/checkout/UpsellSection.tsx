import { useState, useEffect, useRef } from 'react';
import { Plus, ShoppingBag, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useCart } from '@/contexts/CartContext';
import type { CartItem, Product } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useUpsellProductsPublic } from '@/hooks/useUpsellProducts';
import { useUpsellTracking } from '@/hooks/useUpsellTracking';

interface UpsellSectionProps {
  cartItems: CartItem[];
  freeDeliveryAbove?: number | null;
  currentSubtotal?: number;
}

export function UpsellSection({ cartItems, freeDeliveryAbove, currentSubtotal }: UpsellSectionProps) {
  const { restaurantId, settings } = useRestaurantContext();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const { trackImpression, trackAdded } = useUpsellTracking();
  const impressionsTracked = useRef(false);

  const upsellEnabled = (settings as any)?.upsell_enabled ?? true;
  const upsellMinCartValue = (settings as any)?.upsell_min_cart_value ?? 0;
  const subtotal = currentSubtotal ?? cartItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  // Fetch manually configured upsell products
  const { data: manualProducts = [] } = useUpsellProductsPublic(restaurantId);

  // Get category IDs already in cart to suggest from OTHER categories (fallback)
  const cartCategoryIds = [...new Set(cartItems.map(i => i.product.category_id).filter(Boolean))];
  const cartProductIds = cartItems.map(i => i.product.id);

  // Fallback: automatic suggestions
  const { data: autoSuggestions = [] } = useQuery({
    queryKey: ['upsell-products-auto', restaurantId, cartCategoryIds.join(',')],
    queryFn: async (): Promise<Product[]> => {
      if (!restaurantId) return [];

      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true })
        .limit(8);

      if (cartProductIds.length > 0) {
        query = query.not('id', 'in', `(${cartProductIds.join(',')})`);
      }
      if (cartCategoryIds.length > 0) {
        query = query.not('category_id', 'in', `(${cartCategoryIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

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
    // Only run fallback if no manual products configured
    enabled: !!restaurantId && cartItems.length > 0 && manualProducts.length === 0,
  });

  // Decide which products to show
  const useManual = upsellEnabled && manualProducts.length > 0;
  const suggestions = (useManual ? manualProducts : autoSuggestions)
    .filter(p => !cartProductIds.includes(p.id));

  // Track impressions once when suggestions are shown
  useEffect(() => {
    if (suggestions.length > 0 && !impressionsTracked.current) {
      impressionsTracked.current = true;
      suggestions.forEach(p => trackImpression(p.id, p.price));
    }
  }, [suggestions, trackImpression]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const handleAdd = (product: Product) => {
    addItem(product, 1, [], '');
    setAddedIds(prev => new Set(prev).add(product.id));
    trackAdded(product.id, product.price);
    toast({
      title: 'Adicionado!',
      description: `${product.name} foi adicionado ao pedido.`,
    });
  };

  // Check if adding a product would reach free delivery threshold
  const wouldGetFreeDelivery = (productPrice: number) => {
    if (!freeDeliveryAbove || subtotal >= freeDeliveryAbove) return false;
    return subtotal + productPrice >= freeDeliveryAbove;
  };

  // Check min cart value
  if (upsellMinCartValue > 0 && subtotal < upsellMinCartValue && useManual) return null;

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
          const givesFreeDelivery = wouldGetFreeDelivery(product.price);
          return (
            <div
              key={product.id}
              className="flex-shrink-0 w-32 rounded-xl border border-border/50 bg-card overflow-hidden relative"
            >
              {givesFreeDelivery && (
                <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-[10px] font-bold text-center py-0.5 flex items-center justify-center gap-1 z-10">
                  <Truck className="w-3 h-3" />
                  Frete grátis!
                </div>
              )}
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className={`w-full h-20 object-cover ${givesFreeDelivery ? 'mt-0' : ''}`}
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
