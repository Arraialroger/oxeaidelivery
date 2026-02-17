import { useState } from 'react';
import { Plus, GripVertical, Trash2, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useUpdateRestaurantSettings } from '@/hooks/useAdminMutations';
import { useUpsellProducts, useUpsellMutations } from '@/hooks/useUpsellProducts';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UpsellProduct } from '@/hooks/useUpsellProducts';

const MAX_UPSELL_PRODUCTS = 10;

function SortableUpsellItem({ item, onRemove }: { item: UpsellProduct; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
        <GripVertical className="w-4 h-4" />
      </button>

      {item.product?.image_url ? (
        <img src={item.product.image_url} alt={item.product?.name} className="w-10 h-10 rounded-md object-cover" />
      ) : (
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
          <Package className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.product?.name || 'Produto removido'}</p>
        <p className="text-xs text-muted-foreground">{item.product ? formatPrice(item.product.price) : ''}</p>
      </div>

      {!item.product?.is_active && item.product && (
        <Badge variant="secondary" className="text-xs">Inativo</Badge>
      )}

      <Button variant="ghost" size="icon" className="shrink-0 text-destructive hover:text-destructive" onClick={() => onRemove(item.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

function ProductSelector({ onSelect, existingProductIds }: { onSelect: (productId: string) => void; existingProductIds: Set<string> }) {
  const { restaurantId } = useRestaurantContext();
  const { data: products = [], isLoading } = useAdminProducts(restaurantId || undefined);
  const [search, setSearch] = useState('');

  const filtered = products
    .filter(p => p.is_active && !existingProductIds.has(p.id))
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {isLoading && <p className="text-sm text-muted-foreground p-2">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">Nenhum produto disponível</p>
        )}
        {filtered.map(product => (
          <button
            key={product.id}
            onClick={() => onSelect(product.id)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
          >
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="w-8 h-8 rounded object-cover" />
            ) : (
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                <Package className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{product.name}</p>
            </div>
            <span className="text-xs text-muted-foreground">{formatPrice(product.price)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function UpsellManager() {
  const { restaurant, restaurantId, settings } = useRestaurantContext();
  const updateSettings = useUpdateRestaurantSettings(restaurantId);
  const { data: upsellProducts = [], isLoading } = useUpsellProducts();
  const { addProduct, removeProduct, reorderProducts } = useUpsellMutations();
  const { toast } = useToast();
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Settings from restaurant
  const upsellEnabled = (settings as any)?.upsell_enabled ?? true;
  const upsellMinCartValue = (settings as any)?.upsell_min_cart_value ?? 0;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      await updateSettings.mutateAsync({ ...settings, upsell_enabled: enabled } as any);
      toast({ title: enabled ? 'Upsell ativado' : 'Upsell desativado' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleMinCartValueChange = async (value: string) => {
    const numValue = parseFloat(value) || 0;
    try {
      await updateSettings.mutateAsync({ ...settings, upsell_min_cart_value: numValue } as any);
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleAddProduct = async (productId: string) => {
    if (upsellProducts.length >= MAX_UPSELL_PRODUCTS) {
      toast({ title: 'Limite atingido', description: `Máximo de ${MAX_UPSELL_PRODUCTS} produtos.`, variant: 'destructive' });
      return;
    }
    try {
      await addProduct.mutateAsync({ productId, orderIndex: upsellProducts.length });
      toast({ title: 'Produto adicionado ao upsell!' });
      setSelectorOpen(false);
    } catch {
      toast({ title: 'Erro ao adicionar', variant: 'destructive' });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeProduct.mutateAsync(id);
      toast({ title: 'Produto removido do upsell' });
    } catch {
      toast({ title: 'Erro ao remover', variant: 'destructive' });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = upsellProducts.findIndex(i => i.id === active.id);
    const newIndex = upsellProducts.findIndex(i => i.id === over.id);
    const reordered = arrayMove(upsellProducts, oldIndex, newIndex);

    try {
      await reorderProducts.mutateAsync(
        reordered.map((item, idx) => ({ id: item.id, order_index: idx }))
      );
    } catch {
      toast({ title: 'Erro ao reordenar', variant: 'destructive' });
    }
  };

  const existingProductIds = new Set(upsellProducts.map(u => u.product_id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Upsell no Checkout</CardTitle>
          </div>
          <Switch checked={upsellEnabled} onCheckedChange={handleToggleEnabled} />
        </div>
        <p className="text-sm text-muted-foreground">
          Selecione os produtos que aparecem como sugestão no checkout para aumentar o ticket médio.
        </p>
      </CardHeader>

      {upsellEnabled && (
        <CardContent className="space-y-4">
          {/* Min cart value */}
          <div className="space-y-1.5">
            <Label htmlFor="upsell_min_cart">Valor mínimo do carrinho (R$)</Label>
            <Input
              id="upsell_min_cart"
              type="number"
              step="0.01"
              min="0"
              defaultValue={upsellMinCartValue}
              onBlur={(e) => handleMinCartValueChange(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              O upsell só aparece quando o carrinho atinge este valor. Deixe 0 para sempre exibir.
            </p>
          </div>

          {/* Product list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Produtos ({upsellProducts.length}/{MAX_UPSELL_PRODUCTS})</Label>
              <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5" disabled={upsellProducts.length >= MAX_UPSELL_PRODUCTS}>
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Selecionar Produto</DialogTitle>
                  </DialogHeader>
                  <ProductSelector onSelect={handleAddProduct} existingProductIds={existingProductIds} />
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Carregando...</div>
            ) : upsellProducts.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center">
                <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum produto selecionado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Enquanto não houver produtos aqui, o sistema usará sugestões automáticas.
                </p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={upsellProducts.map(u => u.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {upsellProducts.map(item => (
                      <SortableUpsellItem key={item.id} item={item} onRemove={handleRemove} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            💡 Arraste para reordenar. Produtos inativos no cardápio não aparecerão no checkout.
            Se a lista estiver vazia, o sistema exibirá sugestões automáticas baseadas nas categorias do carrinho.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
