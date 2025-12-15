import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react';
import { useProductOptions } from '@/hooks/useProductOptions';
import { useDeleteProductOption } from '@/hooks/useProductOptionsMutations';
import { ProductOptionForm } from './ProductOptionForm';
import { useToast } from '@/hooks/use-toast';
import type { Product, ProductOption } from '@/types';

interface ProductOptionsManagerProps {
  product: Product;
}

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  mandatory: { label: 'Obrigatório', variant: 'default' },
  addon: { label: 'Adicional', variant: 'secondary' },
  removal: { label: 'Remoção', variant: 'destructive' },
  swap: { label: 'Troca', variant: 'outline' },
};

export function ProductOptionsManager({ product }: ProductOptionsManagerProps) {
  const { toast } = useToast();
  const { data: options = [], isLoading } = useProductOptions(product.id);
  const deleteOption = useDeleteProductOption();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);

  const handleEdit = (option: ProductOption) => {
    setEditingOption(option);
    setDialogOpen(true);
  };

  const handleDelete = async (option: ProductOption) => {
    if (!confirm(`Excluir opção "${option.name}"?`)) return;
    
    try {
      await deleteOption.mutateAsync({ id: option.id, productId: product.id });
      toast({ title: 'Opção excluída com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao excluir opção', variant: 'destructive' });
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingOption(null);
  };

  // Group options by group_name
  const groupedOptions = options.reduce((acc, option) => {
    const group = option.group_name || 'Sem grupo';
    if (!acc[group]) acc[group] = [];
    acc[group].push(option);
    return acc;
  }, {} as Record<string, ProductOption[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Opções de {product.name}
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) handleDialogClose();
            else setDialogOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Opção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingOption ? 'Editar Opção' : 'Nova Opção'}
                </DialogTitle>
              </DialogHeader>
              <ProductOptionForm
                productId={product.id}
                option={editingOption || undefined}
                onSuccess={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma opção cadastrada. Adicione adicionais, escolhas obrigatórias ou remoções.
          </p>
        ) : (
          Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <div key={group} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{group}</h4>
              <div className="space-y-2">
                {groupOptions.map((option) => {
                  const typeInfo = typeLabels[option.type] || typeLabels.addon;
                  return (
                    <div
                      key={option.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium text-sm">{option.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={typeInfo.variant} className="text-xs">
                              {typeInfo.label}
                            </Badge>
                            {option.price !== null && option.price !== 0 && (
                              <span className="text-xs text-muted-foreground">
                                {option.type === 'removal' ? '-' : '+'}R$ {option.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(option)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(option)}
                          disabled={deleteOption.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
