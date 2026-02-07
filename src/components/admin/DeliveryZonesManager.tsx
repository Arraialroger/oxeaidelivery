import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, MapPin } from 'lucide-react';
import { DeliveryZoneList } from './DeliveryZoneList';
import { DeliveryZoneForm } from './DeliveryZoneForm';
import type { DeliveryZone } from '@/hooks/useDeliveryZones';

export function DeliveryZonesManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingZone(null);
  };

  const handleSuccess = () => {
    setIsFormOpen(false);
    setEditingZone(null);
  };

  if (isFormOpen) {
    return (
      <DeliveryZoneForm
        zone={editingZone}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Zonas de Entrega
              </CardTitle>
              <CardDescription className="mt-1">
                Configure as áreas de entrega, taxas e regras por região
              </CardDescription>
            </div>
            <Button onClick={() => setIsFormOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Zona
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DeliveryZoneList onEdit={handleEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
