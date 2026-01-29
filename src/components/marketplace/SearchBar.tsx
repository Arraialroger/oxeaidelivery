import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Buscar restaurantes...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-4 h-12 bg-card border-border/50 focus:border-primary/50 rounded-xl"
      />
    </div>
  );
}

export function LocationHeader() {
  return (
    <button className="flex items-center gap-2 text-left group">
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Entregar em</p>
        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
          Arraial d'Ajuda, BA
        </p>
      </div>
    </button>
  );
}
