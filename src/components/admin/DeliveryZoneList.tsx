import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Trash2, MapPin, Circle, List } from 'lucide-react';
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
  selectedZoneId?: string | null;
  onSelect?: (id: string) => void;
  onEdit?: (zone: DeliveryZone) => void;
}

export function DeliveryZoneList({ selectedZoneId, onSelect, onEdit }: DeliveryZoneListProps) {
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
          <p className="text-sm">Use os botões "Raio" ou "Polígono" no mapa acima para criar uma.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <List className="w-4 h-4" />
          Todas as Zonas ({zones.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {zones.map((zone) => {
          const isSelected = zone.id === selectedZoneId;
          return (
            <div
              key={zone.id}
              className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border hover:bg-accent/50'
              } ${!zone.is_active ? 'opacity-50' : ''}`}
              onClick={() => onSelect?.(zone.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{zone.neighborhood}</h3>
                    <Badge variant={zone.is_polygon ? 'default' : 'secondary'} className="shrink-0 text-[10px] px-1.5 py-0">
                      {zone.is_polygon ? 'Polígono' : 'Raio'}
                    </Badge>
                  </div>

                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>
                      Taxa: {zone.delivery_fee_override !== null ? formatCurrency(zone.delivery_fee_override) : 'Padrão'}
                    </span>
                    {zone.estimated_delivery_time && (
                      <span>{zone.estimated_delivery_time} min</span>
                    )}
                    {zone.min_order_value ? (
                      <span>Mín: {formatCurrency(zone.min_order_value)}</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={zone.is_active}
                    onCheckedChange={(checked) =>
                      toggleZoneActive.mutate({ id: zone.id, is_active: checked })
                    }
                  />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover zona de entrega?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A zona "{zone.neighborhood}" será removida permanentemente.
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
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
