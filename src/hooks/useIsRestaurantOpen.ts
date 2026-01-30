import { useMemo } from 'react';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

interface OpenStatus {
  isOpen: boolean;
  isLoading: boolean;
  nextOpenTime: string | null;
  nextCloseTime: string | null;
  todayHours: {
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
  } | null;
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/**
 * Hook that automatically determines if the restaurant is open
 * based on business_hours table data
 */
export function useIsRestaurantOpen(): OpenStatus {
  const { restaurantId, settings } = useRestaurantContext();
  const { data: businessHours, isLoading } = useBusinessHours(restaurantId ?? undefined);

  return useMemo(() => {
    // If still loading, return loading state
    if (isLoading) {
      return {
        isOpen: false,
        isLoading: true,
        nextOpenTime: null,
        nextCloseTime: null,
        todayHours: null,
      };
    }

    // Check schedule mode - if manual, use is_open directly
    const scheduleMode = settings?.schedule_mode ?? 'auto';
    
    if (scheduleMode === 'manual') {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
        nextCloseTime: null,
        todayHours: null,
      };
    }

    // Auto mode: If no business hours configured, fall back to manual is_open setting
    if (!businessHours || businessHours.length === 0) {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
        nextCloseTime: null,
        todayHours: null,
      };
    }

    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentTime = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });

    // Find today's hours
    const todayConfig = businessHours.find(h => h.day_of_week === currentDayOfWeek);

    // If no config for today or marked as closed
    if (!todayConfig || todayConfig.is_closed) {
      const nextOpenDay = findNextOpenDay(businessHours, currentDayOfWeek);
      return {
        isOpen: false,
        isLoading: false,
        nextOpenTime: nextOpenDay ? formatNextOpen(nextOpenDay, currentDayOfWeek) : null,
        nextCloseTime: null,
        todayHours: todayConfig ? {
          open_time: todayConfig.open_time,
          close_time: todayConfig.close_time,
          is_closed: true,
        } : null,
      };
    }

    const openTime = todayConfig.open_time;
    const closeTime = todayConfig.close_time;

    // Check if current time is within open hours
    if (openTime && closeTime) {
      const isWithinHours = currentTime >= openTime && currentTime < closeTime;
      
      if (isWithinHours) {
        return {
          isOpen: true,
          isLoading: false,
          nextOpenTime: null,
          nextCloseTime: formatTime(closeTime),
          todayHours: {
            open_time: openTime,
            close_time: closeTime,
            is_closed: false,
          },
        };
      } else if (currentTime < openTime) {
        // Before opening time today
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: `Abre às ${formatTime(openTime)}`,
          nextCloseTime: null,
          todayHours: {
            open_time: openTime,
            close_time: closeTime,
            is_closed: false,
          },
        };
      } else {
        // After closing time today
        const nextOpenDay = findNextOpenDay(businessHours, currentDayOfWeek);
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: nextOpenDay ? formatNextOpen(nextOpenDay, currentDayOfWeek) : null,
          nextCloseTime: null,
          todayHours: {
            open_time: openTime,
            close_time: closeTime,
            is_closed: false,
          },
        };
      }
    }

    // Fallback: if times are null, use manual setting
    return {
      isOpen: settings?.is_open ?? false,
      isLoading: false,
      nextOpenTime: null,
      nextCloseTime: null,
      todayHours: null,
    };
  }, [businessHours, isLoading, settings?.is_open, settings?.schedule_mode]);
}

/**
 * Find the next day the restaurant opens
 */
function findNextOpenDay(
  hours: Array<{ day_of_week: number; is_closed: boolean | null; open_time: string | null }>,
  currentDay: number
): { day_of_week: number; open_time: string | null } | null {
  // Check next 7 days
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayConfig = hours.find(h => h.day_of_week === checkDay);
    
    if (dayConfig && !dayConfig.is_closed && dayConfig.open_time) {
      return { day_of_week: checkDay, open_time: dayConfig.open_time };
    }
  }
  return null;
}

/**
 * Format the next opening time message
 */
function formatNextOpen(
  nextDay: { day_of_week: number; open_time: string | null },
  currentDay: number
): string {
  const dayDiff = (nextDay.day_of_week - currentDay + 7) % 7;
  const dayName = dayDiff === 1 ? 'Amanhã' : DAY_NAMES[nextDay.day_of_week];
  const time = formatTime(nextDay.open_time);
  
  return `Abre ${dayName} às ${time}`;
}

/**
 * Format time from HH:MM:SS to HH:MM or Xh
 */
function formatTime(time: string | null): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  if (minutes === '00') {
    return `${parseInt(hours)}h`;
  }
  return `${hours}:${minutes}`;
}
