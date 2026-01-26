import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useAdminMutations';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useToast } from '@/hooks/use-toast';
import type { Category } from '@/types';
import { Loader2 } from 'lucide-react';

interface CategoryFormProps {
  category?: Category;
  onSuccess?: () => void;
}

export function CategoryForm({ category, onSuccess }: CategoryFormProps) {
  const { restaurantId } = useRestaurantContext();
  const createCategory = useCreateCategory(restaurantId);
  const updateCategory = useUpdateCategory();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: category?.name || '',
    order_index: category?.order_index?.toString() || '0',
  });

  const isEditing = !!category;
  const mutation = isEditing ? updateCategory : createCategory;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditing) {
        await updateCategory.mutateAsync({
          id: category.id,
          name: formData.name,
          order_index: parseInt(formData.order_index) || 0,
        });
      } else {
        await createCategory.mutateAsync({
          name: formData.name,
          order_index: parseInt(formData.order_index) || 0,
        });
      }

      toast({
        title: isEditing ? 'Categoria atualizada!' : 'Categoria criada!',
        description: formData.name,
      });

      if (!isEditing) {
        setFormData({ name: '', order_index: '0' });
      }

      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nome da categoria"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="order_index">Ordem</Label>
        <Input
          id="order_index"
          type="number"
          min="0"
          value={formData.order_index}
          onChange={(e) => setFormData({ ...formData, order_index: e.target.value })}
          placeholder="0"
        />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isEditing ? 'Atualizar Categoria' : 'Criar Categoria'}
      </Button>
    </form>
  );
}
