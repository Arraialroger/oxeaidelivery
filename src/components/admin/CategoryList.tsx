import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCategories } from '@/hooks/useCategories';
import { useDeleteCategory, useReorderCategories } from '@/hooks/useAdminMutations';
import { useToast } from '@/hooks/use-toast';
import { CategoryForm } from './CategoryForm';
import type { Category } from '@/types';
import { Edit, Trash2, Loader2, GripVertical } from 'lucide-react';
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

interface SortableCategoryItemProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (id: string, name: string) => void;
  isDeleting: boolean;
}

function SortableCategoryItem({ category, onEdit, onDelete, isDeleting }: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h4 className="font-medium">{category.name}</h4>
            <p className="text-sm text-muted-foreground">
              Ordem: {category.order_index}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(category)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(category.id, category.name)}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CategoryList() {
  const { data: categories, isLoading } = useCategories();
  const deleteCategory = useDeleteCategory();
  const reorderCategories = useReorderCategories();
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deletar "${name}"? Produtos desta categoria ficarão sem categoria.`)) return;

    try {
      await deleteCategory.mutateAsync(id);
      toast({ title: 'Categoria deletada!' });
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && categories) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      const updates = reordered.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));

      try {
        await reorderCategories.mutateAsync(updates);
      } catch (error: any) {
        toast({
          title: 'Erro ao reordenar',
          description: error.message,
          variant: 'destructive',
        });
      }
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
          items={categories?.map((c) => c.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {categories?.map((category) => (
              <SortableCategoryItem
                key={category.id}
                category={category}
                onEdit={setEditingCategory}
                onDelete={handleDelete}
                isDeleting={deleteCategory.isPending}
              />
            ))}

            {categories?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma categoria cadastrada
              </p>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              category={editingCategory}
              onSuccess={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
