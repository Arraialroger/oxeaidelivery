import { useState, useEffect } from 'react';
import { X, Minus, Plus, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useProductOptions } from '@/hooks/useProductOptions';
import { useCart } from '@/contexts/CartContext';
import { cn } from '@/lib/utils';
import type { Product, SelectedOption } from '@/types';
import { ComboModal } from './ComboModal';
import { ImageZoomModal } from './ImageZoomModal';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);
  const [note, setNote] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const { data: options = [] } = useProductOptions(product?.id ?? null);
  const { addItem } = useCart();

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSelectedOptions([]);
      setNote('');
      setIsShaking(false);
      setHighlightMissing(false);
      setIsImageZoomed(false);
    }
  }, [isOpen, product?.id]);

  if (!isOpen || !product) return null;

  // Render ComboModal for combo products
  if (product.is_combo) {
    return <ComboModal product={product} isOpen={isOpen} onClose={onClose} />;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const groupedOptions = options.reduce((acc, option) => {
    const key = option.group_name || option.type;
    if (!acc[key]) {
      acc[key] = { type: option.type, items: [], groupName: key };
    }
    acc[key].items.push(option);
    return acc;
  }, {} as Record<string, { type: string; items: typeof options; groupName: string }>);

  // Verificar grupos obrigatórios e quais estão faltando
  const mandatoryGroups = Object.entries(groupedOptions)
    .filter(([_, group]) => group.type === 'mandatory');
  
  // Corrigido: verificar se há alguma opção selecionada do tipo mandatory para cada grupo
  const missingMandatoryGroups = mandatoryGroups.filter(([groupName]) => {
    // Verifica se existe alguma opção selecionada que pertence a este grupo
    const hasSelectedInGroup = selectedOptions.some(selected => {
      // A opção pode ter groupName igual ao groupName do grupo OU
      // se groupName for undefined, verifica se é do tipo mandatory
      return selected.groupName === groupName || 
             (selected.groupName === undefined && selected.type === 'mandatory' && groupName === 'mandatory');
    });
    return !hasSelectedInGroup;
  });

  const canAddToCart = missingMandatoryGroups.length === 0;

  // Verifica se um grupo específico está faltando
  const isGroupMissing = (groupName: string) => {
    return missingMandatoryGroups.some(([name]) => name === groupName);
  };

  const handleOptionToggle = (option: typeof options[0], groupType: string) => {
    const selected: SelectedOption = {
      id: option.id,
      name: option.name,
      price: option.price || 0,
      type: option.type,
      groupName: option.group_name || groupType,
    };

    if (groupType === 'mandatory' || groupType === 'swap') {
      // Single selection for mandatory and swap - filtra pelo groupName correto
      setSelectedOptions((prev) => {
        const filtered = prev.filter(
          (o) => o.groupName !== selected.groupName
        );
        return [...filtered, selected];
      });
    } else {
      // Toggle for addon/removal
      setSelectedOptions((prev) => {
        const exists = prev.find((o) => o.id === option.id);
        if (exists) {
          return prev.filter((o) => o.id !== option.id);
        }
        return [...prev, selected];
      });
    }
    
    // Remove highlight quando seleciona algo
    if (highlightMissing) {
      setHighlightMissing(false);
    }
  };

  const isOptionSelected = (optionId: string) => {
    return selectedOptions.some((o) => o.id === optionId);
  };

  const optionsTotal = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
  const totalPrice = (product.price + optionsTotal) * quantity;

  const handleAddToCart = () => {
    if (!canAddToCart) {
      setIsShaking(true);
      setHighlightMissing(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }
    addItem(product, quantity, selectedOptions, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col">
        {/* Header Image */}
        {product.image_url && (
          <div 
            className="relative h-48 flex-shrink-0 cursor-zoom-in group"
            onClick={() => setIsImageZoomed(true)}
            role="button"
            aria-label="Clique para ampliar a imagem"
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
            
            {/* Indicador de zoom */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-full opacity-80 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Ampliar</span>
            </div>
          </div>
        )}

        {/* Modal de imagem ampliada */}
        {product.image_url && (
          <ImageZoomModal
            imageUrl={product.image_url}
            alt={product.name}
            isOpen={isImageZoomed}
            onClose={() => setIsImageZoomed(false)}
          />
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
          {product.description && (
            <p className="text-muted-foreground mt-1">{product.description}</p>
          )}
          <p className="text-primary font-bold text-lg mt-2">
            {formatPrice(product.price)}
          </p>

          {/* Options */}
          {Object.entries(groupedOptions).map(([groupName, group]) => {
            const isMissing = highlightMissing && isGroupMissing(groupName);
            return (
            <div 
              key={groupName} 
              className={cn(
                "mt-6 p-3 -mx-3 rounded-lg transition-all",
                isMissing && "bg-destructive/10 border-2 border-destructive animate-pulse"
              )}
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className={cn(
                  "font-semibold capitalize",
                  isMissing ? "text-destructive" : "text-foreground"
                )}>
                  {groupName === 'mandatory' ? 'Escolha obrigatória' : 
                   groupName === 'addon' ? 'Adicionais' :
                   groupName === 'removal' ? 'Remover ingredientes' :
                   groupName === 'swap' ? 'Trocar por' : groupName}
                </h3>
                {group.type === 'mandatory' && (
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isMissing 
                      ? "bg-destructive/20 text-destructive font-semibold" 
                      : "bg-primary/20 text-primary"
                  )}>
                    {isMissing ? "⚠️ Selecione" : "Obrigatório"}
                  </span>
                )}
                {group.type === 'swap' && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                    Escolha 1
                  </span>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {group.items.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionToggle(option, group.type)}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-colors',
                      isOptionSelected(option.id)
                        ? 'border-primary bg-primary/10'
                        : isMissing 
                          ? 'border-destructive/50 hover:border-destructive bg-card'
                          : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-foreground">{option.name}</span>
                    {option.price && option.price > 0 ? (
                      <span className="text-primary font-medium">
                        +{formatPrice(option.price)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          );})}

          {/* Note */}
          <div className="mt-6">
            <h3 className="font-semibold text-foreground mb-2">Observações</h3>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Sem cebola, molho à parte..."
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 border-t border-border bg-card safe-bottom">
          <div className="flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center gap-3 bg-secondary rounded-full p-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full bg-card flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add Button */}
            <Button
              onClick={handleAddToCart}
              className={cn(
                "flex-1 h-12 text-base font-semibold",
                isShaking && "animate-shake",
                !canAddToCart && "bg-muted text-muted-foreground hover:bg-muted"
              )}
            >
              {!canAddToCart 
                ? `Selecione: ${missingMandatoryGroups.map(([name]) => name).join(', ')}`
                : `Adicionar ${formatPrice(totalPrice)}`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
