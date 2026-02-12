import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useValidateCoupon, type Coupon } from '@/hooks/useCoupons';
import { Tag, X, Check, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/formatUtils';

interface CouponInputProps {
  subtotal: number;
  customerPhone: string;
  onApply: (coupon: Coupon, discount: number) => void;
  onRemove: () => void;
  appliedCoupon: Coupon | null;
  appliedDiscount: number;
}

export function CouponInput({
  subtotal,
  customerPhone,
  onApply,
  onRemove,
  appliedCoupon,
  appliedDiscount,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const validateCoupon = useValidateCoupon();

  const handleApply = async () => {
    if (!code.trim()) return;
    setError('');

    try {
      const result = await validateCoupon.mutateAsync({
        code: code.trim(),
        subtotal,
        customerPhone,
      });
      onApply(result.coupon, result.discount);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Cupom inválido');
    }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-primary">
              Cupom <code className="font-bold">{appliedCoupon.code}</code> aplicado
            </p>
            <p className="text-xs text-primary/70">
              -{formatPrice(appliedDiscount)} de desconto
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="Código do cupom"
            className="pl-9 uppercase"
            maxLength={30}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={!code.trim() || validateCoupon.isPending}
        >
          {validateCoupon.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
