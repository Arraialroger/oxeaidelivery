import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCoupon, useUpdateCoupon, type Coupon } from '@/hooks/useCoupons';

interface CouponFormProps {
  coupon?: Coupon;
  onSuccess: () => void;
}

export function CouponForm({ coupon, onSuccess }: CouponFormProps) {
  const [code, setCode] = useState(coupon?.code || '');
  const [description, setDescription] = useState(coupon?.description || '');
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>(coupon?.discount_type || 'fixed');
  const [discountValue, setDiscountValue] = useState(coupon?.discount_value?.toString() || '');
  const [minOrderValue, setMinOrderValue] = useState(coupon?.min_order_value?.toString() || '0');
  const [maxUses, setMaxUses] = useState(coupon?.max_uses?.toString() || '');
  const [firstPurchaseOnly, setFirstPurchaseOnly] = useState(coupon?.first_purchase_only || false);
  const [isActive, setIsActive] = useState(coupon?.is_active ?? true);
  const [expiresAt, setExpiresAt] = useState(coupon?.expires_at ? coupon.expires_at.slice(0, 16) : '');

  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      code: code.toUpperCase().trim(),
      description: description || null,
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order_value: parseFloat(minOrderValue) || 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      first_purchase_only: firstPurchaseOnly,
      is_active: isActive,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    if (coupon) {
      await updateCoupon.mutateAsync({ id: coupon.id, ...payload });
    } else {
      await createCoupon.mutateAsync(payload);
    }

    onSuccess();
  };

  const isLoading = createCoupon.isPending || updateCoupon.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Código do Cupom</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="EX: PRIMEIRACOMPRA"
          required
          maxLength={30}
          className="mt-1 uppercase"
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Cupom de boas-vindas"
          maxLength={100}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo de Desconto</Label>
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'fixed' | 'percentage')}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
              <SelectItem value="percentage">Percentual (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="discountValue">
            {discountType === 'fixed' ? 'Valor (R$)' : 'Percentual (%)'}
          </Label>
          <Input
            id="discountValue"
            type="number"
            step="0.01"
            min="0"
            max={discountType === 'percentage' ? '100' : undefined}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="minOrder">Pedido Mínimo (R$)</Label>
          <Input
            id="minOrder"
            type="number"
            step="0.01"
            min="0"
            value={minOrderValue}
            onChange={(e) => setMinOrderValue(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="maxUses">Limite de Usos</Label>
          <Input
            id="maxUses"
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Ilimitado"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="expiresAt">Validade (opcional)</Label>
        <Input
          id="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="mt-1"
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="firstPurchase">Apenas primeira compra</Label>
        <Switch
          id="firstPurchase"
          checked={firstPurchaseOnly}
          onCheckedChange={setFirstPurchaseOnly}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="active">Ativo</Label>
        <Switch
          id="active"
          checked={isActive}
          onCheckedChange={setIsActive}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Salvando...' : coupon ? 'Atualizar Cupom' : 'Criar Cupom'}
      </Button>
    </form>
  );
}
