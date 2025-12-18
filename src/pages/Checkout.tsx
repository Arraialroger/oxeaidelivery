import { useState } from 'react';
import { ArrowLeft, User, MapPin, CreditCard, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCart } from '@/contexts/CartContext';
import { useConfig } from '@/hooks/useConfig';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { classifyCustomerType } from '@/lib/customerClassification';

type PaymentMethod = 'pix' | 'card' | 'cash';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { data: config } = useConfig();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Customer Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Address
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [complement, setComplement] = useState('');
  const [reference, setReference] = useState('');

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [changeAmount, setChangeAmount] = useState('');

  const deliveryFee = config?.delivery_fee ?? 0;
  const total = subtotal + deliveryFee;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleSubmitOrder = async () => {
    console.log('[CHECKOUT] ==========================================');
    console.log('[CHECKOUT] Iniciando handleSubmitOrder');
    console.log('[CHECKOUT] Items no carrinho:', items.length);
    setIsSubmitting(true);

    try {
      // 1. Check if customer exists by phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      let customerId: string;

      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('[CHECKOUT] Cliente existente encontrado:', customerId);
      } else {
        // CRITICAL: Classify customer type with SAFE try-catch
        // This NEVER blocks checkout - if it fails, defaults to 'tourist'
        let customerType: 'local' | 'tourist' = 'tourist';
        try {
          customerType = classifyCustomerType(phone);
          console.log('[CHECKOUT] Cliente classificado como:', customerType);
        } catch (classifyError) {
          console.warn('[CHECKOUT] Erro na classificação, usando tourist:', classifyError);
          customerType = 'tourist';
        }

        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ phone, name, customer_type: customerType })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
        console.log('[CHECKOUT] Novo cliente criado:', customerId, 'Tipo:', customerType);
      }

      // 2. Create address
      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .insert({
          customer_id: customerId,
          street,
          number,
          neighborhood,
          complement: complement || null,
          reference: reference || null,
        })
        .select()
        .single();

      if (addressError) throw addressError;
      console.log('[CHECKOUT] Endereço criado:', address.id);

      // 3. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          address_id: address.id,
          payment_method: paymentMethod,
          change: paymentMethod === 'cash' && changeAmount ? changeAmount : null,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 🔍 LOG CRÍTICO: Ver o objeto order completo
      console.log('[CHECKOUT] ==========================================');
      console.log('[CHECKOUT] PEDIDO CRIADO COM SUCESSO!');
      console.log('[CHECKOUT] Objeto order completo:', JSON.stringify(order, null, 2));
      console.log('[CHECKOUT] order.id:', order.id);
      console.log('[CHECKOUT] typeof order.id:', typeof order.id);

      // 4. Create order items
      for (const item of items) {
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            note: item.note || null,
          })
          .select()
          .single();

        if (itemError) throw itemError;

        if (item.selectedOptions.length > 0) {
          const optionsToInsert = item.selectedOptions.map((opt) => ({
            order_item_id: orderItem.id,
            option_name: opt.name,
            option_price: opt.price,
          }));

          const { error: optionsError } = await supabase
            .from('order_item_options')
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      console.log('[CHECKOUT] Todos os itens criados com sucesso');

      clearCart();

      // 🔍 LOG CRÍTICO: URL de navegação
      const targetUrl = `/order/${order.id}?new=true`;
      console.log('[CHECKOUT] ==========================================');
      console.log('[CHECKOUT] NAVEGANDO PARA:', targetUrl);
      console.log('[CHECKOUT] ==========================================');

      toast({
        title: 'Pedido enviado!',
        description: `Pedido #${order.id.slice(0, 8)} foi recebido.`,
      });

      navigate(targetUrl);
    } catch (error) {
      console.error('[CHECKOUT] ==========================================');
      console.error('[CHECKOUT] ERRO NO CHECKOUT:', error);
      console.error('[CHECKOUT] ==========================================');
      toast({
        title: 'Erro ao enviar pedido',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate('/');
    return null;
  }

  // Block checkout if restaurant is closed
  if (!config?.restaurant_open) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Restaurante Fechado
          </h1>
          <p className="text-muted-foreground mb-6">
            No momento não estamos aceitando pedidos. Volte mais tarde!
          </p>
          <Button onClick={() => navigate('/')}>
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Finalizar Pedido</h1>
        </div>

        {/* Progress */}
        <div className="flex px-4 pb-4 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'flex-1 h-1 rounded-full transition-colors',
                s <= step ? 'bg-primary' : 'bg-secondary'
              )}
            />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-32">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Seus Dados</h2>
            </div>

            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Endereço de Entrega</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Nome da rua"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="123"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Nome do bairro"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                placeholder="Apto, bloco, etc."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reference">Ponto de Referência *</Label>
              <Textarea
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: Próximo à padaria, portão azul..."
                className="mt-1"
                required
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Forma de Pagamento</h2>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { value: 'pix', label: 'Pix', icon: '📱' },
                { value: 'card', label: 'Cartão na entrega', icon: '💳' },
                { value: 'cash', label: 'Dinheiro', icon: '💵' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPaymentMethod(option.value as PaymentMethod)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-colors',
                    paymentMethod === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  {paymentMethod === option.value && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="mt-4">
                <Label htmlFor="change">Troco para quanto?</Label>
                <Input
                  id="change"
                  type="number"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  placeholder="Ex: 100"
                  className="mt-1"
                />
              </div>
            )}

            {/* Order Summary */}
            <div className="mt-6 p-4 bg-secondary rounded-xl">
              <h3 className="font-semibold mb-3">Resumo do Pedido</h3>
              <div className="flex flex-col gap-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="flex justify-between">
                      <span className="text-foreground font-medium">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="text-foreground">{formatPrice(item.totalPrice)}</span>
                    </div>
                    {/* Combo selections */}
                    {item.selectedOptions.some(o => o.type === 'combo-selection') && (
                      <div className="mt-1 ml-4">
                        {item.selectedOptions
                          .filter(o => o.type === 'combo-selection')
                          .map((o, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              • {o.name}
                              {o.price > 0 && <span className="text-primary"> (+{formatPrice(o.price)})</span>}
                            </p>
                          ))}
                      </div>
                    )}
                    {/* Regular options */}
                    {item.selectedOptions.some(o => o.type !== 'combo-selection') && (
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {item.selectedOptions.filter(o => o.type !== 'combo-selection').map(o => o.name).join(', ')}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-muted-foreground italic mt-1 ml-4">"{item.note}"</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-3 pt-3 flex flex-col gap-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>{formatPrice(deliveryFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border safe-bottom">
        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={
              (step === 1 && (!name || !phone)) ||
              (step === 2 && (!street || !number || !neighborhood || !reference))
            }
            className="w-full h-12 text-base font-semibold"
          >
            Continuar
          </Button>
        ) : (
          <Button
            onClick={handleSubmitOrder}
            disabled={isSubmitting}
            className="w-full h-12 text-base font-semibold"
          >
            {isSubmitting ? 'Enviando...' : `Enviar Pedido ${formatPrice(total)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
