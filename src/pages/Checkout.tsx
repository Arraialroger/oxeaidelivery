import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, User, MapPin, CreditCard, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Tabs moved to AddressSection component
import { useCart } from "@/contexts/CartContext";
import { useConfig } from "@/hooks/useConfig";
import { useCustomerStamps } from "@/hooks/useCustomerStamps";
import { useLoyaltyRedemption } from "@/hooks/useLoyaltyRedemption";
import { LoyaltyRewardBanner } from "@/components/loyalty/LoyaltyRewardBanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { trackBeginCheckout, trackPurchase, trackAddressMode } from "@/lib/gtag";
import { fbTrackInitiateCheckout, fbTrackPurchase, fbTrackAddressMode } from "@/lib/fbpixel";
import { useAuth } from "@/hooks/useAuth";
import { classifyCustomerType } from "@/lib/customerClassification";
import { useKdsEvents } from "@/hooks/useKdsEvents";
import { useRestaurantContext } from "@/contexts/RestaurantContext";
import { useIsRestaurantOpen } from "@/hooks/useIsRestaurantOpen";
import { AddressSection, DeliveryZoneIndicator, SavedAddressList, type ManualAddressData } from "@/components/checkout";
import { useDeliveryZoneCheck } from "@/hooks/useDeliveryZones";
import { useCheckoutEvents } from "@/hooks/useCheckoutEvents";
import { useSavedAddresses, type SavedAddress } from "@/hooks/useSavedAddresses";
import { CouponInput } from "@/components/checkout/CouponInput";
import { UpsellSection } from "@/components/checkout/UpsellSection";
import type { Coupon } from "@/hooks/useCoupons";

type PaymentMethod = "pix" | "card" | "cash";
type AddressMode = "map" | "manual";

import { formatPhone, getPhoneDigits, isValidPhone } from "@/lib/phoneUtils";
import { formatPrice, formatCurrencyInput, getCurrencyValue } from "@/lib/formatUtils";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { data: config } = useConfig();
  const { toast } = useToast();
  const { user } = useAuth();
  const { logOrderReceived } = useKdsEvents();
  const loyaltyRedemption = useLoyaltyRedemption();
  const { restaurantId, slug } = useRestaurantContext();
  const { isOpen: restaurantIsOpen, nextOpenTime } = useIsRestaurantOpen();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [useReward, setUseReward] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Step 1: Customer Info
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Pre-fill name and phone from profile for logged-in users
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || profileLoaded) return;

      try {
        const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", user.id).maybeSingle();

        if (profile) {
          if (profile.name && !name) {
            setName(profile.name);
          }
          if (profile.phone && !phone) {
            // Format phone for display
            setPhone(formatPhone(profile.phone));
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[CHECKOUT] Erro ao carregar perfil:", error);
        }
      } finally {
        setProfileLoaded(true);
      }
    };

    loadProfile();
  }, [user, profileLoaded]);

  // Step 2: Address
  const [addressMode, setAddressMode] = useState<AddressMode>("map");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [addressLocation, setAddressLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formattedAddress, setFormattedAddress] = useState("");
  const [placeId, setPlaceId] = useState<string | undefined>(undefined);
  const [manualFormErrors, setManualFormErrors] = useState<Partial<Record<keyof ManualAddressData, string>>>({});
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);

  // Saved addresses for returning customers
  const phoneDigitsForAddresses = getPhoneDigits(phone);
  const { data: savedAddresses = [], isLoading: savedAddressesLoading } = useSavedAddresses({
    phone: phoneDigitsForAddresses.length >= 10 ? phoneDigitsForAddresses : null,
    enabled: step >= 2, // Only fetch when on address step or beyond
  });

  // Delivery zone validation
  const { checkZone, zones: deliveryZones, isLoading: zonesLoading } = useDeliveryZoneCheck();
  const [zoneCheckResult, setZoneCheckResult] = useState<ReturnType<typeof checkZone> | null>(null);
  
  // Checkout events tracking
  const { trackEvent, logDeliveryAttempt } = useCheckoutEvents();

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [changeAmount, setChangeAmount] = useState("");
  const [checkoutTracked, setCheckoutTracked] = useState(false);

  // Loyalty: Fetch customer stamps using phone
  const phoneDigits = getPhoneDigits(phone);
  const { data: stamps, refetch: refetchStamps } = useCustomerStamps(
    phoneDigits.length >= 10 ? phoneDigits : null
  );

  // Check if customer can use reward
  const canUseReward = !!(
    config?.loyalty_enabled && 
    (stamps?.stamps_count || 0) >= (config?.loyalty_stamps_goal || 8)
  );

  // Calculate loyalty discount
  const loyaltyDiscount = useReward && canUseReward 
    ? (config?.loyalty_reward_value || 50) 
    : 0;

  const deliveryFee = (() => {
    if (zoneCheckResult?.isValid && zoneCheckResult.zone) {
      const isFreeDelivery = zoneCheckResult.freeDeliveryAbove && subtotal >= zoneCheckResult.freeDeliveryAbove;
      return isFreeDelivery ? 0 : zoneCheckResult.deliveryFee;
    }
    return config?.delivery_fee ?? 0;
  })();
  const total = Math.max(0, subtotal + deliveryFee - loyaltyDiscount - couponDiscount);

  // Track delivery fee changes to show toast when free delivery is achieved (e.g. after upsell)
  const prevDeliveryFeeRef = useRef(deliveryFee);
  useEffect(() => {
    if (prevDeliveryFeeRef.current > 0 && deliveryFee === 0) {
      toast({
        title: "🎉 Entrega Grátis!",
        description: "Parabéns! Você atingiu o valor para entrega gratuita.",
      });
    }
    prevDeliveryFeeRef.current = deliveryFee;
  }, [deliveryFee, toast]);

  // Track begin_checkout event when entering checkout (Google Analytics + Meta Pixel)
  useEffect(() => {
    if (items.length > 0 && !checkoutTracked) {
      const trackingItems = items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));
      trackBeginCheckout(trackingItems, subtotal);
      fbTrackInitiateCheckout(trackingItems, subtotal);
      setCheckoutTracked(true);
    }
  }, [items, subtotal, checkoutTracked]);

  // formatPrice is now imported from @/lib/formatUtils

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);

    // Clear error when typing
    if (phoneError) {
      setPhoneError("");
    }
  };

  const handlePhoneBlur = () => {
    if (phone && !isValidPhone(phone)) {
      setPhoneError("Digite um número de telefone válido");
    }
  };

  // Handle location selection from map or autocomplete
  const handleLocationSelect = useCallback(
    (location: {
      lat: number;
      lng: number;
      formattedAddress: string;
      placeId?: string;
      addressComponents?: google.maps.GeocoderAddressComponent[];
    }) => {
      setAddressLocation({ lat: location.lat, lng: location.lng });
      setFormattedAddress(location.formattedAddress);
      setPlaceId(location.placeId);

      // Try to extract address components
      if (location.addressComponents) {
        const getComponent = (type: string) =>
          location.addressComponents?.find((c) => c.types.includes(type))?.long_name || "";

        const route = getComponent("route");
        const streetNumber = getComponent("street_number");

        if (route) setStreet(route);
        if (streetNumber) setNumber(streetNumber);
        // Bairro is intentionally NOT auto-filled — user fills manually
      }

      // Check delivery zone
      const result = checkZone({ lat: location.lat, lng: location.lng });
      setZoneCheckResult(result);

      if (!result.isValid) {
        trackEvent("address_zone_rejected", "address", {
          lat: location.lat,
          lng: location.lng,
          address: location.formattedAddress,
        });
        logDeliveryAttempt(
          { lat: location.lat, lng: location.lng },
          location.formattedAddress,
          "Fora da área de entrega",
          result.nearestZone?.id,
          getPhoneDigits(phone) || undefined
        );
      }
    },
    [checkZone, trackEvent, logDeliveryAttempt, phone]
  );

  // Handle manual form data change
  const handleManualFormChange = useCallback((data: ManualAddressData) => {
    setStreet(data.street);
    setNumber(data.number);
    setNeighborhood(data.neighborhood);
    setComplement(data.complement);
    setReference(data.reference);
    setManualFormErrors({});
  }, []);

  // Handle saved address selection
  const handleSavedAddressSelect = useCallback((address: SavedAddress) => {
    setSelectedSavedAddressId(address.id);
    setStreet(address.street);
    setNumber(address.number);
    setNeighborhood(address.neighborhood);
    setComplement(address.complement || "");
    setReference(address.reference || "");
    setFormattedAddress(address.formatted_address || "");
    setPlaceId(address.place_id || undefined);
    
    // Set location if available
    if (address.latitude && address.longitude) {
      const coords = { lat: address.latitude, lng: address.longitude };
      setAddressLocation(coords);
      
      // Check delivery zone for saved address
      const result = checkZone(coords);
      setZoneCheckResult(result);
    } else {
      setAddressLocation(null);
      setZoneCheckResult(null);
    }
    
    setShowNewAddressForm(false);
    trackEvent("saved_address_selected", "address", { address_id: address.id });
  }, [checkZone, trackEvent]);

  // Handle new address button click
  const handleNewAddressClick = useCallback(() => {
    setSelectedSavedAddressId(null);
    setShowNewAddressForm(true);
    setStreet("");
    setNumber("");
    setNeighborhood("");
    setComplement("");
    setReference("");
    setFormattedAddress("");
    setPlaceId(undefined);
    setAddressLocation(null);
    setZoneCheckResult(null);
    trackEvent("new_address_started", "address");
  }, [trackEvent]);

  // Validate manual form
  const validateManualForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof ManualAddressData, string>> = {};
    if (!street.trim()) errors.street = "Campo obrigatório";
    if (!number.trim()) errors.number = "Campo obrigatório";
    if (!neighborhood.trim()) errors.neighborhood = "Campo obrigatório";
    if (!reference.trim()) errors.reference = "Campo obrigatório";

    setManualFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [street, number, neighborhood, reference]);

  // Track step changes
  useEffect(() => {
    if (step === 2) {
      trackEvent("address_step_started", "address");
    } else if (step === 3) {
      trackEvent("payment_step_started", "payment");
    }
  }, [step, trackEvent]);

  const handleSubmitOrder = async () => {
    if (import.meta.env.DEV) {
      console.log("[CHECKOUT] Iniciando handleSubmitOrder, items:", items.length);
    }
    setIsSubmitting(true);

    try {
      // Get only digits for storage
      const phoneDigits = getPhoneDigits(phone);

      // Classify customer type with SAFE try-catch
      // This NEVER blocks checkout - if it fails, defaults to 'tourist'
      let customerType: "local" | "tourist" = "tourist";
      try {
        customerType = classifyCustomerType(phone);
      } catch {
        customerType = "tourist";
      }

      // 1. Get or create customer directly
      let customerId: string;
      
      // Check if customer exists by phone AND restaurant_id (multi-tenant)
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", phoneDigits)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        // Update name if provided
        if (name) {
          await supabase
            .from("customers")
            .update({ name, customer_type: customerType })
            .eq("id", customerId);
        }
      } else {
        // Create new customer with restaurant_id
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            phone: phoneDigits,
            name: name || null,
            customer_type: customerType,
            restaurant_id: restaurantId,
          })
          .select("id")
          .single();

        if (customerError) {
          throw customerError;
        }
        customerId = newCustomer.id;
      }

      // 2. Create address with restaurant_id (include geo data if available)
      const { data: address, error: addressError } = await supabase
        .from("addresses")
        .insert({
          customer_id: customerId,
          street,
          number,
          neighborhood,
          complement: complement || null,
          reference: reference || null,
          restaurant_id: restaurantId,
          latitude: addressLocation?.lat || null,
          longitude: addressLocation?.lng || null,
          formatted_address: formattedAddress || null,
          place_id: placeId || null,
          delivery_zone_id: zoneCheckResult?.zone?.id || null,
          address_source: addressMode === "map" ? "map" : "manual",
        })
        .select()
        .single();

      if (addressError) {
        throw addressError;
      }

      // 3. Create order with restaurant_id (include loyalty_discount if using reward)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          address_id: address.id,
          payment_method: paymentMethod,
          change: paymentMethod === "cash" && changeAmount ? changeAmount : null,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          loyalty_discount: loyaltyDiscount,
          stamp_redeemed: useReward && canUseReward,
          status: "pending",
          restaurant_id: restaurantId,
          coupon_id: appliedCoupon?.id || null,
          coupon_discount: couponDiscount,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Process loyalty redemption if customer is using reward
      if (useReward && canUseReward && stamps) {
        try {
          await loyaltyRedemption.mutateAsync({
            customerId,
            orderId: order.id,
            stampsGoal: config?.loyalty_stamps_goal || 8,
            currentStamps: stamps.stamps_count || 0,
            rewardValue: config?.loyalty_reward_value || 50,
          });
        } catch {
          // Silent fail - order was created successfully
        }
      }

      // Record coupon usage
      if (appliedCoupon && couponDiscount > 0) {
        try {
          await supabase.from('coupon_uses').insert({
            coupon_id: appliedCoupon.id,
            order_id: order.id,
            customer_id: customerId,
            restaurant_id: restaurantId,
            discount_applied: couponDiscount,
          });
          await supabase
            .from('coupons')
            .update({ current_uses: appliedCoupon.current_uses + 1 })
            .eq('id', appliedCoupon.id);
        } catch {
          // Silent fail - order was created successfully
        }
      }

      // 4. Create order items
      for (const item of items) {
        const { data: orderItem, error: itemError } = await supabase
          .from("order_items")
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

          const { error: optionsError } = await supabase.from("order_item_options").insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      // Track purchase event (Google Analytics + Meta Pixel)
      const purchaseItems = items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      }));
      trackPurchase(order.id, purchaseItems, total, deliveryFee);
      fbTrackPurchase(order.id, purchaseItems, total);
      trackAddressMode(addressMode, 'completed');
      fbTrackAddressMode(addressMode, 'completed');

      clearCart();

      const targetUrl = `/${slug}/order/${order.id}?new=true`;

      toast({
        title: "Pedido enviado!",
        description: `Pedido #${order.id.slice(0, 8)} foi recebido.`,
      });

      // Registrar evento KDS - fail-safe (não bloqueia navegação)
      logOrderReceived(order.id).catch(() => {});

      navigate(targetUrl);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[CHECKOUT] ERRO:", error);
      }
      toast({
        title: "Erro ao enviar pedido",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate(`/${slug}/menu`);
    return null;
  }

  // Block checkout if restaurant is closed (automatic validation based on business_hours)
  if (!restaurantIsOpen) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Restaurante Fechado</h1>
          <p className="text-muted-foreground mb-4">No momento não estamos aceitando pedidos.</p>
          {nextOpenTime && (
            <p className="text-sm text-primary font-medium mb-6">{nextOpenTime}</p>
          )}
          <Button onClick={() => navigate(`/${slug}/menu`)}>Voltar ao Cardápio</Button>
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
              className={cn("flex-1 h-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-secondary")}
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
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                onBlur={handlePhoneBlur}
                placeholder="(00) 00000-0000"
                className={cn("mt-1", phoneError && "border-destructive")}
              />
              {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">Endereço de Entrega</h2>
            </div>

            {/* Show saved addresses if customer has any */}
            {savedAddresses.length > 0 && !showNewAddressForm ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione um endereço salvo ou cadastre um novo:
                </p>
                <SavedAddressList
                  addresses={savedAddresses}
                  isLoading={savedAddressesLoading}
                  onSelect={handleSavedAddressSelect}
                  onNewAddress={handleNewAddressClick}
                  selectedId={selectedSavedAddressId}
                />

                {/* Zone indicator for selected saved address */}
                {selectedSavedAddressId && zoneCheckResult && (
                  <DeliveryZoneIndicator
                    result={zoneCheckResult}
                    subtotal={subtotal}
                  />
                )}
              </div>
            ) : (
              <>
                {/* Back to saved addresses button */}
                {savedAddresses.length > 0 && showNewAddressForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewAddressForm(false)}
                    className="text-sm text-primary hover:underline mb-2"
                  >
                    ← Voltar para endereços salvos
                  </button>
                )}

                {/* Address Section with automatic fallback */}
                <AddressSection
                  onLocationSelect={handleLocationSelect}
                  onManualDataChange={handleManualFormChange}
                  manualData={{ street, number, neighborhood, complement, reference }}
                  manualErrors={manualFormErrors}
                  selectedLocation={addressLocation}
                  onModeChange={(mode) => {
                    setAddressMode(mode);
                    trackAddressMode(mode, 'selected');
                    fbTrackAddressMode(mode, 'selected');
                  }}
                  initialMode={addressMode}
                  formattedAddress={formattedAddress}
                  onFormattedAddressChange={setFormattedAddress}
                  mapExtraContent={
                    <>
                      {/* Zone indicator */}
                      {zoneCheckResult && (
                        <DeliveryZoneIndicator
                          result={zoneCheckResult}
                          subtotal={subtotal}
                        />
                      )}

                      {/* Show extracted address info */}
                      {addressLocation && (street || neighborhood) && (
                        <div className="p-3 bg-secondary rounded-lg text-sm space-y-1">
                          <p className="font-medium text-foreground">Endereço detectado:</p>
                          {street && <p className="text-muted-foreground">{street}{number ? `, ${number}` : ""}</p>}
                          {neighborhood && <p className="text-muted-foreground">{neighborhood}</p>}
                        </div>
                      )}
                    </>
                  }
                />
              </>
            )}
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
                { value: "pix", label: "Pix na entrega", icon: "📱" },
                { value: "card", label: "Cartão na entrega", icon: "💳" },
                { value: "cash", label: "Dinheiro na entrega", icon: "💵" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPaymentMethod(option.value as PaymentMethod)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border transition-colors",
                    paymentMethod === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  {paymentMethod === option.value && <Check className="w-5 h-5 text-primary" />}
                </button>
              ))}
            </div>

            {/* Loyalty Reward Banner */}
            {config?.loyalty_enabled && phoneDigits.length >= 10 && (
              <LoyaltyRewardBanner
                stampsCount={stamps?.stamps_count || 0}
                stampsGoal={config.loyalty_stamps_goal || 8}
                rewardValue={config.loyalty_reward_value || 50}
                canUse={canUseReward}
                isUsing={useReward}
                onToggle={() => setUseReward(!useReward)}
              />
            )}

            {/* Coupon Input */}
            <CouponInput
              subtotal={subtotal}
              customerPhone={phoneDigits}
              onApply={(coupon, discount) => {
                setAppliedCoupon(coupon);
                setCouponDiscount(discount);
              }}
              onRemove={() => {
                setAppliedCoupon(null);
                setCouponDiscount(0);
              }}
              appliedCoupon={appliedCoupon}
              appliedDiscount={couponDiscount}
            />

            {paymentMethod === "cash" && (
              <div className="mt-4">
                <Label htmlFor="change">Troco para quanto?</Label>
                <Input
                  id="change"
                  type="tel"
                  inputMode="numeric"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(formatCurrencyInput(e.target.value))}
                  placeholder="R$ 0,00"
                  className="mt-1"
                />
                {changeAmount && getCurrencyValue(changeAmount) > 0 && getCurrencyValue(changeAmount) < total && (
                  <p className="text-xs text-destructive mt-1">
                    O valor deve ser maior que o total ({formatPrice(total)})
                  </p>
                )}
              </div>
            )}

            {/* Upsell Suggestions */}
            <UpsellSection cartItems={items} freeDeliveryAbove={zoneCheckResult?.freeDeliveryAbove} currentSubtotal={subtotal} />

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
                    {item.selectedOptions.some((o) => o.type === "combo-selection") && (
                      <div className="mt-1 ml-4">
                        {item.selectedOptions
                          .filter((o) => o.type === "combo-selection")
                          .map((o, idx) => (
                            <p key={idx} className="text-xs text-muted-foreground">
                              • {o.name}
                              {o.price > 0 && <span className="text-primary"> (+{formatPrice(o.price)})</span>}
                            </p>
                          ))}
                      </div>
                    )}
                    {/* Regular options */}
                    {item.selectedOptions.some((o) => o.type !== "combo-selection") && (
                      <p className="text-xs text-muted-foreground mt-1 ml-4">
                        {item.selectedOptions
                          .filter((o) => o.type !== "combo-selection")
                          .map((o) => o.name)
                          .join(", ")}
                      </p>
                    )}
                    {item.note && <p className="text-xs text-muted-foreground italic mt-1 ml-4">"{item.note}"</p>}
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
                  <span>{deliveryFee === 0 && zoneCheckResult?.isValid ? (
                    <span className="text-primary font-medium">Grátis 🎉</span>
                  ) : formatPrice(deliveryFee)}</span>
                </div>
                {/* Free delivery nudge */}
                {zoneCheckResult?.isValid && zoneCheckResult.freeDeliveryAbove && deliveryFee > 0 && (() => {
                  const remaining = zoneCheckResult.freeDeliveryAbove - subtotal;
                  const threshold = zoneCheckResult.freeDeliveryAbove * 0.4; // show when within 40%
                  if (remaining > 0 && remaining <= threshold) {
                    return (
                      <div className="flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-lg animate-pulse">
                        <span>🚚</span>
                        <span>Faltam {formatPrice(remaining)} para entrega grátis!</span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>🎁 Brinde Fidelidade</span>
                    <span>-{formatPrice(loyaltyDiscount)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>🏷️ Cupom {appliedCoupon?.code}</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
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
              (step === 1 && (!name || !phone || !isValidPhone(phone))) ||
              (step === 2 && (!street || !number || !neighborhood || !reference))
            }
            className="w-full h-12 text-base font-semibold"
          >
            Continuar
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground">
              Ao confirmar, você concorda com nossos{" "}
              <a href={`/${slug}/termos`} className="underline hover:text-foreground">
                Termos de Uso
              </a>{" "}
              e{" "}
              <a href={`/${slug}/privacidade`} className="underline hover:text-foreground">
                Política de Privacidade
              </a>
            </p>
            <Button
              onClick={handleSubmitOrder}
              disabled={
                isSubmitting ||
                (paymentMethod === "cash" &&
                  changeAmount &&
                  getCurrencyValue(changeAmount) > 0 &&
                  getCurrencyValue(changeAmount) < total)
              }
              className="w-full h-12 text-base font-semibold"
            >
              {isSubmitting ? "Enviando..." : `Enviar Pedido ${formatPrice(total)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
