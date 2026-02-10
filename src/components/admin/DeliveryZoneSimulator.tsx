import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, CheckCircle, XCircle, Clock, DollarSign, Navigation } from 'lucide-react';
import { useDeliveryZones, checkDeliveryZone } from '@/hooks/useDeliveryZones';
import { useGoogleMaps, useGeolocation } from '@/hooks/useGoogleMaps';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { formatCurrency } from '@/lib/formatUtils';

interface SimulationResult {
  isValid: boolean;
  zoneName: string | null;
  deliveryFee: number;
  estimatedTime: number | null;
  minOrderValue: number;
  freeDeliveryAbove: number | null;
  distanceToNearest: number | null;
  nearestZoneName: string | null;
}

export function DeliveryZoneSimulator() {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const { data: zones = [] } = useDeliveryZones({ includeInactive: false });
  const { isLoaded, google } = useGoogleMaps({ libraries: ['places', 'drawing'] });
  const { requestLocation, coords: geoCoords, isLoading: isGeoLoading } = useGeolocation();
  const { settings } = useRestaurantContext();

  // Initialize autocomplete
  useEffect(() => {
    if (!isLoaded || !google || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'br' },
      fields: ['formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setAddress(place.formatted_address || '');
        setCoords({ lat, lng });
        runSimulation({ lat, lng });
      }
    });

    autocompleteRef.current = autocomplete;
  }, [isLoaded, google]);

  // Handle geolocation result
  useEffect(() => {
    if (geoCoords) {
      setCoords(geoCoords);
      setAddress(`${geoCoords.lat.toFixed(6)}, ${geoCoords.lng.toFixed(6)}`);
      runSimulation(geoCoords);
    }
  }, [geoCoords]);

  const runSimulation = useCallback((testCoords: { lat: number; lng: number }) => {
    setIsSearching(true);
    
    const defaultFee = settings?.delivery_fee ?? 0;
    const checkResult = checkDeliveryZone(testCoords, zones, defaultFee);
    
    setResult({
      isValid: checkResult.isValid,
      zoneName: checkResult.zone?.neighborhood || null,
      deliveryFee: checkResult.deliveryFee,
      estimatedTime: checkResult.estimatedTime,
      minOrderValue: checkResult.minOrderValue,
      freeDeliveryAbove: checkResult.freeDeliveryAbove,
      distanceToNearest: checkResult.distanceToNearest,
      nearestZoneName: checkResult.nearestZone?.neighborhood || null,
    });
    
    setIsSearching(false);
  }, [zones, settings]);

  const handleUseCurrentLocation = () => {
    requestLocation();
  };

  const handleManualSearch = () => {
    if (coords) {
      runSimulation(coords);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5" />
          Simulador de Endereço
        </CardTitle>
        <CardDescription>
          Teste se um endereço está dentro das suas zonas de entrega
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={isLoaded ? "Digite um endereço para testar..." : "Carregando..."}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="pl-10"
              disabled={!isLoaded}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleUseCurrentLocation}
            disabled={isGeoLoading}
            title="Usar minha localização"
          >
            <Navigation className={`w-4 h-4 ${isGeoLoading ? 'animate-pulse' : ''}`} />
          </Button>
        </div>

        {/* Coordinates Display */}
        {coords && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2">
            Coordenadas: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className={`rounded-lg border p-4 ${result.isValid ? 'border-primary/50 bg-primary/5' : 'border-destructive/50 bg-destructive/5'}`}>
            <div className="flex items-start gap-3">
              {result.isValid ? (
                <CheckCircle className="w-6 h-6 text-primary shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-destructive shrink-0" />
              )}
              
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className={`font-medium ${result.isValid ? 'text-primary' : 'text-destructive'}`}>
                    {result.isValid ? 'Endereço dentro da área de entrega!' : 'Endereço fora da área de entrega'}
                  </h4>
                  {result.isValid && result.zoneName && (
                    <p className="text-sm text-muted-foreground">
                      Zona: <span className="font-medium">{result.zoneName}</span>
                    </p>
                  )}
                  {!result.isValid && result.nearestZoneName && (
                    <p className="text-sm text-muted-foreground">
                      Zona mais próxima: <span className="font-medium">{result.nearestZoneName}</span>
                      {result.distanceToNearest && (
                        <span className="ml-1">({result.distanceToNearest.toFixed(2)} km de distância)</span>
                      )}
                    </p>
                  )}
                </div>

                {result.isValid && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <DollarSign className="w-3 h-3" />
                      Taxa: {formatCurrency(result.deliveryFee)}
                    </Badge>
                    
                    {result.estimatedTime && (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {result.estimatedTime} min
                      </Badge>
                    )}
                    
                    {result.minOrderValue > 0 && (
                      <Badge variant="outline" className="gap-1">
                        Mín: {formatCurrency(result.minOrderValue)}
                      </Badge>
                    )}
                    
                    {result.freeDeliveryAbove && (
                      <Badge variant="outline" className="gap-1 text-primary">
                        Grátis acima de {formatCurrency(result.freeDeliveryAbove)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isSearching && (
          <div className="text-center py-6 text-muted-foreground">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Digite um endereço acima para verificar se ele está dentro das suas zonas de entrega.</p>
          </div>
        )}

        {/* Zone Count Info */}
        <div className="text-xs text-muted-foreground text-center">
          {zones.length === 0 ? (
            <span className="text-destructive">Nenhuma zona de entrega configurada ainda.</span>
          ) : (
            <span>{zones.length} zona{zones.length !== 1 ? 's' : ''} de entrega ativa{zones.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
