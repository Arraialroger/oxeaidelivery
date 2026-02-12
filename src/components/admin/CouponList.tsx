import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useCoupons, useDeleteCoupon, type Coupon } from '@/hooks/useCoupons';
import { CouponForm } from './CouponForm';
import { Pencil, Trash2, Tag, Percent } from 'lucide-react';
import { formatPrice } from '@/lib/formatUtils';

export function CouponList() {
  const { data: coupons, isLoading } = useCoupons();
  const deleteCoupon = useDeleteCoupon();
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!coupons?.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum cupom criado ainda.</p>
          <p className="text-sm">Crie seu primeiro cupom para atrair mais clientes!</p>
        </CardContent>
      </Card>
    );
  }

  const isExpired = (coupon: Coupon) =>
    coupon.expires_at && new Date(coupon.expires_at) < new Date();

  const isMaxedOut = (coupon: Coupon) =>
    coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses;

  return (
    <>
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <Card key={coupon.id} className={!coupon.is_active ? 'opacity-60' : ''}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-sm font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {coupon.code}
                    </code>
                    {coupon.is_active && !isExpired(coupon) && !isMaxedOut(coupon) ? (
                      <Badge variant="default" className="text-xs">Ativo</Badge>
                    ) : isExpired(coupon) ? (
                      <Badge variant="destructive" className="text-xs">Expirado</Badge>
                    ) : isMaxedOut(coupon) ? (
                      <Badge variant="secondary" className="text-xs">Esgotado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                    {coupon.first_purchase_only && (
                      <Badge variant="outline" className="text-xs">1ª Compra</Badge>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-1 text-sm">
                    {coupon.discount_type === 'fixed' ? (
                      <>
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{formatPrice(coupon.discount_value)}</span>
                      </>
                    ) : (
                      <>
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{coupon.discount_value}% de desconto</span>
                      </>
                    )}
                    {coupon.min_order_value > 0 && (
                      <span className="text-muted-foreground">
                        · mín. {formatPrice(coupon.min_order_value)}
                      </span>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-muted-foreground">
                    {coupon.max_uses
                      ? `${coupon.current_uses}/${coupon.max_uses} usos`
                      : `${coupon.current_uses} usos`}
                    {coupon.expires_at && (
                      <span>
                        {' · '}Expira em{' '}
                        {new Date(coupon.expires_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {coupon.description && (
                    <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCoupon(coupon)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Excluir este cupom?')) {
                        deleteCoupon.mutate(coupon.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingCoupon} onOpenChange={() => setEditingCoupon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cupom</DialogTitle>
          </DialogHeader>
          {editingCoupon && (
            <CouponForm
              coupon={editingCoupon}
              onSuccess={() => setEditingCoupon(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
