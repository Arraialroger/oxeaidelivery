import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, MapPin, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Coords {
  lat: number;
  lng: number;
}

interface DeliveryZoneMapProps {
  mode: 'radius' | 'polygon';
  center: Coords | null;
  radius: number;
  polygonCoords: Coords[];
  onCenterChange: (coords: Coords) => void;
  onRadiusChange: (radius: number) => void;
  onPolygonChange: (coords: Coords[]) => void;
}

const DEFAULT_CENTER = { lat: -16.4544, lng: -39.0644 }; // Porto Seguro, BA

export function DeliveryZoneMap({
  mode,
  center,
  radius,
  polygonCoords,
  onCenterChange,
  onRadiusChange,
  onPolygonChange,
}: DeliveryZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  
  const { isLoaded, loadError, google } = useGoogleMaps({ libraries: ['places', 'drawing'] });
  const [searchInput, setSearchInput] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !google || !mapRef.current || mapInstanceRef.current) return;

    const mapCenter = center || DEFAULT_CENTER;
    
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 14,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [isLoaded, google, center]);

  // Setup autocomplete
  useEffect(() => {
    if (!isLoaded || !google || !searchInputRef.current || autocompleteRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
      componentRestrictions: { country: 'br' },
      fields: ['geometry', 'formatted_address'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const newCenter = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        onCenterChange(newCenter);
        mapInstanceRef.current?.panTo(newCenter);
        mapInstanceRef.current?.setZoom(15);
      }
    });
  }, [isLoaded, google, onCenterChange]);

  // Handle radius mode
  useEffect(() => {
    if (!google || !mapInstanceRef.current || mode !== 'radius') {
      // Clean up circle and marker if not in radius mode
      circleRef.current?.setMap(null);
      markerRef.current?.setMap(null);
      return;
    }

    const mapCenter = center || DEFAULT_CENTER;

    // Create or update marker
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: mapCenter,
        map: mapInstanceRef.current,
        draggable: true,
        title: 'Arraste para definir o centro',
      });

      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current?.getPosition();
        if (pos) {
          onCenterChange({ lat: pos.lat(), lng: pos.lng() });
        }
      });
    } else {
      markerRef.current.setPosition(mapCenter);
      markerRef.current.setMap(mapInstanceRef.current);
    }

    // Create or update circle
    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map: mapInstanceRef.current,
        center: mapCenter,
        radius: radius * 1000, // Convert km to meters
        fillColor: 'hsl(var(--primary))',
        fillOpacity: 0.2,
        strokeColor: 'hsl(var(--primary))',
        strokeWeight: 2,
        editable: true,
      });

      circleRef.current.addListener('radius_changed', () => {
        const newRadius = circleRef.current?.getRadius();
        if (newRadius) {
          onRadiusChange(newRadius / 1000); // Convert meters to km
        }
      });

      circleRef.current.addListener('center_changed', () => {
        const newCenter = circleRef.current?.getCenter();
        if (newCenter) {
          onCenterChange({ lat: newCenter.lat(), lng: newCenter.lng() });
          markerRef.current?.setPosition(newCenter);
        }
      });
    } else {
      circleRef.current.setCenter(mapCenter);
      circleRef.current.setRadius(radius * 1000);
      circleRef.current.setMap(mapInstanceRef.current);
    }

    // Fit bounds to circle
    const bounds = circleRef.current.getBounds();
    if (bounds) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [google, mode, center, radius, onCenterChange, onRadiusChange]);

  // Handle polygon mode
  useEffect(() => {
    if (!google || !mapInstanceRef.current || mode !== 'polygon') {
      // Clean up polygon and drawing manager if not in polygon mode
      polygonRef.current?.setMap(null);
      drawingManagerRef.current?.setMap(null);
      return;
    }

    // Create or update polygon if we have coords
    if (polygonCoords.length >= 3) {
      if (!polygonRef.current) {
        polygonRef.current = new google.maps.Polygon({
          paths: polygonCoords,
          map: mapInstanceRef.current,
          fillColor: 'hsl(var(--primary))',
          fillOpacity: 0.2,
          strokeColor: 'hsl(var(--primary))',
          strokeWeight: 2,
          editable: true,
          draggable: true,
        });

        const updatePolygonCoords = () => {
          const path = polygonRef.current?.getPath();
          if (path) {
            const newCoords: Coords[] = [];
            for (let i = 0; i < path.getLength(); i++) {
              const point = path.getAt(i);
              newCoords.push({ lat: point.lat(), lng: point.lng() });
            }
            onPolygonChange(newCoords);
          }
        };

        google.maps.event.addListener(polygonRef.current.getPath(), 'set_at', updatePolygonCoords);
        google.maps.event.addListener(polygonRef.current.getPath(), 'insert_at', updatePolygonCoords);
        google.maps.event.addListener(polygonRef.current.getPath(), 'remove_at', updatePolygonCoords);
      } else {
        polygonRef.current.setPath(polygonCoords);
        polygonRef.current.setMap(mapInstanceRef.current);
      }

      // Fit bounds to polygon
      const bounds = new google.maps.LatLngBounds();
      polygonCoords.forEach((coord) => bounds.extend(coord));
      mapInstanceRef.current.fitBounds(bounds);
    } else {
      // No polygon yet, enable drawing
      if (!drawingManagerRef.current) {
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.POLYGON,
          drawingControl: true,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [google.maps.drawing.OverlayType.POLYGON],
          },
          polygonOptions: {
            fillColor: 'hsl(var(--primary))',
            fillOpacity: 0.2,
            strokeColor: 'hsl(var(--primary))',
            strokeWeight: 2,
            editable: true,
          },
        });

        google.maps.event.addListener(drawingManagerRef.current, 'polygoncomplete', (polygon: google.maps.Polygon) => {
          const path = polygon.getPath();
          const coords: Coords[] = [];
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coords.push({ lat: point.lat(), lng: point.lng() });
          }
          onPolygonChange(coords);
          
          // Remove the drawn polygon (we'll use our own)
          polygon.setMap(null);
          drawingManagerRef.current?.setMap(null);
        });
      }
      
      drawingManagerRef.current.setMap(mapInstanceRef.current);
    }
  }, [google, mode, polygonCoords, onPolygonChange]);

  // Update map center when center prop changes
  useEffect(() => {
    if (center && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(center);
    }
  }, [center]);

  const handleClearPolygon = useCallback(() => {
    polygonRef.current?.setMap(null);
    polygonRef.current = null;
    onPolygonChange([]);
  }, [onPolygonChange]);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Erro ao carregar o Google Maps. Verifique sua conexão e a configuração da API.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="search" className="sr-only">Buscar endereço</Label>
          <Input
            id="search"
            ref={searchInputRef}
            type="text"
            placeholder="Buscar endereço para centralizar o mapa..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        {mode === 'polygon' && polygonCoords.length > 0 && (
          <Button variant="outline" onClick={handleClearPolygon}>
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>

      <div
        ref={mapRef}
        className="w-full h-64 md:h-80 rounded-lg border border-border"
      />

      {mode === 'radius' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Raio de entrega</Label>
            <span className="text-sm font-medium">{radius.toFixed(1)} km</span>
          </div>
          <Slider
            value={[radius]}
            onValueChange={([value]) => onRadiusChange(value)}
            min={0.5}
            max={20}
            step={0.5}
          />
        </div>
      )}

      {mode === 'polygon' && polygonCoords.length === 0 && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Use as ferramentas de desenho no mapa para definir a área de entrega.
        </p>
      )}

      {mode === 'polygon' && polygonCoords.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {polygonCoords.length} pontos definidos. Arraste os vértices para ajustar.
        </p>
      )}
    </div>
  );
}
