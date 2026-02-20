import { Outlet } from 'react-router-dom';
import { RestaurantProvider, useRestaurantContext } from '@/contexts/RestaurantContext';
import RestaurantNotFound from '@/pages/RestaurantNotFound';
import { Loader2 } from 'lucide-react';
import { useRestaurantHead } from '@/hooks/useRestaurantHead';

function RestaurantLayoutContent() {
  const { isLoading, notFound, slug, restaurant } = useRestaurantContext();
  useRestaurantHead(restaurant);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return <RestaurantNotFound slug={slug} />;
  }

  return <Outlet />;
}

export function RestaurantLayout() {
  return (
    <RestaurantProvider>
      <RestaurantLayoutContent />
    </RestaurantProvider>
  );
}
