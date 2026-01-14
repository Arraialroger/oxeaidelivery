import { useState } from 'react';
import { Check, Gift, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoyaltyInfoModal } from './LoyaltyInfoModal';

interface StampCardProps {
  stampsCount: number;
  stampsGoal: number;
  rewardValue: number;
  minOrderValue?: number;
  expiresAt?: string | null;
}

export function StampCard({ 
  stampsCount, 
  stampsGoal, 
  rewardValue,
  minOrderValue = 50,
  expiresAt,
}: StampCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  
  const stamps = Array.from({ length: stampsGoal }, (_, i) => i < stampsCount);
  const hasReward = stampsCount >= stampsGoal;
  const progress = Math.min((stampsCount / stampsGoal) * 100, 100);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getMotivationalMessage = () => {
    if (hasReward) {
      return `🎉 Parabéns! Você tem um brinde de ${formatPrice(rewardValue)} disponível!`;
    }
    const remaining = stampsGoal - stampsCount;
    if (remaining === 1) {
      return '🔥 Falta apenas 1 selo para seu brinde!';
    }
    if (remaining <= 3) {
      return `⭐ Quase lá! Faltam ${remaining} selos para seu brinde.`;
    }
    if (stampsCount === 0) {
      return 'Ganhe selos a cada pedido e troque por brindes!';
    }
    return `Continue pedindo! Faltam ${remaining} selos.`;
  };

  const formatExpirationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  return (
    <>
      <Card className={hasReward ? 'border-primary bg-primary/5' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Cartão Fidelidade
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInfo(true)}
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stamps grid */}
          <div className="grid grid-cols-4 gap-2">
            {stamps.map((filled, index) => (
              <div
                key={index}
                className={`
                  aspect-square rounded-full flex items-center justify-center
                  border-2 transition-all duration-300
                  ${filled 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'bg-muted/30 border-muted-foreground/30'
                  }
                  ${index === stampsCount && !hasReward ? 'animate-pulse border-primary/50' : ''}
                `}
              >
                {filled ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-xs text-muted-foreground">{index + 1}</span>
                )}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{stampsCount}/{stampsGoal} selos</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Motivational message */}
          <p className={`text-sm text-center ${hasReward ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            {getMotivationalMessage()}
          </p>

          {/* Expiration notice */}
          {expiresAt && !hasReward && stampsCount > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Seus selos expiram em {formatExpirationDate(expiresAt)}
            </p>
          )}
        </CardContent>
      </Card>

      <LoyaltyInfoModal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        stampsGoal={stampsGoal}
        rewardValue={rewardValue}
        minOrderValue={minOrderValue}
      />
    </>
  );
}
