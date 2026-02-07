import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { DeliveryZoneMap } from './DeliveryZoneMap';
import { useDeliveryZonesMutations } from '@/hooks/useDeliveryZonesMutations';
import type { DeliveryZone } from '@/hooks/useDeliveryZones';
import { Circle, MapPin, Save, X } from 'lucide-react';

const formSchema = z.object({
  neighborhood: z.string().min(1, 'Nome da zona é obrigatório'),
  delivery_fee_override: z.coerce.number().min(0).nullable(),
  estimated_delivery_time: z.coerce.number().min(1).nullable(),
  min_order_value: z.coerce.number().min(0).nullable(),
  free_delivery_above: z.coerce.number().min(0).nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryZoneFormProps {
  zone?: DeliveryZone | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function DeliveryZoneForm({ zone, onCancel, onSuccess }: DeliveryZoneFormProps) {
  const { createZone, updateZone } = useDeliveryZonesMutations();
  const isEditing = !!zone;

  const [zoneType, setZoneType] = useState<'radius' | 'polygon'>(
    zone?.is_polygon ? 'polygon' : 'radius'
  );
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    zone?.center_lat && zone?.center_lng
      ? { lat: zone.center_lat, lng: zone.center_lng }
      : null
  );
  const [radius, setRadius] = useState(zone?.radius_km || 3);
  const [polygonCoords, setPolygonCoords] = useState<Array<{ lat: number; lng: number }>>(
    zone?.polygon_coords || []
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      neighborhood: zone?.neighborhood || '',
      delivery_fee_override: zone?.delivery_fee_override ?? null,
      estimated_delivery_time: zone?.estimated_delivery_time ?? null,
      min_order_value: zone?.min_order_value ?? null,
      free_delivery_above: zone?.free_delivery_above ?? null,
    },
  });

  const handleSubmit = async (data: FormData) => {
    const isPolygon = zoneType === 'polygon';
    
    // Validate based on zone type
    if (isPolygon && polygonCoords.length < 3) {
      form.setError('neighborhood', { message: 'Desenhe a área no mapa' });
      return;
    }
    
    if (!isPolygon && !center) {
      form.setError('neighborhood', { message: 'Defina o centro no mapa' });
      return;
    }

    const zoneData = {
      neighborhood: data.neighborhood,
      delivery_fee_override: data.delivery_fee_override,
      estimated_delivery_time: data.estimated_delivery_time,
      min_order_value: data.min_order_value,
      free_delivery_above: data.free_delivery_above,
      is_polygon: isPolygon,
      is_active: true,
      cep_prefix: null,
      ...(isPolygon
        ? {
            polygon_coords: polygonCoords,
            center_lat: null,
            center_lng: null,
            radius_km: null,
          }
        : {
            polygon_coords: null,
            center_lat: center?.lat || null,
            center_lng: center?.lng || null,
            radius_km: radius,
          }),
    };

    try {
      if (isEditing && zone) {
        await updateZone.mutateAsync({ id: zone.id, ...zoneData });
      } else {
        await createZone.mutateAsync(zoneData);
      }
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isPending = createZone.isPending || updateZone.isPending;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle>{isEditing ? 'Editar Zona' : 'Nova Zona de Entrega'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da zona *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Centro, Praia do Espelho..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Label className="mb-2 block">Tipo de área</Label>
              <Tabs value={zoneType} onValueChange={(v) => setZoneType(v as 'radius' | 'polygon')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="radius" className="gap-2">
                    <Circle className="w-4 h-4" />
                    Raio
                  </TabsTrigger>
                  <TabsTrigger value="polygon" className="gap-2">
                    <MapPin className="w-4 h-4" />
                    Polígono
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <DeliveryZoneMap
              mode={zoneType}
              center={center}
              radius={radius}
              polygonCoords={polygonCoords}
              onCenterChange={setCenter}
              onRadiusChange={setRadius}
              onPolygonChange={setPolygonCoords}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="delivery_fee_override"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de entrega (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Padrão"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_delivery_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tempo estimado (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 30"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_order_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pedido mínimo (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sem mínimo"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="free_delivery_above"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frete grátis acima de (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sem frete grátis"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isEditing ? 'Salvar' : 'Criar Zona'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
