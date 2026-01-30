import { MapPin } from 'lucide-react';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useIsRestaurantOpen } from '@/hooks/useIsRestaurantOpen';

export function Header() {
  const { restaurant } = useRestaurantContext();
  const { isOpen, isLoading, nextOpenTime, nextCloseTime } = useIsRestaurantOpen();

  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {restaurant?.logo_url && (
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name} 
              className="h-10 w-auto"
            />
          )}
          <div className="flex flex-col">
            {restaurant?.name && (
              <span className="font-semibold text-foreground">
                {restaurant.name}
              </span>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>Entrega em Arraial D'Ajuda</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          {isLoading ? (
            <span className="text-sm text-muted-foreground">...</span>
          ) : isOpen ? (
            <>
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Aberto
              </span>
              {nextCloseTime && (
                <span className="text-xs text-muted-foreground">
                  Fecha às {nextCloseTime}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Fechado
              </span>
              {nextOpenTime && (
                <span className="text-xs text-muted-foreground">
                  {nextOpenTime}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
