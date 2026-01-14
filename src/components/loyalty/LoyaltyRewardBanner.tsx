import { Gift, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface LoyaltyRewardBannerProps {
  stampsCount: number;
  stampsGoal: number;
  rewardValue: number;
  canUse: boolean;
  isUsing: boolean;
  onToggle: () => void;
}

export function LoyaltyRewardBanner({
  stampsCount,
  stampsGoal,
  rewardValue,
  canUse,
  isUsing,
  onToggle,
}: LoyaltyRewardBannerProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // If reward is available, show redemption option
  if (canUse) {
    return (
      <Card 
        className={cn(
          'border-2 transition-all cursor-pointer',
          isUsing 
            ? 'border-primary bg-primary/10' 
            : 'border-primary/50 hover:border-primary'
        )}
        onClick={onToggle}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              isUsing ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
            )}>
              {isUsing ? <Check className="w-5 h-5" /> : <Gift className="w-5 h-5 text-primary" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                🎁 Brinde disponível!
              </p>
              <p className="text-sm text-muted-foreground">
                Desconto de {formatPrice(rewardValue)} neste pedido
              </p>
            </div>
            <Checkbox 
              checked={isUsing} 
              onCheckedChange={onToggle}
              className="h-5 w-5"
            />
          </div>
          {isUsing && (
            <p className="text-xs text-primary mt-2 pl-13">
              ✓ Seus {stampsGoal} selos serão resgatados neste pedido
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Otherwise, show progress
  const remaining = stampsGoal - stampsCount;
  const progress = Math.min((stampsCount / stampsGoal) * 100, 100);

  return (
    <Card className="border-muted">
      <CardContent className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Gift className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">
              Cartão Fidelidade
            </p>
            <p className="text-sm text-muted-foreground">
              {stampsCount}/{stampsGoal} selos • Faltam {remaining} para seu brinde
            </p>
          </div>
        </div>
        {/* Mini progress bar */}
        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
