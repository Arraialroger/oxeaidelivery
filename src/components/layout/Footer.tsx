import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t border-border py-6 px-4 mb-20">
      <div className="max-w-md mx-auto text-center space-y-3">
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link 
            to="/privacidade" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Política de Privacidade
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <Link 
            to="/termos" 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Termos de Uso
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          © {currentYear} Delivery Bruttus. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
