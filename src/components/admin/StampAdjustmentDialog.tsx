import { useState } from 'react';
import { Plus, Minus, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useStampAdjustment } from '@/hooks/useStampAdjustment';
import { useToast } from '@/hooks/use-toast';

interface StampAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string | null;
    phone: string;
    stamps_count: number;
  } | null;
}

export default function StampAdjustmentDialog({ open, onOpenChange, customer }: StampAdjustmentDialogProps) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [amount, setAmount] = useState('1');
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const stampAdjustment = useStampAdjustment();

  const resetForm = () => {
    setMode('add');
    setAmount('1');
    setReason('');
  };

  const handleSubmit = async () => {
    if (!customer) return;
    const numAmount = parseInt(amount);
    if (!numAmount || numAmount <= 0) {
      toast({ title: 'Quantidade inválida', variant: 'destructive' });
      return;
    }
    if (!reason.trim()) {
      toast({ title: 'Informe o motivo do ajuste', variant: 'destructive' });
      return;
    }

    const finalAmount = mode === 'add' ? numAmount : -numAmount;

    try {
      const { newBalance } = await stampAdjustment.mutateAsync({
        customerId: customer.id,
        amount: finalAmount,
        reason: reason.trim(),
        currentStamps: customer.stamps_count,
      });
      toast({
        title: 'Selos ajustados',
        description: `Novo saldo: ${newBalance} selos`,
      });
      resetForm();
      onOpenChange(false);
    } catch {
      toast({ title: 'Erro ao ajustar selos', variant: 'destructive' });
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stamp className="w-5 h-5" />
            Ajustar Selos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{customer.name || customer.phone}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Saldo atual: <span className="font-bold text-foreground">{customer.stamps_count} selos</span>
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'add' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setMode('add')}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </Button>
            <Button
              type="button"
              variant={mode === 'remove' ? 'destructive' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setMode('remove')}
            >
              <Minus className="w-4 h-4" /> Remover
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Quantidade de selos</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo do ajuste *</Label>
            <Textarea
              placeholder="Ex: Correção de selo não creditado no pedido #123"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          <div className="rounded-md bg-muted p-3 text-sm">
            Novo saldo: <span className="font-bold">
              {Math.max(0, customer.stamps_count + (mode === 'add' ? parseInt(amount) || 0 : -(parseInt(amount) || 0)))} selos
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={stampAdjustment.isPending}>
            {stampAdjustment.isPending ? 'Salvando...' : 'Confirmar Ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
