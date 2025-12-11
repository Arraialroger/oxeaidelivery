import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Config } from '@/types';

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: async (): Promise<Config | null> => {
      const { data, error } = await supabase
        .from('config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}
