import { useState, useCallback, useEffect, ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Map, Edit3, AlertTriangle } from 'lucide-react';
import { AddressMapPicker } from './AddressMapPicker';
import { AddressSearchBox } from './AddressSearchBox';
import { AddressManualForm, type ManualAddressData } from './AddressManualForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  /** Content to show after map (e.g., zone indicator, detected address) */
  mapExtraContent?: ReactNode;
  /** Current formatted address for search box */
  formattedAddress?: string;
  /** Callback when formatted address changes */
  onFormattedAddressChange?: (value: string) => void;
}

export function AddressSection({
  onLocationSelect,
  onManualDataChange,
  manualData,
  manualErrors,
  selectedLocation,
  onModeChange,
  initialMode = 'map',
  mapExtraContent,
  formattedAddress,
  onFormattedAddressChange,
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
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
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
            Digitar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4 space-y-4">
          {/* Search Box */}
          <AddressSearchBox
            onPlaceSelect={handleLocationSelect}
            placeholder="Busque seu endereço..."
            value={formattedAddress}
            onChange={onFormattedAddressChange}
          />

          {/* Map Picker */}
          <AddressMapPicker
            onLocationSelect={handleLocationSelect}
            selectedLocation={selectedLocation}
          />

          {/* Extra content (zone indicator, detected address, etc.) */}
          {mapExtraContent}

          {/* Neighborhood, complement and reference fields in map mode */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="neighborhood-map">Bairro *</Label>
              <Input
                id="neighborhood-map"
                value={manualData.neighborhood}
                onChange={(e) =>
                  onManualDataChange({ ...manualData, neighborhood: e.target.value })
                }
                placeholder="Nome do bairro"
                className={`mt-1 ${manualErrors?.neighborhood ? 'border-destructive' : ''}`}
              />
              {manualErrors?.neighborhood && (
                <p className="text-xs text-destructive mt-1">{manualErrors.neighborhood}</p>
              )}
            </div>
            <div>
              <Label htmlFor="complement-map">Complemento</Label>
              <Input
                id="complement-map"
                value={manualData.complement}
                onChange={(e) =>
                  onManualDataChange({ ...manualData, complement: e.target.value })
                }
                placeholder="Apto, bloco, casa..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="reference-map">Ponto de Referência *</Label>
              <Input
                id="reference-map"
                value={manualData.reference}
                onChange={(e) =>
                  onManualDataChange({ ...manualData, reference: e.target.value })
                }
                placeholder="Ex: Próximo ao mercado, portão azul..."
                className={`mt-1 ${manualErrors?.reference ? 'border-destructive' : ''}`}
              />
              {manualErrors?.reference && (
                <p className="text-xs text-destructive mt-1">{manualErrors.reference}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <AddressManualForm
            data={manualData}
            onChange={onManualDataChange}
            errors={manualErrors}
          />
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Digite o endereço completo para entrega
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
