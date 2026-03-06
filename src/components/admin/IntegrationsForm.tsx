import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useUpdateRestaurantSettings } from '@/hooks/useAdminMutations';
import { toast } from 'sonner';
import { Loader2, BarChart3, Facebook } from 'lucide-react';

export function IntegrationsForm() {
  const { restaurant, restaurantId, settings } = useRestaurantContext();
  const updateSettings = useUpdateRestaurantSettings(restaurantId);

  const [fbPixelId, setFbPixelId] = useState('');
  const [gtagId, setGtagId] = useState('');

  useEffect(() => {
    if (settings) {
      setFbPixelId(settings.fb_pixel_id || '');
      setGtagId(settings.gtag_id || '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restaurantId) {
      toast.error('Restaurante não identificado');
      return;
    }

    // Validate formats
    if (fbPixelId && !/^\d{10,20}$/.test(fbPixelId.trim())) {
      toast.error('Facebook Pixel ID deve conter apenas números (10-20 dígitos)');
      return;
    }

    if (gtagId && !/^(G-|GTM-|UA-)[A-Z0-9-]+$/i.test(gtagId.trim())) {
      toast.error('Google Tag ID inválido. Use o formato G-XXXXXXXXXX, GTM-XXXXXXX ou UA-XXXXXXXXX-X');
      return;
    }

    try {
      await updateSettings.mutateAsync({
        fb_pixel_id: fbPixelId.trim() || undefined,
        gtag_id: gtagId.trim() || undefined,
      });

      toast.success('Integrações salvas com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar integrações');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Facebook Pixel */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Facebook className="w-4 h-4 text-blue-600" />
          <Label className="font-medium">Facebook Pixel</Label>
        </div>
        <Input
          placeholder="Ex: 123456789012345"
          value={fbPixelId}
          onChange={(e) => setFbPixelId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Encontre seu Pixel ID em: Meta Business Suite → Eventos → Pixels. 
          Permite rastrear conversões e criar públicos para anúncios.
        </p>
      </div>

      {/* Google Analytics / GTM */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-yellow-600" />
          <Label className="font-medium">Google Analytics / GTM</Label>
        </div>
        <Input
          placeholder="Ex: G-XXXXXXXXXX ou GTM-XXXXXXX"
          value={gtagId}
          onChange={(e) => setGtagId(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Cole seu ID do Google Analytics 4 (G-...) ou Google Tag Manager (GTM-...).
          Permite analisar o comportamento dos clientes no cardápio.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
        {updateSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar Integrações
      </Button>
    </form>
  );
}
