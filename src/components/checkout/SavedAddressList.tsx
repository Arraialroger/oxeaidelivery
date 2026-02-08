import { MapPin, Clock, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { SavedAddress } from '@/hooks/useSavedAddresses';

interface SavedAddressListProps {
  addresses: SavedAddress[];
  isLoading: boolean;
  onSelect: (address: SavedAddress) => void;
  onNewAddress: () => void;
  selectedId?: string | null;
}

export function SavedAddressList({
  addresses,
  isLoading,
  onSelect,
  onNewAddress,
  selectedId,
}: SavedAddressListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Saved Addresses */}
      {addresses.map((address, index) => {
        const isSelected = selectedId === address.id;
        const displayAddress = address.formatted_address || 
          `${address.street}, ${address.number} - ${address.neighborhood}`;
        
        return (
          <Card
            key={address.id}
            className={`cursor-pointer transition-all ${
              isSelected 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelect(address)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {address.street}, {address.number}
                    </span>
                    {index === 0 && (
                      <Badge variant="secondary" className="shrink-0 text-xs gap-1">
                        <Clock className="w-3 h-3" />
                        Recente
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {address.neighborhood}
                  </p>
                  {address.complement && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {address.complement}
                    </p>
                  )}
                </div>
                
                <ChevronRight className={`w-5 h-5 shrink-0 ${
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* New Address Button */}
      <Button
        variant="outline"
        className="w-full h-auto py-4 justify-start gap-3"
        onClick={onNewAddress}
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Plus className="w-5 h-5" />
        </div>
        <div className="text-left">
          <span className="font-medium">Novo endereço</span>
          <p className="text-xs text-muted-foreground">Cadastrar outro endereço de entrega</p>
        </div>
      </Button>
    </div>
  );
}
