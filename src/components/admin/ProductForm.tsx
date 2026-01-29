import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useAdminMutations';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useToast } from '@/hooks/use-toast';
import { isValidPrice } from '@/lib/formatUtils';
import { ImageUploader } from '@/components/admin/ImageUploader';
import type { Product } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProductFormProps {
  product?: Product;
  onSuccess?: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { restaurantId } = useRestaurantContext();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct(restaurantId);
  const updateProduct = useUpdateProduct();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    image_url: product?.image_url || '',
    category_id: product?.category_id || '',
    is_active: product?.is_active ?? true,
    is_combo: product?.is_combo ?? false,
  });

  const isEditing = !!product;
  const mutation = isEditing ? updateProduct : createProduct;

  const handleImageChange = (url: string | null) => {
    setFormData({ ...formData, image_url: url || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate price
    if (!isValidPrice(formData.price)) {
      toast({
        title: 'Preço inválido',
        description: 'Digite um valor numérico válido.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({
          id: product.id,
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          image_url: formData.image_url || null,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          is_combo: formData.is_combo,
        });
      } else {
        await createProduct.mutateAsync({
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          image_url: formData.image_url || null,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          is_combo: formData.is_combo,
        });
      }

      toast({
        title: isEditing ? 'Produto atualizado!' : 'Produto criado!',
        description: formData.name,
      });

      if (!isEditing) {
        setFormData({
          name: '',
          description: '',
          price: '',
          image_url: '',
          category_id: '',
          is_active: true,
          is_combo: false,
        });
      }

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: message,
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
          placeholder="Nome do produto"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do produto"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Preço *</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <Label>Imagem do Produto</Label>
        <ImageUploader
          currentImageUrl={formData.image_url || null}
          onImageChange={handleImageChange}
          folder="products"
          aspectRatio="4:3"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
          />
          <Label htmlFor="is_active">Produto ativo</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="is_combo"
            checked={formData.is_combo}
            onCheckedChange={(checked) => setFormData({ ...formData, is_combo: checked })}
          />
          <Label htmlFor="is_combo">É combo</Label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isEditing ? 'Atualizar Produto' : 'Criar Produto'}
      </Button>
    </form>
  );
}
