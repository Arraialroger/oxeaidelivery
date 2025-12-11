import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProductOption, useUpdateProductOption } from '@/hooks/useProductOptionsMutations';
import { useToast } from '@/hooks/use-toast';
import type { ProductOption } from '@/types';

interface ProductOptionFormProps {
  productId: string;
  option?: ProductOption;
  onSuccess?: () => void;
}

const optionTypes = [
  { value: 'mandatory', label: 'Obrigatório' },
  { value: 'addon', label: 'Adicional' },
  { value: 'removal', label: 'Remoção' },
];

export function ProductOptionForm({ productId, option, onSuccess }: ProductOptionFormProps) {
  const { toast } = useToast();
  const createOption = useCreateProductOption();
  const updateOption = useUpdateProductOption();
  
  const isEditing = !!option;
  
  const [name, setName] = useState(option?.name || '');
  const [type, setType] = useState(option?.type || 'addon');
  const [groupName, setGroupName] = useState(option?.group_name || '');
  const [price, setPrice] = useState(option?.price?.toString() || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const optionData = {
      product_id: productId,
      name: name.trim(),
      type,
      group_name: groupName.trim() || null,
      price: parseFloat(price) || 0,
    };

    try {
      if (isEditing) {
        await updateOption.mutateAsync({ id: option.id, ...optionData });
        toast({ title: 'Opção atualizada com sucesso!' });
      } else {
        await createOption.mutateAsync(optionData);
        toast({ title: 'Opção criada com sucesso!' });
        // Reset form
        setName('');
        setType('addon');
        setGroupName('');
        setPrice('0');
      }
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Erro ao salvar opção', variant: 'destructive' });
    }
  };

  const isPending = createOption.isPending || updateOption.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Bacon extra"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {optionTypes.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupName">Grupo (opcional)</Label>
        <Input
          id="groupName"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Ex: Tamanho, Molho"
        />
        <p className="text-xs text-muted-foreground">
          Agrupe opções relacionadas (ex: todos os tamanhos)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price">Preço (R$)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0.00"
        />
        <p className="text-xs text-muted-foreground">
          {type === 'removal' ? 'Valor a descontar' : 'Valor a adicionar'}
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Salvando...' : isEditing ? 'Atualizar Opção' : 'Criar Opção'}
      </Button>
    </form>
  );
}
