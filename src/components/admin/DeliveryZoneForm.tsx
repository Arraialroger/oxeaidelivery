import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useDeliveryZonesMutations } from '@/hooks/useDeliveryZonesMutations';
import type { DeliveryZone } from '@/hooks/useDeliveryZones';
import type { NewZoneData } from './DeliveryZoneMap';
import { Save, X, MapPin } from 'lucide-react';

const formSchema = z.object({
  neighborhood: z.string().min(1, 'Nome da zona é obrigatório'),
  delivery_fee_override: z.coerce.number().min(0).nullable(),
  estimated_delivery_time: z.coerce.number().min(1).nullable(),
  min_order_value: z.coerce.number().min(0).nullable(),
  free_delivery_above: z.coerce.number().min(0).nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryZoneFormProps {
  /** Existing zone being edited */
  zone?: DeliveryZone | null;
  /** Geometry data for a new zone drawn on map */
  newZoneData?: NewZoneData | null;
  /** Updated geometry for existing zone */
  geometryUpdate?: Partial<NewZoneData> | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export function DeliveryZoneForm({ zone, newZoneData, geometryUpdate, onCancel, onSuccess }: DeliveryZoneFormProps) {
  const { createZone, updateZone } = useDeliveryZonesMutations();
  const isEditing = !!zone;

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

  // Reset form when zone changes
  useEffect(() => {
    if (zone) {
      form.reset({
        neighborhood: zone.neighborhood,
        delivery_fee_override: zone.delivery_fee_override ?? null,
        estimated_delivery_time: zone.estimated_delivery_time ?? null,
        min_order_value: zone.min_order_value ?? null,
        free_delivery_above: zone.free_delivery_above ?? null,
      });
    } else if (!newZoneData) {
      form.reset({
        neighborhood: '',
        delivery_fee_override: null,
        estimated_delivery_time: null,
        min_order_value: null,
        free_delivery_above: null,
      });
    }
  }, [zone, newZoneData, form]);

  const handleSubmit = async (data: FormData) => {
    try {
      if (isEditing && zone) {
        // Build update with geometry changes if any
        const updateData: Record<string, unknown> = {
          id: zone.id,
          neighborhood: data.neighborhood,
          delivery_fee_override: data.delivery_fee_override,
          estimated_delivery_time: data.estimated_delivery_time,
          min_order_value: data.min_order_value,
          free_delivery_above: data.free_delivery_above,
        };

        if (geometryUpdate) {
          if (geometryUpdate.type === 'polygon' && geometryUpdate.polygonCoords) {
            updateData.polygon_coords = geometryUpdate.polygonCoords;
          }
          if (geometryUpdate.type === 'radius') {
            if (geometryUpdate.center) {
              updateData.center_lat = geometryUpdate.center.lat;
              updateData.center_lng = geometryUpdate.center.lng;
            }
            if (geometryUpdate.radius !== undefined) {
              updateData.radius_km = geometryUpdate.radius;
            }
          }
        }

        await updateZone.mutateAsync(updateData as any);
      } else if (newZoneData) {
        const isPolygon = newZoneData.type === 'polygon';
        await createZone.mutateAsync({
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
                polygon_coords: newZoneData.polygonCoords || [],
                center_lat: null,
                center_lng: null,
                radius_km: null,
              }
            : {
                polygon_coords: null,
                center_lat: newZoneData.center?.lat || null,
                center_lng: newZoneData.center?.lng || null,
                radius_km: newZoneData.radius || 3,
              }),
        });
      }
      onSuccess();
    } catch {
      // Error handled by mutation
    }
  };

  const isPending = createZone.isPending || updateZone.isPending;

  // Empty state
  if (!zone && !newZoneData) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Selecione uma zona no mapa ou lista</p>
          <p className="text-sm mt-1">Ou use os botões "Raio" / "Polígono" para desenhar uma nova zona.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="delivery_fee_override"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa (R$)</FormLabel>
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
                    <FormLabel>Tempo (min)</FormLabel>
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
                    <FormLabel>Mín. (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sem mín."
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
                    <FormLabel>Grátis acima (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Sem"
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

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
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
