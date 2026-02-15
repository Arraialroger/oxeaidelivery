import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import type { Json } from '@/integrations/supabase/types';

export interface DeliveryZone {
  id: string;
  restaurant_id: string;
  neighborhood: string;
  cep_prefix: string | null;
  delivery_fee_override: number | null;
  is_active: boolean;
  polygon_coords: Array<{ lat: number; lng: number }> | null;
  is_polygon: boolean;
  estimated_delivery_time: number | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  min_order_value: number | null;
  free_delivery_above: number | null;
}

// Helper to parse polygon_coords from Json
function parsePolygonCoords(coords: Json | null): Array<{ lat: number; lng: number }> | null {
  if (!coords) return null;
  // Handle both proper JSONB arrays and legacy string-encoded values
  let parsed = coords;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.map((c) => {
      const coord = c as { lat: number; lng: number };
      return { lat: Number(coord.lat), lng: Number(coord.lng) };
    });
  }
  return null;
}

interface UseDeliveryZonesOptions {
  includeInactive?: boolean;
}

export function useDeliveryZones(options: UseDeliveryZonesOptions = {}) {
  const { restaurantId } = useRestaurantContext();
  const { includeInactive = false } = options;

  return useQuery({
    queryKey: ['delivery-zones', restaurantId, includeInactive],
    queryFn: async () => {
      if (!restaurantId) return [];

      let query = supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurantId);

      // Only filter by active if not including inactive
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map to our interface with proper type handling
      return (data || []).map((zone): DeliveryZone => ({
        id: zone.id,
        restaurant_id: zone.restaurant_id,
        neighborhood: zone.neighborhood,
        cep_prefix: zone.cep_prefix,
        delivery_fee_override: zone.delivery_fee_override,
        is_active: zone.is_active ?? true,
        polygon_coords: parsePolygonCoords(zone.polygon_coords),
        is_polygon: zone.is_polygon ?? false,
        estimated_delivery_time: zone.estimated_delivery_time,
        center_lat: zone.center_lat,
        center_lng: zone.center_lng,
        radius_km: zone.radius_km,
        min_order_value: zone.min_order_value,
        free_delivery_above: zone.free_delivery_above,
      }));
    },
    enabled: !!restaurantId,
  });
}

// Haversine distance calculation
function haversineDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1.lat * Math.PI) / 180) *
      Math.cos((coord2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Point in polygon check (ray casting algorithm)
function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    if (
      yi > point.lng !== yj > point.lng &&
      point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

export interface DeliveryZoneCheckResult {
  isValid: boolean;
  zone: DeliveryZone | null;
  deliveryFee: number;
  estimatedTime: number | null;
  minOrderValue: number;
  freeDeliveryAbove: number | null;
  nearestZone: DeliveryZone | null;
  distanceToNearest: number | null;
}

export function checkDeliveryZone(
  coords: { lat: number; lng: number },
  zones: DeliveryZone[],
  defaultDeliveryFee: number = 0
): DeliveryZoneCheckResult {
  let nearestZone: DeliveryZone | null = null;
  let nearestDistance = Infinity;

  // First check polygon zones
  for (const zone of zones.filter((z) => z.is_polygon && z.polygon_coords)) {
    if (isPointInPolygon(coords, zone.polygon_coords!)) {
      return {
        isValid: true,
        zone,
        deliveryFee: zone.delivery_fee_override ?? defaultDeliveryFee,
        estimatedTime: zone.estimated_delivery_time,
        minOrderValue: zone.min_order_value ?? 0,
        freeDeliveryAbove: zone.free_delivery_above,
        nearestZone: zone,
        distanceToNearest: 0,
      };
    }
  }

  // Check radius-based zones
  for (const zone of zones.filter((z) => z.center_lat && z.center_lng && z.radius_km)) {
    const distance = haversineDistance(coords, {
      lat: zone.center_lat!,
      lng: zone.center_lng!,
    });

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestZone = zone;
    }

    if (distance <= zone.radius_km!) {
      return {
        isValid: true,
        zone,
        deliveryFee: zone.delivery_fee_override ?? defaultDeliveryFee,
        estimatedTime: zone.estimated_delivery_time,
        minOrderValue: zone.min_order_value ?? 0,
        freeDeliveryAbove: zone.free_delivery_above,
        nearestZone: zone,
        distanceToNearest: distance,
      };
    }
  }

  // Not in any zone
  return {
    isValid: false,
    zone: null,
    deliveryFee: defaultDeliveryFee,
    estimatedTime: null,
    minOrderValue: 0,
    freeDeliveryAbove: null,
    nearestZone,
    distanceToNearest: nearestDistance === Infinity ? null : nearestDistance,
  };
}

export interface DeliveryFeeRange {
  min: number;
  max: number;
  hasRange: boolean;
  hasZones: boolean;
}

export function getDeliveryFeeRange(zones: DeliveryZone[], defaultFee: number): DeliveryFeeRange {
  const fees = zones
    .filter((z) => z.delivery_fee_override !== null && z.delivery_fee_override !== undefined)
    .map((z) => z.delivery_fee_override!);

  if (fees.length === 0) {
    return { min: defaultFee, max: defaultFee, hasRange: false, hasZones: zones.length > 0 };
  }

  const min = Math.min(...fees);
  const max = Math.max(...fees);
  return { min, max, hasRange: min !== max, hasZones: true };
}

export function useDeliveryZoneCheck() {
  const { data: zones = [], isLoading } = useDeliveryZones();
  const { settings } = useRestaurantContext();

  const checkZone = (coords: { lat: number; lng: number }): DeliveryZoneCheckResult => {
    const defaultFee = settings?.delivery_fee ?? 0;
    return checkDeliveryZone(coords, zones, defaultFee);
  };

  return {
    checkZone,
    zones,
    isLoading,
    hasZones: zones.length > 0,
  };
}
