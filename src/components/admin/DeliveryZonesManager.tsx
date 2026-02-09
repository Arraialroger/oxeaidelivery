import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, CheckCircle2 } from 'lucide-react';
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
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

  const handleStartCreating = useCallback(() => {
    setIsCreatingNew(true);
    setSelectedZoneId(null);
    setNewZoneData(null);
    setGeometryUpdate(null);
  }, []);

  const handleFinishCreating = useCallback(() => {
    setIsCreatingNew(false);
    setDrawingMode(null);
    setNewZoneData(null);
    setGeometryUpdate(null);
  }, []);

  const handleZoneSelect = useCallback((id: string) => {
    setSelectedZoneId(id);
    setNewZoneData(null);
    setDrawingMode(null);
    setGeometryUpdate(null);
    setIsCreatingNew(false);
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
    if (isCreatingNew) {
      setIsCreatingNew(false);
    }
  }, [isCreatingNew]);

  // After save: keep creation mode active for continuous flow
  const handleSuccess = useCallback(() => {
    setNewZoneData(null);
    setGeometryUpdate(null);
    setSelectedZoneId(null);
    // Keep isCreatingNew and drawingMode so user can draw the next zone immediately
  }, []);

  return (
    <div className="space-y-6">
      {/* Simulator */}
      <DeliveryZoneSimulator />

      {/* Unified Map + Form Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Zonas de Entrega
              </CardTitle>
              <CardDescription>
                Visualize todas as zonas no mapa. Clique em uma para editar ou crie uma nova.
              </CardDescription>
            </div>
            {!isCreatingNew && !selectedZoneId && (
              <Button onClick={handleStartCreating} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Criar Nova Zona
              </Button>
            )}
            {isCreatingNew && (
              <Button variant="outline" onClick={handleFinishCreating} className="gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Finalizar Criação
              </Button>
            )}
          </div>
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
                isCreatingNew={isCreatingNew}
              />

              <DeliveryZoneForm
                zone={selectedZone}
                newZoneData={newZoneData}
                geometryUpdate={geometryUpdate}
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                isCreatingNew={isCreatingNew}
                onStartCreating={handleStartCreating}
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
