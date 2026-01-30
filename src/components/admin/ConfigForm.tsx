import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useUpdateRestaurantSettings } from '@/hooks/useAdminMutations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gift, Clock, Settings2 } from 'lucide-react';

export function ConfigForm() {
  const { restaurant, restaurantId, settings } = useRestaurantContext();
  const updateSettings = useUpdateRestaurantSettings(restaurantId);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    delivery_fee: '',
    is_open: true,
    schedule_mode: 'auto' as 'auto' | 'manual',
    kds_enabled: true,
    loyalty_enabled: false,
    loyalty_stamps_goal: '8',
    loyalty_min_order: '50',
    loyalty_reward_value: '50',
  });

  // Load settings from restaurant context
  useEffect(() => {
    if (settings) {
      setFormData({
        delivery_fee: settings.delivery_fee?.toString() || '0',
        is_open: settings.is_open ?? true,
        schedule_mode: settings.schedule_mode ?? 'auto',
        kds_enabled: settings.kds_enabled ?? true,
        loyalty_enabled: settings.loyalty_enabled ?? false,
        loyalty_stamps_goal: settings.loyalty_stamps_goal?.toString() || '8',
        loyalty_min_order: settings.loyalty_min_order?.toString() || '50',
        loyalty_reward_value: settings.loyalty_reward_value?.toString() || '50',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      toast({
        title: 'Erro',
        description: 'Restaurante não identificado',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateSettings.mutateAsync({
        delivery_fee: parseFloat(formData.delivery_fee) || 0,
        is_open: formData.is_open,
        schedule_mode: formData.schedule_mode,
        kds_enabled: formData.kds_enabled,
        loyalty_enabled: formData.loyalty_enabled,
        loyalty_stamps_goal: parseInt(formData.loyalty_stamps_goal) || 8,
        loyalty_min_order: parseFloat(formData.loyalty_min_order) || 50,
        loyalty_reward_value: parseFloat(formData.loyalty_reward_value) || 50,
      });

      toast({
        title: 'Configurações atualizadas!',
        description: `As configurações de ${restaurant?.name || 'seu restaurante'} foram salvas.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Restaurant indicator */}
      {restaurant && (
        <div className="bg-muted/50 p-3 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            Configurando: <span className="font-medium text-foreground">{restaurant.name}</span>
          </p>
        </div>
      )}

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

      {/* Schedule Mode Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold">Controle de Abertura</Label>
        </div>

        <RadioGroup
          value={formData.schedule_mode}
          onValueChange={(value: 'auto' | 'manual') => 
            setFormData({ ...formData, schedule_mode: value })
          }
          className="space-y-3"
        >
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <RadioGroupItem value="auto" id="mode-auto" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-auto" className="font-medium cursor-pointer">
                Modo Automático
              </Label>
              <p className="text-sm text-muted-foreground">
                Abre e fecha automaticamente conforme os horários configurados na aba "Horários"
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
            <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="mode-manual" className="font-medium cursor-pointer">
                Modo Manual
              </Label>
              <p className="text-sm text-muted-foreground">
                Você controla manualmente quando o restaurante está aberto ou fechado
              </p>
            </div>
          </div>
        </RadioGroup>

        {formData.schedule_mode === 'manual' && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="is_open">Restaurante Aberto</Label>
              <p className="text-sm text-muted-foreground">
                Permite novos pedidos
              </p>
            </div>
            <Switch
              id="is_open"
              checked={formData.is_open}
              onCheckedChange={(checked) => setFormData({ ...formData, is_open: checked })}
            />
          </div>
        )}

        {formData.schedule_mode === 'auto' && (
          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5" />
            Configure os horários de funcionamento na aba "Horários"
          </p>
        )}
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

      {/* Loyalty Program Section */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold">Programa de Fidelidade</Label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="loyalty_enabled">Ativar Programa</Label>
            <p className="text-sm text-muted-foreground">
              Recompense clientes fiéis com brindes
            </p>
          </div>
          <Switch
            id="loyalty_enabled"
            checked={formData.loyalty_enabled}
            onCheckedChange={(checked) => setFormData({ ...formData, loyalty_enabled: checked })}
          />
        </div>

        {formData.loyalty_enabled && (
          <div className="space-y-4 pl-2 border-l-2 border-primary/20">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="loyalty_stamps_goal" className="text-sm">Meta de Selos</Label>
                <Input
                  id="loyalty_stamps_goal"
                  type="number"
                  min="1"
                  value={formData.loyalty_stamps_goal}
                  onChange={(e) => setFormData({ ...formData, loyalty_stamps_goal: e.target.value })}
                  placeholder="8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="loyalty_min_order" className="text-sm">Pedido Mín. (R$)</Label>
                <Input
                  id="loyalty_min_order"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.loyalty_min_order}
                  onChange={(e) => setFormData({ ...formData, loyalty_min_order: e.target.value })}
                  placeholder="50"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="loyalty_reward_value" className="text-sm">Brinde (R$)</Label>
                <Input
                  id="loyalty_reward_value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.loyalty_reward_value}
                  onChange={(e) => setFormData({ ...formData, loyalty_reward_value: e.target.value })}
                  placeholder="50"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              ℹ️ Cliente ganha 1 selo por pedido acima de R$ {formData.loyalty_min_order || '50'}. 
              Ao completar {formData.loyalty_stamps_goal || '8'} selos, ganha R$ {formData.loyalty_reward_value || '50'} de desconto.
            </p>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
        {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar Configurações
      </Button>
    </form>
  );
}
