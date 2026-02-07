import { useState, useCallback, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Map, Edit3, AlertTriangle } from 'lucide-react';
import { AddressMapPicker } from './AddressMapPicker';
import { AddressSearchBox } from './AddressSearchBox';
import { AddressManualForm, type ManualAddressData } from './AddressManualForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

type AddressMode = 'map' | 'manual';

interface AddressLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
  addressComponents?: google.maps.GeocoderAddressComponent[];
}

interface AddressSectionProps {
  onLocationSelect: (location: AddressLocation) => void;
  onManualDataChange: (data: ManualAddressData) => void;
  manualData: ManualAddressData;
  manualErrors?: Partial<Record<keyof ManualAddressData, string>>;
  selectedLocation?: { lat: number; lng: number } | null;
  onModeChange?: (mode: AddressMode) => void;
  initialMode?: AddressMode;
}

export function AddressSection({
  onLocationSelect,
  onManualDataChange,
  manualData,
  manualErrors,
  selectedLocation,
  onModeChange,
  initialMode = 'map',
}: AddressSectionProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [mode, setMode] = useState<AddressMode>(initialMode);
  const [mapFailed, setMapFailed] = useState(false);

  // Auto-switch to manual if Google Maps fails to load
  useEffect(() => {
    if (loadError) {
      setMapFailed(true);
      setMode('manual');
      onModeChange?.('manual');
    }
  }, [loadError, onModeChange]);

  const handleModeChange = useCallback(
    (newMode: string) => {
      const addressMode = newMode as AddressMode;
      setMode(addressMode);
      onModeChange?.(addressMode);
    },
    [onModeChange]
  );

  const handleLocationSelect = useCallback(
    (location: AddressLocation) => {
      onLocationSelect(location);
    },
    [onLocationSelect]
  );

  // If map completely failed, show only manual form
  if (mapFailed) {
    return (
      <div className="space-y-4">
        <Alert variant="default" className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-sm">
            O mapa não está disponível no momento. Por favor, preencha o endereço manualmente.
          </AlertDescription>
        </Alert>

        <AddressManualForm
          data={manualData}
          onChange={onManualDataChange}
          errors={manualErrors}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="map" className="gap-2" disabled={!isLoaded && !loadError}>
            <Map className="w-4 h-4" />
            Mapa
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <Edit3 className="w-4 h-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4 space-y-4">
          {/* Search Box */}
          <AddressSearchBox
            onPlaceSelect={handleLocationSelect}
            placeholder="Busque seu endereço..."
          />

          {/* Map Picker */}
          <AddressMapPicker
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
          />

          {/* Manual fields for complement/reference even in map mode */}
          {selectedLocation && (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="map-complement" className="text-sm font-medium">
                    Complemento
                  </label>
                  <input
                    id="map-complement"
                    type="text"
                    value={manualData.complement}
                    onChange={(e) =>
                      onManualDataChange({ ...manualData, complement: e.target.value })
                    }
                    placeholder="Apto, bloco..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="map-reference" className="text-sm font-medium">
                    Referência *
                  </label>
                  <input
                    id="map-reference"
                    type="text"
                    value={manualData.reference}
                    onChange={(e) =>
                      onManualDataChange({ ...manualData, reference: e.target.value })
                    }
                    placeholder="Próximo a..."
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      manualErrors?.reference ? 'border-destructive' : 'border-input'
                    }`}
                  />
                  {manualErrors?.reference && (
                    <p className="text-xs text-destructive">{manualErrors.reference}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <AddressManualForm
            data={manualData}
            onChange={onManualDataChange}
            errors={manualErrors}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
