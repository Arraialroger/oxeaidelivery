import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useComboSlots } from '@/hooks/useComboSlots';
import { useCreateComboSlot, useUpdateComboSlot, useDeleteComboSlot } from '@/hooks/useComboMutations';
import { useCategories } from '@/hooks/useCategories';
import { ComboSlotProductsManager } from './ComboSlotProductsManager';
import { Plus, Trash2, ChevronDown, Loader2, Package } from 'lucide-react';
import type { Product } from '@/types';

interface ComboSlotsManagerProps {
  combo: Product;
}

export function ComboSlotsManager({ combo }: ComboSlotsManagerProps) {
  const { data: slots, isLoading } = useComboSlots(combo.id);
  const { data: categories } = useCategories();
  const createSlot = useCreateComboSlot();
  const updateSlot = useUpdateComboSlot();
  const deleteSlot = useDeleteComboSlot();

  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [newSlot, setNewSlot] = useState({
    label: '',
    category_id: '',
    quantity: '1',
  });

  const handleCreateSlot = async () => {
    if (!newSlot.label) return;

    await createSlot.mutateAsync({
      combo_id: combo.id,
      slot_label: newSlot.label,
      category_id: newSlot.category_id || null,
      quantity: parseInt(newSlot.quantity) || 1,
      slot_order: (slots?.length || 0),
    });

    setNewSlot({ label: '', category_id: '', quantity: '1' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="w-4 h-4" />
          Slots do Combo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Slots */}
        {slots?.map((slot) => (
          <Collapsible
            key={slot.id}
            open={expandedSlotId === slot.id}
            onOpenChange={(open) => setExpandedSlotId(open ? slot.id : null)}
          >
            <div className="border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-1 h-auto">
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedSlotId === slot.id ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <div className="flex-1">
                  <span className="font-medium text-sm">{slot.slot_label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (Qtd: {slot.quantity})
                    {categories?.find(c => c.id === slot.category_id)?.name && 
                      ` • ${categories?.find(c => c.id === slot.category_id)?.name}`
                    }
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deleteSlot.mutate({ id: slot.id, combo_id: combo.id })}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <CollapsibleContent className="pt-3">
                <ComboSlotProductsManager slot={slot} />
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}

        {slots?.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Nenhum slot configurado
          </p>
        )}

        {/* Add New Slot */}
        <div className="border-t pt-4 space-y-3">
          <Label className="text-xs font-medium">Adicionar Slot</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="Nome do slot"
              value={newSlot.label}
              onChange={(e) => setNewSlot({ ...newSlot, label: e.target.value })}
              className="col-span-2 h-9"
            />
            <Input
              type="number"
              min="1"
              placeholder="Qtd"
              value={newSlot.quantity}
              onChange={(e) => setNewSlot({ ...newSlot, quantity: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={newSlot.category_id}
              onValueChange={(value) => setNewSlot({ ...newSlot, category_id: value })}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Categoria (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas categorias</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreateSlot}
              disabled={!newSlot.label || createSlot.isPending}
              className="h-9"
            >
              <Plus className="w-4 h-4 mr-1" />
              Criar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
