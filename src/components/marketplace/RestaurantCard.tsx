import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRestaurantOpenStatus } from '@/hooks/useRestaurantOpenStatus';

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    hero_banner_url: string | null;
    category: string | null;
    address: string | null;
    settings: {
      is_open?: boolean;
      delivery_fee?: number;
      schedule_mode?: 'auto' | 'manual';
    };
  };
}

const categoryLabels: Record<string, string> = {
  hamburgueria: 'Hamburgueria',
  pizzaria: 'Pizzaria',
  sorveteria: 'Sorveteria',
  acaiteria: 'Açaiteria',
  restaurante: 'Restaurante',
  lanchonete: 'Lanchonete',
  padaria: 'Padaria',
  cafeteria: 'Cafeteria',
  doceria: 'Doceria',
  restaurant: 'Restaurante',
};

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { isOpen, isLoading: statusLoading, nextOpenTime, nextCloseTime, closingSoon } = useRestaurantOpenStatus(
    restaurant.id,
    restaurant.settings
  );
  
  const categoryLabel = categoryLabels[restaurant.category || 'restaurant'] || 'Restaurante';
  const deliveryFee = restaurant.settings?.delivery_fee ?? 5;

  return (
    <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 bg-card/80 backdrop-blur-sm">
      {/* Banner/Cover Image - Links to menu */}
      <Link to={`/${restaurant.slug}/menu`} className="block group">
        <div className="relative h-32 overflow-hidden">
          {restaurant.hero_banner_url ? (
            <img
              src={restaurant.hero_banner_url}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/30 to-transparent" />
          
          {/* Status Badge */}
          {statusLoading ? (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-muted text-muted-foreground animate-pulse"
            >
              ...
            </Badge>
          ) : (
            <Badge
              variant={isOpen ? 'default' : 'secondary'}
              className={`absolute top-2 right-2 ${
                isOpen 
                  ? closingSoon
                    ? 'bg-amber-500/90 text-white border-0'
                    : 'bg-green-500/90 text-white border-0'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isOpen 
                ? (nextCloseTime?.includes('min') ? nextCloseTime : 'Aberto')
                : (nextOpenTime || 'Fechado')
              }
            </Badge>
          )}

          {/* Logo */}
          {restaurant.logo_url && (
            <div className="absolute -bottom-6 left-4 w-14 h-14 rounded-full bg-card border-2 border-background shadow-lg overflow-hidden">
              <img
                src={restaurant.logo_url}
                alt={`Logo ${restaurant.name}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </Link>

      <CardContent className="pt-8 pb-4 px-4">
        {/* Restaurant Name & Category */}
        <Link to={`/${restaurant.slug}/menu`} className="block group">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-foreground text-lg line-clamp-1 group-hover:text-primary transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">4.8</span>
            </div>
          </div>
        </Link>

        <Badge variant="outline" className="mb-3 text-xs">
          {categoryLabel}
        </Badge>

        {/* Address */}
        {restaurant.address && (
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{restaurant.address}</span>
          </div>
        )}

        {/* Delivery Info */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>30-45 min</span>
          </div>
          <span className="text-sm text-primary font-medium">
            Taxa: R$ {deliveryFee.toFixed(2).replace('.', ',')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Link to={`/${restaurant.slug}/menu`} className="flex-1">
            <Button className="w-full" size="sm">
              Ver Cardápio
            </Button>
          </Link>
          <Link to={`/${restaurant.slug}/info`}>
            <Button variant="outline" size="sm" className="px-3">
              <Info className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
