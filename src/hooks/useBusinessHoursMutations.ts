import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BusinessHourInput {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export function useUpsertBusinessHours(restaurantId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (hours: BusinessHourInput[]) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');

      // Delete existing hours for this restaurant
      const { error: deleteError } = await supabase
        .from('business_hours')
        .delete()
        .eq('restaurant_id', restaurantId);

      if (deleteError) throw deleteError;

      // Insert new hours
      const insertData = hours.map(h => ({
        restaurant_id: restaurantId,
        day_of_week: h.day_of_week,
        open_time: h.is_closed ? null : h.open_time,
        close_time: h.is_closed ? null : h.close_time,
        is_closed: h.is_closed,
      }));

      const { data, error } = await supabase
        .from('business_hours')
        .insert(insertData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-hours', restaurantId] });
      toast({
        title: 'Horários salvos!',
        description: 'Os horários de funcionamento foram atualizados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao salvar horários',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
