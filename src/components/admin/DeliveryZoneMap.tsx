import { useEffect, useRef, useState, useCallback } from 'react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, MapPin, Plus, Circle, Pencil } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DeliveryZone } from '@/hooks/useDeliveryZones';

interface Coords {
  lat: number;
  lng: number;
}

export interface NewZoneData {
  type: 'radius' | 'polygon';
  center?: Coords;
  radius?: number;
  polygonCoords?: Coords[];
}

interface DeliveryZoneMapProps {
  zones: DeliveryZone[];
  selectedZoneId: string | null;
  onZoneSelect: (id: string) => void;
  onNewZoneDrawn: (data: NewZoneData) => void;
  onZoneGeometryUpdate: (data: { id: string } & Partial<NewZoneData>) => void;
  drawingMode: 'radius' | 'polygon' | null;
  onDrawingModeChange: (mode: 'radius' | 'polygon' | null) => void;
}

const DEFAULT_CENTER = { lat: -16.4544, lng: -39.0644 };

const ZONE_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#14B8A6', // teal
];

export function DeliveryZoneMap({
  zones,
  selectedZoneId,
  onZoneSelect,
  onNewZoneDrawn,
  onZoneGeometryUpdate,
  drawingMode,
  onDrawingModeChange,
}: DeliveryZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Map<string, google.maps.Circle | google.maps.Polygon>>(new Map());
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const newCircleRef = useRef<google.maps.Circle | null>(null);
  const newMarkerRef = useRef<google.maps.Marker | null>(null);

  const { isLoaded, loadError, google } = useGoogleMaps({ libraries: ['places', 'drawing'] });
  const [searchInput, setSearchInput] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [newRadius, setNewRadius] = useState(3);

  // Initialize map once
  useEffect(() => {
    if (!isLoaded || !google || !mapRef.current || mapInstanceRef.current) return;

    // Find a center from existing zones or use default
    const firstZone = zones.find(z => z.center_lat && z.center_lng);
    const mapCenter = firstZone
      ? { lat: firstZone.center_lat!, lng: firstZone.center_lng! }
      : DEFAULT_CENTER;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
  }, [isLoaded, google]);

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
        mapInstanceRef.current?.panTo(place.geometry.location);
        mapInstanceRef.current?.setZoom(15);
      }
    });
  }, [isLoaded, google]);

  // Render all zones on the map
  useEffect(() => {
    if (!google || !mapInstanceRef.current) return;

    // Clear existing overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    overlaysRef.current.clear();

    zones.forEach((zone, index) => {
      const color = ZONE_COLORS[index % ZONE_COLORS.length];
      const isSelected = zone.id === selectedZoneId;
      const isInactive = !zone.is_active;

      if (zone.is_polygon && zone.polygon_coords && zone.polygon_coords.length >= 3) {
        const polygon = new google.maps.Polygon({
          paths: zone.polygon_coords,
          map: mapInstanceRef.current!,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.15,
          strokeColor: color,
          strokeWeight: isSelected ? 3 : 1.5,
          strokeOpacity: isInactive ? 0.4 : 1,
          editable: isSelected,
          draggable: isSelected,
          clickable: true,
          zIndex: isSelected ? 10 : 1,
        });

        if (isInactive) {
          polygon.setOptions({
            fillOpacity: 0.05,
            strokeOpacity: 0.3,
          });
        }

        polygon.addListener('click', () => onZoneSelect(zone.id));

        if (isSelected) {
          const updateCoords = () => {
            const path = polygon.getPath();
            const coords: Coords[] = [];
            for (let i = 0; i < path.getLength(); i++) {
              const pt = path.getAt(i);
              coords.push({ lat: pt.lat(), lng: pt.lng() });
            }
            onZoneGeometryUpdate({ id: zone.id, type: 'polygon', polygonCoords: coords });
          };
          google.maps.event.addListener(polygon.getPath(), 'set_at', updateCoords);
          google.maps.event.addListener(polygon.getPath(), 'insert_at', updateCoords);
          google.maps.event.addListener(polygon.getPath(), 'remove_at', updateCoords);
        }

        overlaysRef.current.set(zone.id, polygon);
      } else if (!zone.is_polygon && zone.center_lat && zone.center_lng && zone.radius_km) {
        const circle = new google.maps.Circle({
          map: mapInstanceRef.current!,
          center: { lat: zone.center_lat, lng: zone.center_lng },
          radius: zone.radius_km * 1000,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.15,
          strokeColor: color,
          strokeWeight: isSelected ? 3 : 1.5,
          strokeOpacity: isInactive ? 0.4 : 1,
          editable: isSelected,
          draggable: isSelected,
          clickable: true,
          zIndex: isSelected ? 10 : 1,
        });

        if (isInactive) {
          circle.setOptions({
            fillOpacity: 0.05,
            strokeOpacity: 0.3,
          });
        }

        circle.addListener('click', () => onZoneSelect(zone.id));

        if (isSelected) {
          circle.addListener('radius_changed', () => {
            onZoneGeometryUpdate({
              id: zone.id,
              type: 'radius',
              radius: (circle.getRadius() || 0) / 1000,
            });
          });
          circle.addListener('center_changed', () => {
            const c = circle.getCenter();
            if (c) {
              onZoneGeometryUpdate({
                id: zone.id,
                type: 'radius',
                center: { lat: c.lat(), lng: c.lng() },
              });
            }
          });
        }

        overlaysRef.current.set(zone.id, circle);
      }
    });

    // Fit bounds to all zones if no zone is selected
    if (!selectedZoneId && zones.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      let hasPoints = false;
      zones.forEach(z => {
        if (z.is_polygon && z.polygon_coords) {
          z.polygon_coords.forEach(c => { bounds.extend(c); hasPoints = true; });
        } else if (z.center_lat && z.center_lng) {
          bounds.extend({ lat: z.center_lat, lng: z.center_lng });
          hasPoints = true;
        }
      });
      if (hasPoints) {
        mapInstanceRef.current!.fitBounds(bounds, 50);
      }
    }
  }, [google, zones, selectedZoneId, onZoneSelect, onZoneGeometryUpdate]);

  // Fit bounds to selected zone
  useEffect(() => {
    if (!google || !mapInstanceRef.current || !selectedZoneId) return;
    const overlay = overlaysRef.current.get(selectedZoneId);
    if (!overlay) return;

    if (overlay instanceof google.maps.Circle) {
      const bounds = overlay.getBounds();
      if (bounds) mapInstanceRef.current.fitBounds(bounds);
    } else if (overlay instanceof google.maps.Polygon) {
      const bounds = new google.maps.LatLngBounds();
      overlay.getPath().forEach(p => bounds.extend(p));
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [google, selectedZoneId]);

  // Handle drawing mode for NEW zones
  useEffect(() => {
    if (!google || !mapInstanceRef.current) return;

    // Cleanup previous drawing tools
    drawingManagerRef.current?.setMap(null);
    drawingManagerRef.current = null;
    newCircleRef.current?.setMap(null);
    newCircleRef.current = null;
    newMarkerRef.current?.setMap(null);
    newMarkerRef.current = null;

    if (!drawingMode) return;

    if (drawingMode === 'polygon') {
      const dm = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: false,
        polygonOptions: {
          fillColor: '#3B82F6',
          fillOpacity: 0.25,
          strokeColor: '#3B82F6',
          strokeWeight: 2,
          editable: true,
        },
      });

      google.maps.event.addListener(dm, 'polygoncomplete', (polygon: google.maps.Polygon) => {
        const path = polygon.getPath();
        const coords: Coords[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const pt = path.getAt(i);
          coords.push({ lat: pt.lat(), lng: pt.lng() });
        }
        polygon.setMap(null);
        dm.setMap(null);
        onNewZoneDrawn({ type: 'polygon', polygonCoords: coords });
        onDrawingModeChange(null);
      });

      dm.setMap(mapInstanceRef.current);
      drawingManagerRef.current = dm;
    }

    if (drawingMode === 'radius') {
      // Click on map to place center
      const clickListener = mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const center = { lat: e.latLng.lat(), lng: e.latLng.lng() };

        // Remove old preview
        newCircleRef.current?.setMap(null);
        newMarkerRef.current?.setMap(null);

        newMarkerRef.current = new google.maps.Marker({
          position: center,
          map: mapInstanceRef.current!,
          draggable: true,
          title: 'Arraste para ajustar o centro',
        });

        newCircleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current!,
          center,
          radius: newRadius * 1000,
          fillColor: '#3B82F6',
          fillOpacity: 0.25,
          strokeColor: '#3B82F6',
          strokeWeight: 2,
          editable: true,
        });

        const emitData = () => {
          const c = newCircleRef.current?.getCenter();
          const r = newCircleRef.current?.getRadius();
          if (c && r) {
            onNewZoneDrawn({ type: 'radius', center: { lat: c.lat(), lng: c.lng() }, radius: r / 1000 });
          }
        };

        newCircleRef.current.addListener('radius_changed', emitData);
        newCircleRef.current.addListener('center_changed', () => {
          const c = newCircleRef.current?.getCenter();
          if (c) newMarkerRef.current?.setPosition(c);
          emitData();
        });
        newMarkerRef.current.addListener('dragend', () => {
          const pos = newMarkerRef.current?.getPosition();
          if (pos) newCircleRef.current?.setCenter(pos);
          emitData();
        });

        // Emit initial
        onNewZoneDrawn({ type: 'radius', center, radius: newRadius });

        // Remove the click listener after first click
        google.maps.event.removeListener(clickListener);
      });

      return () => {
        google.maps.event.removeListener(clickListener);
      };
    }
  }, [google, drawingMode, newRadius, onNewZoneDrawn, onDrawingModeChange]);

  // Cleanup new zone overlays when drawing mode is cleared externally
  useEffect(() => {
    if (!drawingMode) {
      newCircleRef.current?.setMap(null);
      newCircleRef.current = null;
      newMarkerRef.current?.setMap(null);
      newMarkerRef.current = null;
    }
  }, [drawingMode]);

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
    <div className="space-y-3">
      {/* Search + Drawing controls */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="map-search" className="sr-only">Buscar endereço</Label>
          <Input
            id="map-search"
            ref={searchInputRef}
            type="text"
            placeholder="Buscar endereço para centralizar..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button
          variant={drawingMode === 'radius' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDrawingModeChange(drawingMode === 'radius' ? null : 'radius')}
          className="gap-1.5"
        >
          <Circle className="w-4 h-4" />
          Raio
        </Button>
        <Button
          variant={drawingMode === 'polygon' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDrawingModeChange(drawingMode === 'polygon' ? null : 'polygon')}
          className="gap-1.5"
        >
          <Pencil className="w-4 h-4" />
          Polígono
        </Button>
      </div>

      {/* Map */}
      <div
        ref={mapRef}
        className="w-full h-[350px] md:h-[450px] rounded-lg border border-border"
      />

      {/* Drawing instructions */}
      {drawingMode === 'radius' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 shrink-0" />
            Clique no mapa para definir o centro da zona de raio.
          </p>
          <div className="flex items-center justify-between">
            <Label>Raio</Label>
            <span className="text-sm font-medium">{newRadius.toFixed(1)} km</span>
          </div>
          <Slider
            value={[newRadius]}
            onValueChange={([v]) => {
              setNewRadius(v);
              if (newCircleRef.current) {
                newCircleRef.current.setRadius(v * 1000);
                onNewZoneDrawn({
                  type: 'radius',
                  center: (() => {
                    const c = newCircleRef.current?.getCenter();
                    return c ? { lat: c.lat(), lng: c.lng() } : undefined;
                  })(),
                  radius: v,
                });
              }
            }}
            min={0.5}
            max={20}
            step={0.5}
          />
        </div>
      )}

      {drawingMode === 'polygon' && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 shrink-0" />
          Desenhe a área clicando no mapa para criar os vértices do polígono.
        </p>
      )}

      {/* Legend */}
      {zones.length > 0 && !drawingMode && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {zones.map((zone, i) => (
            <button
              key={zone.id}
              onClick={() => onZoneSelect(zone.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-accent ${
                zone.id === selectedZoneId ? 'bg-accent font-medium' : ''
              }`}
            >
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length], opacity: zone.is_active ? 1 : 0.4 }}
              />
              {zone.neighborhood}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
