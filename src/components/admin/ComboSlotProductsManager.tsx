import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComboSlotProducts } from '@/hooks/useComboSlots';
import { useAddSlotProduct, useUpdateSlotProduct, useRemoveSlotProduct } from '@/hooks/useComboMutations';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { Plus, Trash2, Loader2, Star } from 'lucide-react';
import type { ComboSlot } from '@/types';

interface ComboSlotProductsManagerProps {
  slot: ComboSlot;
}

export function ComboSlotProductsManager({ slot }: ComboSlotProductsManagerProps) {
  const { data: slotProducts, isLoading } = useComboSlotProducts(slot.id);
  const { data: allProducts } = useAdminProducts();
  const addProduct = useAddSlotProduct();
  const updateProduct = useUpdateSlotProduct();
  const removeProduct = useRemoveSlotProduct();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [priceDiff, setPriceDiff] = useState('0');

  // Filter products by slot's category
  const availableProducts = allProducts?.filter(p => 
    slot.category_id ? p.category_id === slot.category_id : true
  ).filter(p => !p.is_combo); // Don't allow combos inside combos

  const handleAddProduct = async () => {
    if (!selectedProductId) return;
    
    await addProduct.mutateAsync({
      slot_id: slot.id,
      product_id: selectedProductId,
      price_difference: parseFloat(priceDiff) || 0,
      is_default: slotProducts?.length === 0, // First product is default
    });
    
    setSelectedProductId('');
    setPriceDiff('0');
  };

  const handleSetDefault = async (productId: string) => {
    // Remove default from all, then set new default
    for (const sp of slotProducts || []) {
      if (sp.is_default && sp.id !== productId) {
        await updateProduct.mutateAsync({ id: sp.id, slot_id: slot.id, is_default: false });
      }
    }
    await updateProduct.mutateAsync({ id: productId, slot_id: slot.id, is_default: true });
  };

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin" />;
  }

  return (
    <div className="space-y-3 pl-4 border-l-2 border-muted">
      {/* Product List */}
      {slotProducts?.map((sp) => (
        <div key={sp.id} className="flex items-center gap-2 text-sm bg-muted/30 p-2 rounded">
          <button
            onClick={() => handleSetDefault(sp.id)}
            className={`p-1 rounded ${sp.is_default ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            title={sp.is_default ? 'Padrão' : 'Definir como padrão'}
          >
            <Star className={`w-4 h-4 ${sp.is_default ? 'fill-current' : ''}`} />
          </button>
          <span className="flex-1 truncate">{sp.products?.name}</span>
          {sp.price_difference !== 0 && (
            <span className="text-xs text-muted-foreground">
              {sp.price_difference! > 0 ? '+' : ''}R$ {sp.price_difference?.toFixed(2)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => removeProduct.mutate({ id: sp.id, slot_id: slot.id })}
          >
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      ))}

      {/* Add Product Form */}
      <div className="flex gap-2">
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger className="flex-1 h-8 text-xs">
            <SelectValue placeholder="Adicionar produto..." />
          </SelectTrigger>
          <SelectContent>
            {availableProducts?.filter(p => !slotProducts?.some(sp => sp.product_id === p.id)).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} - R$ {p.price.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          step="0.01"
          placeholder="+/-"
          value={priceDiff}
          onChange={(e) => setPriceDiff(e.target.value)}
          className="w-20 h-8 text-xs"
        />
        <Button
          size="sm"
          className="h-8"
          onClick={handleAddProduct}
          disabled={!selectedProductId || addProduct.isPending}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
