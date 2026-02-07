import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Trash2, MapPin, Circle } from 'lucide-react';
import { useDeliveryZones, type DeliveryZone } from '@/hooks/useDeliveryZones';
import { useDeliveryZonesMutations } from '@/hooks/useDeliveryZonesMutations';
import { formatCurrency } from '@/lib/formatUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface DeliveryZoneListProps {
  onEdit: (zone: DeliveryZone) => void;
}

export function DeliveryZoneList({ onEdit }: DeliveryZoneListProps) {
  // Include inactive zones in admin panel
  const { data: zones = [], isLoading } = useDeliveryZones({ includeInactive: true });
  const { deleteZone, toggleZoneActive } = useDeliveryZonesMutations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma zona de entrega configurada.</p>
          <p className="text-sm">Clique em "Nova Zona" para começar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {zones.map((zone) => (
        <Card key={zone.id} className={!zone.is_active ? 'opacity-60' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium truncate">{zone.neighborhood}</h3>
                  <Badge variant={zone.is_polygon ? 'default' : 'secondary'} className="shrink-0">
                    {zone.is_polygon ? (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        Polígono
                      </>
                    ) : (
                      <>
                        <Circle className="w-3 h-3 mr-1" />
                        Raio
                      </>
                    )}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-muted-foreground">
                  <div>
                    <span className="block text-xs uppercase tracking-wide">Taxa</span>
                    <span className="font-medium text-foreground">
                      {zone.delivery_fee_override !== null
                        ? formatCurrency(zone.delivery_fee_override)
                        : 'Padrão'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-xs uppercase tracking-wide">Tempo</span>
                    <span className="font-medium text-foreground">
                      {zone.estimated_delivery_time ? `${zone.estimated_delivery_time} min` : '-'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-xs uppercase tracking-wide">Mín. Pedido</span>
                    <span className="font-medium text-foreground">
                      {zone.min_order_value ? formatCurrency(zone.min_order_value) : '-'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="block text-xs uppercase tracking-wide">Frete Grátis</span>
                    <span className="font-medium text-foreground">
                      {zone.free_delivery_above ? `> ${formatCurrency(zone.free_delivery_above)}` : '-'}
                    </span>
                  </div>
                </div>
                
                {!zone.is_polygon && zone.radius_km && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Raio: {zone.radius_km} km
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={zone.is_active}
                  onCheckedChange={(checked) =>
                    toggleZoneActive.mutate({ id: zone.id, is_active: checked })
                  }
                />
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(zone)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover zona de entrega?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A zona "{zone.neighborhood}" será removida permanentemente.
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteZone.mutate(zone.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
