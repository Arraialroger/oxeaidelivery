import { cn } from '@/lib/utils';
import { 
  Utensils, 
  Pizza, 
  IceCream, 
  Coffee, 
  Cake,
  Sandwich,
  UtensilsCrossed
} from 'lucide-react';

interface Category {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'all', label: 'Todos', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { id: 'hamburgueria', label: 'Hambúrguer', icon: <Sandwich className="w-5 h-5" /> },
  { id: 'pizzaria', label: 'Pizza', icon: <Pizza className="w-5 h-5" /> },
  { id: 'sorveteria', label: 'Sorvete', icon: <IceCream className="w-5 h-5" /> },
  { id: 'acaiteria', label: 'Açaí', icon: <IceCream className="w-5 h-5" /> },
  { id: 'restaurante', label: 'Restaurante', icon: <Utensils className="w-5 h-5" /> },
  { id: 'cafeteria', label: 'Café', icon: <Coffee className="w-5 h-5" /> },
  { id: 'doceria', label: 'Doces', icon: <Cake className="w-5 h-5" /> },
];

interface CategoryFilterProps {
  activeCategory: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryFilter({ activeCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 py-2">
      <div className="flex gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              'flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all min-w-[80px]',
              activeCategory === category.id
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/50'
            )}
          >
            {category.icon}
            <span className="text-xs font-medium whitespace-nowrap">{category.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
