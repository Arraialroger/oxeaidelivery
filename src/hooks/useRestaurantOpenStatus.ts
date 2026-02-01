import { useMemo, useState, useEffect } from 'react';
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
  nextCloseTime: string | null;
  closingSoon: boolean;
  closingVerySoon: boolean;
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

  // Force re-render every minute for real-time countdown
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60 * 1000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (isLoading) {
      return { isOpen: false, isLoading: true, nextOpenTime: null, nextCloseTime: null, closingSoon: false, closingVerySoon: false };
    }

    // Check schedule mode - if manual, use is_open directly
    const scheduleMode = settings?.schedule_mode ?? 'auto';
    
    if (scheduleMode === 'manual') {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
        nextCloseTime: null,
        closingSoon: false,
        closingVerySoon: false,
      };
    }

    // Auto mode: check business hours
    // If no business hours configured, fall back to manual is_open
    if (!businessHours || businessHours.length === 0) {
      return {
        isOpen: settings?.is_open ?? false,
        isLoading: false,
        nextOpenTime: null,
        nextCloseTime: null,
        closingSoon: false,
        closingVerySoon: false,
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
        nextCloseTime: null,
        closingSoon: false,
        closingVerySoon: false,
      };
    }

    const openTime = todayConfig.open_time;
    const closeTime = todayConfig.close_time;

    if (openTime && closeTime) {
      const isWithinHours = currentTime >= openTime && currentTime < closeTime;

      if (isWithinHours) {
        // Calculate minutes until closing
        const minutesUntilClose = getMinutesUntil(now, closeTime);
        const closingSoon = minutesUntilClose <= 30;
        const closingVerySoon = minutesUntilClose <= 15;
        const nextCloseMessage = minutesUntilClose <= 60 
          ? `Fecha em ${minutesUntilClose} min`
          : `Fecha às ${formatTime(closeTime)}`;
        
        return { 
          isOpen: true, 
          isLoading: false, 
          nextOpenTime: null,
          nextCloseTime: nextCloseMessage,
          closingSoon,
          closingVerySoon,
        };
      } else if (currentTime < openTime) {
        // Calculate minutes until opening
        const minutesUntilOpen = getMinutesUntil(now, openTime);
        const nextOpenMessage = minutesUntilOpen <= 60 
          ? `Abre em ${minutesUntilOpen} min`
          : `Abre às ${formatTime(openTime)}`;
        
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: nextOpenMessage,
          nextCloseTime: null,
          closingSoon: false,
          closingVerySoon: false,
        };
      } else {
        const nextOpen = findNextOpenDay(businessHours, currentDayOfWeek);
        return {
          isOpen: false,
          isLoading: false,
          nextOpenTime: nextOpen ? formatNextOpen(nextOpen, currentDayOfWeek) : null,
          nextCloseTime: null,
          closingSoon: false,
          closingVerySoon: false,
        };
      }
    }

    // Fallback to manual setting
    return {
      isOpen: settings?.is_open ?? false,
      isLoading: false,
      nextOpenTime: null,
      nextCloseTime: null,
      closingSoon: false,
      closingVerySoon: false,
    };
  }, [businessHours, isLoading, settings?.is_open, settings?.schedule_mode, tick]);
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

function getMinutesUntil(now: Date, targetTime: string): number {
  const [hours, minutes] = targetTime.split(':').map(Number);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  
  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60)));
}
