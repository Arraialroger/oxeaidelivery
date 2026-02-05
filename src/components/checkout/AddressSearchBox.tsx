/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';

interface AddressSearchBoxProps {
  onPlaceSelect: (place: {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId: string;
    addressComponents?: google.maps.GeocoderAddressComponent[];
  }) => void;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function AddressSearchBox({
  onPlaceSelect,
  placeholder = 'Busque seu endereço...',
  value,
  onChange,
}: AddressSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded, google: googleInstance } = useGoogleMaps();
  const [inputValue, setInputValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !googleInstance || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new googleInstance.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'br' },
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
      types: ['address'],
    });

    autocomplete.addListener('place_changed', () => {
      setIsLoading(true);
      const place = autocomplete.getPlace();

      if (place.geometry?.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          formattedAddress: place.formatted_address || '',
          placeId: place.place_id || '',
          addressComponents: place.address_components,
        };

        setInputValue(place.formatted_address || '');
        onChange?.(place.formatted_address || '');
        onPlaceSelect(location);
      }

      setIsLoading(false);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current && googleInstance) {
        googleInstance.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, googleInstance, onPlaceSelect, onChange]);

  // Sync external value
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange?.(e.target.value);
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="pl-9 pr-10"
        disabled={!isLoaded}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
