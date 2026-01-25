import { Link } from 'react-router-dom';
import { Store, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestaurantNotFoundProps {
  slug?: string;
}

export default function RestaurantNotFound({ slug }: RestaurantNotFoundProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Store className="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h1 className="text-2xl font-bold text-foreground mb-2">
        Restaurante não encontrado
      </h1>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        {slug ? (
          <>
            O restaurante <span className="font-semibold text-foreground">"{slug}"</span> não existe ou está temporariamente indisponível.
          </>
        ) : (
          'Não foi possível encontrar o restaurante solicitado.'
        )}
      </p>

      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Verifique se o endereço está correto ou entre em contato com o estabelecimento.
        </p>
        
        <Button asChild variant="outline" className="gap-2">
          <Link to="/">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  );
}
