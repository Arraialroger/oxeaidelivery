import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const navigate = useNavigate();

  // For now, redirect to the pilot restaurant (astral)
  // In the future, this will be a proper landing page with restaurant discovery
  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['restaurants-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('slug, name')
        .eq('status', 'active')
        .limit(1);
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (restaurants && restaurants.length > 0) {
      // Redirect to the first active restaurant
      navigate(`/${restaurants[0].slug}/menu`, { replace: true });
    }
  }, [restaurants, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback if no restaurants found
  if (!restaurants || restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Nenhum restaurante disponível
        </h1>
        <p className="text-muted-foreground max-w-md">
          No momento não há restaurantes ativos na plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
