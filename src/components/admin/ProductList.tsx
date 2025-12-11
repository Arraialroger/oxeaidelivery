import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdminProducts } from '@/hooks/useAdminProducts';
import { useDeleteProduct, useDuplicateProduct, useReorderProducts } from '@/hooks/useAdminMutations';
import { useToast } from '@/hooks/use-toast';
import { ProductForm } from './ProductForm';
import { ProductOptionsManager } from './ProductOptionsManager';
import type { Product } from '@/types';
import { Edit, Trash2, Loader2, Settings2, Copy, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableProductProps {
  product: Product;
  expandedProductId: string | null;
  onExpand: (id: string | null) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onDelete: (id: string, name: string) => void;
  isDuplicating: boolean;
  isDeleting: boolean;
}

function SortableProduct({
  product,
  expandedProductId,
  onExpand,
  onEdit,
  onDuplicate,
  onDelete,
  isDuplicating,
  isDeleting,
}: SortableProductProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Collapsible
      open={expandedProductId === product.id}
      onOpenChange={(open) => onExpand(open ? product.id : null)}
    >
      <div ref={setNodeRef} style={style}>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none"
              >
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </button>
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{product.name}</h4>
                <p className="text-sm text-muted-foreground">
                  R$ {product.price.toFixed(2)}
                  {!product.is_active && (
                    <span className="ml-2 text-destructive">(Inativo)</span>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDuplicate(product)}
                  disabled={isDuplicating}
                  title="Duplicar produto"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(product)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(product.id, product.name)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <CollapsibleContent className="mt-2">
          <ProductOptionsManager product={product} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ProductList() {
  const { data: products, isLoading } = useAdminProducts();
  const deleteProduct = useDeleteProduct();
  const duplicateProduct = useDuplicateProduct();
  const reorderProducts = useReorderProducts();
  const { toast } = useToast();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && products) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(products, oldIndex, newIndex);

      const updates = reordered.map((p, index) => ({
        id: p.id,
        order_index: index,
      }));

      try {
        await reorderProducts.mutateAsync(updates);
      } catch (error: any) {
        toast({
          title: 'Erro ao reordenar',
          description: error.message,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await duplicateProduct.mutateAsync(product);
    } catch (error: any) {
      toast({
        title: 'Erro ao duplicar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deletar "${name}"?`)) return;

    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: 'Produto deletado!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products?.map((p) => p.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {products?.map((product) => (
              <SortableProduct
                key={product.id}
                product={product}
                expandedProductId={expandedProductId}
                onExpand={setExpandedProductId}
                onEdit={setEditingProduct}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                isDuplicating={duplicateProduct.isPending}
                isDeleting={deleteProduct.isPending}
              />
            ))}

            {products?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <ProductForm
              product={editingProduct}
              onSuccess={() => setEditingProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
