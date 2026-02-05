import { CheckCircle, XCircle, Clock, Truck, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatUtils';
import type { DeliveryZoneCheckResult } from '@/hooks/useDeliveryZones';

interface DeliveryZoneIndicatorProps {
  result: DeliveryZoneCheckResult | null;
  isLoading?: boolean;
  subtotal?: number;
}

export function DeliveryZoneIndicator({
  result,
  isLoading,
  subtotal = 0,
}: DeliveryZoneIndicatorProps) {
  if (isLoading) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 border animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const isFreeDelivery =
    result.freeDeliveryAbove && subtotal >= result.freeDeliveryAbove;
  const finalDeliveryFee = isFreeDelivery ? 0 : result.deliveryFee;

  if (result.isValid) {
    return (
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Entregamos nesse endereço!</span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>
              Taxa:{' '}
              <span className={cn('font-medium', isFreeDelivery && 'line-through')}>
                {formatCurrency(result.deliveryFee)}
              </span>
              {isFreeDelivery && (
                <span className="text-primary ml-1 font-medium">Grátis!</span>
              )}
            </span>
          </div>

          {result.estimatedTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{result.estimatedTime} min</span>
            </div>
          )}
        </div>

        {result.minOrderValue > 0 && subtotal < result.minOrderValue && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>
              Pedido mínimo de {formatCurrency(result.minOrderValue)} para essa região
            </span>
          </div>
        )}

        {result.freeDeliveryAbove && !isFreeDelivery && (
          <div className="text-xs text-muted-foreground">
            💡 Frete grátis acima de {formatCurrency(result.freeDeliveryAbove)}
          </div>
        )}
      </div>
    );
  }

  // Out of delivery zone
  return (
    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 space-y-2">
      <div className="flex items-center gap-2 text-destructive">
        <XCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Fora da área de entrega</span>
      </div>

      <p className="text-xs text-muted-foreground">
        Infelizmente ainda não entregamos nessa região.
        {result.nearestZone && result.distanceToNearest && (
          <span>
            {' '}
            A zona mais próxima está a {result.distanceToNearest.toFixed(1)} km.
          </span>
        )}
      </p>
    </div>
  );
}
