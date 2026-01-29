import { Link, useParams } from 'react-router-dom';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurantContext();
  
  const restaurantName = restaurant?.name || 'Restaurante';
  const baseSlug = slug || restaurant?.slug;

  return (
    <footer className="bg-muted/30 border-t border-border py-6 px-4 mb-20">
      <div className="max-w-md mx-auto text-center space-y-3">
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link 
            to={baseSlug ? `/${baseSlug}/privacidade` : '/privacidade'} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Política de Privacidade
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <Link 
            to={baseSlug ? `/${baseSlug}/termos` : '/termos'} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Termos de Uso
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © {currentYear} {restaurantName}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
