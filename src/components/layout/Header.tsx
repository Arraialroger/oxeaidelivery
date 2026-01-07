import { MapPin } from 'lucide-react';
import { useConfig } from '@/hooks/useConfig';
import logoImage from '@/assets/logo-bruttus.png';
export function Header() {
  const {
    data: config
  } = useConfig();
  return <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span>Entrega apenas em Arraial D'ajuda      </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-0.5">
          {config?.restaurant_open ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-green-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Aberto
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
              <span className="w-2 h-2 rounded-full bg-destructive" />
              Fechado
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Abrimos às 18h
          </span>
        </div>
      </div>
    </header>;
}