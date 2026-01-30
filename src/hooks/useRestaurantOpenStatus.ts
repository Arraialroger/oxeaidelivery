import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BusinessHour {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

interface RestaurantSettings {
  is_open?: boolean;
  schedule_mode?: 'auto' | 'manual';
}

interface OpenStatusResult {
  isOpen: boolean;
  isLoading: boolean;
  nextOpenTime: string | null;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Hook to check if any restaurant is open based on business_hours
 * This can be used outside of RestaurantContext (e.g., marketplace cards)
 */
export function useRestaurantOpenStatus(
  restaurantId: string | undefined,
  settings: RestaurantSettings | null
): OpenStatusResult {
  // Fetch business hours for this specific restaurant
  const { data: businessHours, isLoading } = useQuery({
    queryKey: ['business-hours-status', restaurantId],
    queryFn: async (): Promise<BusinessHour[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('business_hours')
        .select('day_of_week, open_time, close_time, is_closed')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week');

      if (error) {
        console.error('[useRestaurantOpenStatus] Error:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for marketplace
  });

  return useMemo(() => {
    if (isLoading) {
      return { isOpen: false, isLoading: true, nextOpenTime: null };
    }

    // Check schedule mode - if manual, use is_open directly
    const scheduleMode = settings?.schedule_mode ?? 'auto';
    
    if (scheduleMode === 'manual') {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
      };
    }

    // Auto mode: check business hours
    // If no business hours configured, fall back to manual is_open
    if (!businessHours || businessHours.length === 0) {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
      };
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentTime = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Find today's config
    const todayConfig = businessHours.find((h) => h.day_of_week === currentDayOfWeek);

    // If no config for today or marked as closed
    if (!todayConfig || todayConfig.is_closed) {
      const nextOpen = findNextOpenDay(businessHours, currentDayOfWeek);
      return {
        isOpen: false,
        isLoading: false,
        nextOpenTime: nextOpen ? formatNextOpen(nextOpen, currentDayOfWeek) : null,
      };
    }

    const openTime = todayConfig.open_time;
    const closeTime = todayConfig.close_time;

    if (openTime && closeTime) {
      const isWithinHours = currentTime >= openTime && currentTime < closeTime;

      if (isWithinHours) {
        return { isOpen: true, isLoading: false, nextOpenTime: null };
      } else if (currentTime < openTime) {
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: `Abre às ${formatTime(openTime)}`,
        };
      } else {
        const nextOpen = findNextOpenDay(businessHours, currentDayOfWeek);
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: nextOpen ? formatNextOpen(nextOpen, currentDayOfWeek) : null,
        };
      }
    }

    // Fallback to manual setting
    return {
      isOpen: settings?.is_open ?? false,
      isLoading: false,
      nextOpenTime: null,
    };
  }, [businessHours, isLoading, settings?.is_open, settings?.schedule_mode]);
}

function findNextOpenDay(
  hours: BusinessHour[],
  currentDay: number
): { day_of_week: number; open_time: string | null } | null {
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayConfig = hours.find((h) => h.day_of_week === checkDay);

    if (dayConfig && !dayConfig.is_closed && dayConfig.open_time) {
      return { day_of_week: checkDay, open_time: dayConfig.open_time };
    }
  }
  return null;
}

function formatNextOpen(
  nextDay: { day_of_week: number; open_time: string | null },
  currentDay: number
): string {
  const dayDiff = (nextDay.day_of_week - currentDay + 7) % 7;
  const dayName = dayDiff === 1 ? 'Amanhã' : DAY_NAMES[nextDay.day_of_week];
  const time = formatTime(nextDay.open_time);

  return `Abre ${dayName} às ${time}`;
}

function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  if (minutes === '00') {
    return `${parseInt(hours)}h`;
  }
  return `${hours}:${minutes}`;
}
