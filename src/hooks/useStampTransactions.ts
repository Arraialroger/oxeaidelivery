import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StampTransaction {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  amount: number;
  balance_after: number;
  type: string;
  notes: string | null;
  created_at: string | null;
  customer?: {
    name: string | null;
    phone: string;
  } | null;
}

export function useStampTransactions(limit = 50) {
  return useQuery({
    queryKey: ['stamp-transactions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stamp_transactions')
        .select(`
          *,
          customer:customers(name, phone)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as StampTransaction[];
    },
  });
}
