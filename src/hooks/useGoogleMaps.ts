/// <reference types="@types/google.maps" />
import { useState, useEffect, useCallback } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface UseGoogleMapsOptions {
  libraries?: string[];
}

interface UseGoogleMapsReturn {
  isLoaded: boolean;
  loadError: Error | null;
  google: typeof google | null;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

let isScriptLoading = false;
let isScriptLoaded = false;
let loadPromise: Promise<void> | null = null;

export function useGoogleMaps(options: UseGoogleMapsOptions = {}): UseGoogleMapsReturn {
  const { libraries = ['places'] } = options;
  const [isLoaded, setIsLoaded] = useState(isScriptLoaded);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setLoadError(new Error('Google Maps API key not configured'));
      return;
    }

    if (isScriptLoaded) {
      setIsLoaded(true);
      return;
    }

    if (isScriptLoading && loadPromise) {
      loadPromise
        .then(() => setIsLoaded(true))
        .catch((err) => setLoadError(err));
      return;
    }

    isScriptLoading = true;

    loadPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        isScriptLoaded = true;
        isScriptLoading = false;
        resolve();
        return;
      }

      const script = document.createElement('script');
      const librariesParam = libraries.join(',');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${librariesParam}&language=pt-BR&region=BR`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        isScriptLoaded = true;
        isScriptLoading = false;
        resolve();
      };

      script.onerror = () => {
        isScriptLoading = false;
        const error = new Error('Failed to load Google Maps script');
        reject(error);
      };

      document.head.appendChild(script);
    });

    loadPromise
      .then(() => setIsLoaded(true))
      .catch((err) => setLoadError(err));
  }, [libraries]);

  return {
    isLoaded,
    loadError,
    google: isLoaded && typeof window !== 'undefined' ? window.google : null,
  };
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationPositionError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        message: 'Geolocation is not supported by this browser',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition(pos);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  return {
    position,
    error,
    isLoading,
    requestLocation,
    coords: position?.coords
      ? { lat: position.coords.latitude, lng: position.coords.longitude }
      : null,
  };
}

export function useReverseGeocode(googleInstance: typeof google | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<google.maps.GeocoderResult | null> => {
      if (!googleInstance) {
        setError('Google Maps not loaded');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const geocoder = new googleInstance.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });

        if (response.results && response.results.length > 0) {
          setIsLoading(false);
          return response.results[0];
        }

        setError('No address found for this location');
        setIsLoading(false);
        return null;
      } catch (err) {
        setError('Failed to reverse geocode');
        setIsLoading(false);
        return null;
      }
    },
    [googleInstance]
  );

  return { reverseGeocode, isLoading, error };
}

export function useForwardGeocode(googleInstance: typeof google | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forwardGeocode = useCallback(
    async (address: string): Promise<{ lat: number; lng: number } | null> => {
      if (!googleInstance) {
        setError('Google Maps not loaded');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const geocoder = new googleInstance.maps.Geocoder();
        const response = await geocoder.geocode({ address });

        if (response.results && response.results.length > 0) {
          const location = response.results[0].geometry.location;
          setIsLoading(false);
          return { lat: location.lat(), lng: location.lng() };
        }

        setError('Address not found');
        setIsLoading(false);
        return null;
      } catch (err) {
        setError('Failed to geocode address');
        setIsLoading(false);
        return null;
      }
    },
    [googleInstance]
  );

  return { forwardGeocode, isLoading, error };
}
