/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useGoogleMaps, useGeolocation, useReverseGeocode } from '@/hooks/useGoogleMaps';

interface AddressMapPickerProps {
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId?: string;
    addressComponents?: google.maps.GeocoderAddressComponent[];
  }) => void;
  initialCenter?: { lat: number; lng: number };
  selectedLocation?: { lat: number; lng: number } | null;
}

// Default center: Arraial d'Ajuda, BA
const DEFAULT_CENTER = { lat: -16.4839, lng: -39.0751 };

export function AddressMapPicker({
  onLocationSelect,
  initialCenter,
  selectedLocation,
}: AddressMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const { isLoaded, loadError, google: googleInstance } = useGoogleMaps();
  const { coords: gpsCoords, isLoading: gpsLoading, requestLocation, error: gpsError } = useGeolocation();
  const { reverseGeocode, isLoading: geocodeLoading } = useReverseGeocode(googleInstance);

  const [mapCenter] = useState(initialCenter || DEFAULT_CENTER);

  // Update marker position
  const updateMarker = useCallback(
    (lat: number, lng: number) => {
      if (!googleInstance || !mapInstanceRef.current) return;

      if (markerRef.current) {
        markerRef.current.setPosition({ lat, lng });
      } else {
        markerRef.current = new googleInstance.maps.Marker({
          position: { lat, lng },
          map: mapInstanceRef.current,
          draggable: true,
          animation: googleInstance.maps.Animation.DROP,
        });

        // Drag end handler
        markerRef.current.addListener('dragend', async () => {
          const position = markerRef.current?.getPosition();
          if (position) {
            await handleLocationSelect(position.lat(), position.lng());
          }
        });
      }

      mapInstanceRef.current.panTo({ lat, lng });
    },
    [googleInstance]
  );

  // Handle location selection with reverse geocoding
  const handleLocationSelect = useCallback(
    async (lat: number, lng: number) => {
      const result = await reverseGeocode(lat, lng);

      if (result) {
        onLocationSelect({
          lat,
          lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components,
        });
      } else {
        // Still send location even without address
        onLocationSelect({
          lat,
          lng,
          formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        });
      }
    },
    [reverseGeocode, onLocationSelect]
  );

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !googleInstance || !mapRef.current || mapInstanceRef.current) return;

    const map = new googleInstance.maps.Map(mapRef.current, {
      center: mapCenter,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        },
      ],
    });

    mapInstanceRef.current = map;

    // Click handler
    map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      updateMarker(lat, lng);
      await handleLocationSelect(lat, lng);
    });

    // If we have an initial selected location, set the marker
    if (selectedLocation) {
      updateMarker(selectedLocation.lat, selectedLocation.lng);
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, [isLoaded, googleInstance, mapCenter, selectedLocation, updateMarker, handleLocationSelect]);

  // Handle GPS button click
  const handleUseGps = useCallback(() => {
    requestLocation();
  }, [requestLocation]);

  // Track processed GPS coordinates to avoid infinite loops
  const gpsProcessedRef = useRef<string | null>(null);

  // When GPS coords are received
  useEffect(() => {
    if (gpsCoords && mapInstanceRef.current) {
      const key = `${gpsCoords.lat},${gpsCoords.lng}`;
      if (gpsProcessedRef.current === key) return;
      gpsProcessedRef.current = key;

      updateMarker(gpsCoords.lat, gpsCoords.lng);
      handleLocationSelect(gpsCoords.lat, gpsCoords.lng);
      mapInstanceRef.current.setCenter(gpsCoords);
      mapInstanceRef.current.setZoom(17);
    }
  }, [gpsCoords, updateMarker, handleLocationSelect]);

  if (loadError) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar o mapa. Você pode digitar o endereço manualmente.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Map Container */}
      <div className="relative w-full h-48 sm:h-64 rounded-lg overflow-hidden border">
        <div ref={mapRef} className="w-full h-full" />

        {/* Center indicator when no marker */}
        {!selectedLocation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <MapPin className="w-8 h-8 text-primary opacity-50" />
          </div>
        )}

        {/* GPS Loading overlay */}
        {(gpsLoading || geocodeLoading) && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}
      </div>

      {/* Use GPS Button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleUseGps}
        disabled={gpsLoading}
        className="w-full gap-2"
      >
        {gpsLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Navigation className="w-4 h-4" />
        )}
        Usar minha localização atual
      </Button>

      {/* GPS Error Message */}
      {gpsError && (
        <p className="text-xs text-muted-foreground text-center">
          {gpsError.code === 1
            ? 'Você negou o acesso à localização. Toque no mapa para selecionar.'
            : 'Não foi possível obter sua localização. Toque no mapa para selecionar.'}
        </p>
      )}

      {/* Instruction */}
      <p className="text-xs text-muted-foreground text-center">
        Toque no mapa para marcar o local de entrega ou arraste o pin
      </p>
    </div>
  );
}
