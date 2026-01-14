import { X, Gift, ShoppingBag, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoyaltyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  stampsGoal: number;
  rewardValue: number;
  minOrderValue: number;
}

export function LoyaltyInfoModal({
  isOpen,
  onClose,
  stampsGoal,
  rewardValue,
  minOrderValue,
}: LoyaltyInfoModalProps) {
  if (!isOpen) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const rules = [
    {
      icon: ShoppingBag,
      title: 'Como ganhar selos',
      description: `A cada pedido acima de ${formatPrice(minOrderValue)}, você ganha 1 selo.`,
    },
    {
      icon: Gift,
      title: 'Seu brinde',
      description: `Complete ${stampsGoal} selos e ganhe ${formatPrice(rewardValue)} de desconto!`,
    },
    {
      icon: Clock,
      title: 'Validade',
      description: 'Seus selos são válidos por 180 dias a partir do último selo ganho.',
    },
    {
      icon: Star,
      title: 'Resgate',
      description: 'Use seu brinde no próximo pedido. O desconto é aplicado automaticamente.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card rounded-2xl w-full max-w-md shadow-xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg text-foreground">
              Programa de Fidelidade
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {rules.map((rule, index) => {
            const Icon = rule.icon;
            return (
              <div key={index} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{rule.title}</h3>
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button onClick={onClose} className="w-full">
            Entendi!
          </Button>
        </div>
      </div>
    </div>
  );
}
