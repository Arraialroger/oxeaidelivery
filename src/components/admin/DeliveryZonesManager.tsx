import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { DeliveryZoneMap, type NewZoneData } from './DeliveryZoneMap';
import { DeliveryZoneForm } from './DeliveryZoneForm';
import { DeliveryZoneList } from './DeliveryZoneList';
import { DeliveryZoneSimulator } from './DeliveryZoneSimulator';
import { useDeliveryZones, type DeliveryZone } from '@/hooks/useDeliveryZones';

export function DeliveryZonesManager() {
  const { data: zones = [], isLoading } = useDeliveryZones({ includeInactive: true });

  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [newZoneData, setNewZoneData] = useState<NewZoneData | null>(null);
  const [drawingMode, setDrawingMode] = useState<'radius' | 'polygon' | null>(null);
  const [geometryUpdate, setGeometryUpdate] = useState<Partial<NewZoneData> | null>(null);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

  const handleZoneSelect = useCallback((id: string) => {
    setSelectedZoneId(id);
    setNewZoneData(null);
    setDrawingMode(null);
    setGeometryUpdate(null);
  }, []);

  const handleNewZoneDrawn = useCallback((data: NewZoneData) => {
    setNewZoneData(data);
    setSelectedZoneId(null);
    setGeometryUpdate(null);
  }, []);

  const handleZoneGeometryUpdate = useCallback((data: { id: string } & Partial<NewZoneData>) => {
    setGeometryUpdate(data);
  }, []);

  const handleDrawingModeChange = useCallback((mode: 'radius' | 'polygon' | null) => {
    setDrawingMode(mode);
    if (mode) {
      setSelectedZoneId(null);
      setNewZoneData(null);
      setGeometryUpdate(null);
    }
  }, []);

  const handleCancel = useCallback(() => {
    setSelectedZoneId(null);
    setNewZoneData(null);
    setDrawingMode(null);
    setGeometryUpdate(null);
  }, []);

  const handleSuccess = useCallback(() => {
    setSelectedZoneId(null);
    setNewZoneData(null);
    setDrawingMode(null);
    setGeometryUpdate(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Simulator */}
      <DeliveryZoneSimulator />

      {/* Unified Map + Form Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Zonas de Entrega
          </CardTitle>
          <CardDescription>
            Visualize todas as zonas no mapa. Clique em uma para editar ou desenhe uma nova.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              <DeliveryZoneMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onZoneSelect={handleZoneSelect}
                onNewZoneDrawn={handleNewZoneDrawn}
                onZoneGeometryUpdate={handleZoneGeometryUpdate}
                drawingMode={drawingMode}
                onDrawingModeChange={handleDrawingModeChange}
              />

              <DeliveryZoneForm
                zone={selectedZone}
                newZoneData={newZoneData}
                geometryUpdate={geometryUpdate}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Zones List */}
      <DeliveryZoneList
        selectedZoneId={selectedZoneId}
        onSelect={handleZoneSelect}
      />
    </div>
  );
}
