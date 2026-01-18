import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConfig } from '@/hooks/useConfig';
import { useUpdateConfig } from '@/hooks/useAdminMutations';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Image as ImageIcon, Gift } from 'lucide-react';

export function ConfigForm() {
  const { data: config } = useConfig();
  const updateConfig = useUpdateConfig();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    delivery_fee: '',
    restaurant_open: true,
    kds_enabled: true,
    hero_banner_url: '',
    loyalty_enabled: false,
    loyalty_stamps_goal: '8',
    loyalty_min_order: '50',
    loyalty_reward_value: '50',
  });

  useEffect(() => {
    if (config) {
      setFormData({
        delivery_fee: config.delivery_fee?.toString() || '0',
        restaurant_open: config.restaurant_open ?? true,
        kds_enabled: config.kds_enabled ?? true,
        hero_banner_url: config.hero_banner_url || '',
        loyalty_enabled: config.loyalty_enabled ?? false,
        loyalty_stamps_goal: config.loyalty_stamps_goal?.toString() || '8',
        loyalty_min_order: config.loyalty_min_order?.toString() || '50',
        loyalty_reward_value: config.loyalty_reward_value?.toString() || '50',
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
        hero_banner_url: formData.hero_banner_url || null,
        loyalty_enabled: formData.loyalty_enabled,
        loyalty_stamps_goal: parseInt(formData.loyalty_stamps_goal) || 8,
        loyalty_min_order: parseFloat(formData.loyalty_min_order) || 50,
        loyalty_reward_value: parseFloat(formData.loyalty_reward_value) || 50,
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

      {/* Banner da Home Section */}
      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          <Label className="text-base font-semibold">Banner da Home</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          URL da imagem do banner promocional exibido no topo da página inicial.
        </p>
        <Input
          id="hero_banner_url"
          type="url"
          value={formData.hero_banner_url}
          onChange={(e) => setFormData({ ...formData, hero_banner_url: e.target.value })}
          placeholder="https://exemplo.com/banner.jpg ou /images/banner.jpeg"
        />
        {formData.hero_banner_url && (
          <div className="mt-2 rounded-lg overflow-hidden border">
            <img 
              src={formData.hero_banner_url} 
              alt="Preview do banner" 
              className="w-full h-auto object-cover max-h-40"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
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

      <Button type="submit" className="w-full" disabled={updateConfig.isPending}>
        {updateConfig.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar Configurações
      </Button>
    </form>
  );
}
