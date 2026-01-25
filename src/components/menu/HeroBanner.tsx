import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function HeroBanner() {
  const { restaurant, isLoading } = useRestaurantContext();

  // Don't show anything if loading, no restaurant, or no banner URL
  if (isLoading || !restaurant?.hero_banner_url) {
    return null;
  }

  return (
    <div className="w-full">
      <img
        src={restaurant.hero_banner_url}
        alt={`Banner promocional ${restaurant.name}`}
        className="w-full h-auto object-cover rounded-b-2xl"
      />
    </div>
  );
}
