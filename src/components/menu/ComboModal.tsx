import { useState, useEffect } from 'react';
import { X, Minus, Plus, Check, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useComboSlots, useComboSlotProducts } from '@/hooks/useComboSlots';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import { trackViewItem, trackAddToCart } from '@/lib/gtag';
import { supabase } from '@/integrations/supabase/client';
import { ImageZoomModal } from './ImageZoomModal';
import type { Product, SelectedOption } from '@/types';

interface ComboModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

interface SlotSelection {
  slotId: string;
  slotLabel: string;
  productId: string;
  productName: string;
  priceDifference: number;
}

function SlotSelector({ 
  slotId, 
  slotLabel, 
  quantity,
  selection, 
  onSelect 
}: { 
  slotId: string; 
  slotLabel: string;
  quantity: number;
  selection: SlotSelection | undefined;
  onSelect: (selection: SlotSelection) => void;
}) {
  const { data: slotProducts, isLoading } = useComboSlotProducts(slotId);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse bg-secondary rounded-lg h-20" />
    );
  }

  if (!slotProducts || slotProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-foreground">{slotLabel}</h3>
        {quantity > 1 && (
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
            {quantity}x
          </span>
        )}
        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
          Escolha 1
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {slotProducts.map((sp) => {
          const isSelected = selection?.productId === sp.product_id;
          const product = sp.products;
          
          return (
            <button
              key={sp.id}
              onClick={() => onSelect({
                slotId,
                slotLabel,
                productId: sp.product_id,
                productName: product.name,
                priceDifference: sp.price_difference || 0,
              })}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {product.image_url && (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <span className="text-foreground font-medium">{product.name}</span>
                {sp.is_default && (
                  <span className="ml-2 text-xs text-muted-foreground">(Padrão)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {sp.price_difference && sp.price_difference > 0 ? (
                  <span className="text-primary font-medium">
                    +{formatPrice(sp.price_difference)}
                  </span>
                ) : null}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ComboModal({ product, isOpen, onClose }: ComboModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<Record<string, SlotSelection>>({});
  const [note, setNote] = useState('');
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const { data: slots, isLoading } = useComboSlots(product.id);
  const { addItem } = useCart();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelections({});
      setNote('');
      setDefaultsLoaded(false);
      setIsImageZoomed(false);
      
      // Track view_item event for combo
      trackViewItem({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category_id ?? undefined,
      });
    }
  }, [isOpen, product.id]);

  // Auto-select default products when slots are loaded
  useEffect(() => {
    if (!isOpen || !slots || slots.length === 0 || defaultsLoaded) return;

    const loadDefaults = async () => {
      const defaultSelections: Record<string, SlotSelection> = {};

      for (const slot of slots) {
        const { data: slotProducts } = await supabase
          .from('combo_slot_products')
          .select('*, products(id, name, price, image_url)')
          .eq('slot_id', slot.id);

        if (slotProducts) {
          const defaultProduct = slotProducts.find(sp => sp.is_default);
          if (defaultProduct && defaultProduct.products) {
            defaultSelections[slot.id] = {
              slotId: slot.id,
              slotLabel: slot.slot_label,
              productId: defaultProduct.product_id,
              productName: defaultProduct.products.name,
              priceDifference: defaultProduct.price_difference || 0,
            };
          }
        }
      }

      if (Object.keys(defaultSelections).length > 0) {
        setSelections(defaultSelections);
      }
      setDefaultsLoaded(true);
    };

    loadDefaults();
  }, [isOpen, slots, defaultsLoaded]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleSlotSelect = (selection: SlotSelection) => {
    setSelections(prev => ({
      ...prev,
      [selection.slotId]: selection,
    }));
  };

  // Calculate total price
  const priceDifferencesTotal = Object.values(selections).reduce(
    (sum, sel) => sum + sel.priceDifference,
    0
  );
  const totalPrice = (product.price + priceDifferencesTotal) * quantity;

  // Check if all required slots are selected
  const allSlotsSelected = slots?.every(slot => selections[slot.id]) ?? false;

  const handleAddToCart = () => {
    // Convert selections to SelectedOptions for cart compatibility
    const comboOptions: SelectedOption[] = Object.values(selections).map(sel => ({
      id: sel.productId,
      name: `${sel.slotLabel}: ${sel.productName}`,
      price: sel.priceDifference,
      type: 'combo-selection',
      groupName: sel.slotLabel,
    }));

    // Track add_to_cart event for combo
    trackAddToCart({
      id: product.id,
      name: product.name,
      price: totalPrice / quantity,
      quantity,
      category: product.category_id ?? undefined,
    });

    addItem(product, quantity, comboOptions, note);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header Image */}
        {product.image_url && (
          <div 
            className="relative h-48 flex-shrink-0 cursor-zoom-in group"
            onClick={() => setIsImageZoomed(true)}
            role="button"
            aria-label="Clique para ampliar a imagem"
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            
            {/* Indicador de zoom */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Ampliar</span>
            </div>
          </div>
        )}

        {/* Modal de imagem ampliada */}
        {product.image_url && (
          <ImageZoomModal
            imageUrl={product.image_url}
            alt={product.name}
            isOpen={isImageZoomed}
            onClose={() => setIsImageZoomed(false)}
          />
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
          {product.description && (
            <p className="text-muted-foreground mt-1">{product.description}</p>
          )}
          <p className="text-primary font-bold text-lg mt-2">
            A partir de {formatPrice(product.price)}
          </p>

          {/* Combo Badge */}
          <div className="mt-3 mb-4">
            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full">
              Monte seu combo
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4">
              <div className="animate-pulse bg-secondary rounded-lg h-24" />
              <div className="animate-pulse bg-secondary rounded-lg h-24" />
            </div>
          )}

          {/* Slot Selectors */}
          {slots?.map((slot) => (
            <SlotSelector
              key={slot.id}
              slotId={slot.id}
              slotLabel={slot.slot_label}
              quantity={slot.quantity || 1}
              selection={selections[slot.id]}
              onSelect={handleSlotSelect}
            />
          ))}

          {/* Note */}
          <div className="mt-4">
            <h3 className="font-semibold text-foreground mb-2">Observações</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Sem cebola, molho à parte..."
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-card safe-bottom">
          <div className="flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center gap-3 bg-secondary rounded-full p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!allSlotsSelected}
              className="flex-1 h-12 text-base font-semibold"
            >
              {allSlotsSelected 
                ? `Adicionar ${formatPrice(totalPrice)}`
                : 'Selecione todos os itens'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
