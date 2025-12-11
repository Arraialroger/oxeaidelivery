import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConfig } from '@/hooks/useConfig';
import { useUpdateConfig } from '@/hooks/useAdminMutations';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function ConfigForm() {
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    delivery_fee: '',
    restaurant_open: true,
    kds_enabled: true,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        delivery_fee: config.delivery_fee?.toString() || '0',
        restaurant_open: config.restaurant_open ?? true,
        kds_enabled: config.kds_enabled ?? true,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateConfig.mutateAsync({
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        restaurant_open: formData.restaurant_open,
        kds_enabled: formData.kds_enabled,
      });

      toast({
        title: 'Configurações atualizadas!',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
        <Input
          id="delivery_fee"
          type="number"
          step="0.01"
          min="0"
          value={formData.delivery_fee}
          onChange={(e) => setFormData({ ...formData, delivery_fee: e.target.value })}
          placeholder="0.00"
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="restaurant_open">Restaurante Aberto</Label>
          <p className="text-sm text-muted-foreground">
            Permite novos pedidos
          </p>
        </div>
        <Switch
          id="restaurant_open"
          checked={formData.restaurant_open}
          onCheckedChange={(checked) => setFormData({ ...formData, restaurant_open: checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="kds_enabled">KDS Ativo</Label>
          <p className="text-sm text-muted-foreground">
            Sistema de display da cozinha
          </p>
        </div>
        <Switch
          id="kds_enabled"
          checked={formData.kds_enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, kds_enabled: checked })}
        />
      </div>

      <Button type="submit" className="w-full" disabled={updateConfig.isPending}>
        {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar Configurações
      </Button>
    </form>
  );
}
