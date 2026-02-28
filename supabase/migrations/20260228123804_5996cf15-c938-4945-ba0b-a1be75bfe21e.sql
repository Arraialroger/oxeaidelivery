
-- =============================================
-- LIMPEZA COMPLETA DE DADOS DE TESTE (v2)
-- Preserva: plans, profiles, user_roles
-- =============================================

-- PRIMEIRO: Limpar referências órfãs em user_roles
UPDATE public.user_roles SET restaurant_id = NULL WHERE restaurant_id IS NOT NULL;

-- Camada 5 (folhas)
DELETE FROM public.reconciliation_runs;
DELETE FROM public.order_audit_log;
DELETE FROM public.onboarding_events;
DELETE FROM public.push_subscriptions;
DELETE FROM public.referral_clicks;
DELETE FROM public.delivery_attempts_log;
DELETE FROM public.checkout_events;
DELETE FROM public.kds_events;
DELETE FROM public.sms_codes;
DELETE FROM public.upsell_events;
DELETE FROM public.system_health_events;

-- Camada 4
DELETE FROM public.notification_queue;
DELETE FROM public.payment_events;
DELETE FROM public.payment_alerts;
DELETE FROM public.stamp_transactions;
DELETE FROM public.coupon_uses;
DELETE FROM public.combo_slot_products;

-- Camada 3
DELETE FROM public.order_item_options;
DELETE FROM public.combo_slots;

-- Camada 2
DELETE FROM public.order_items;
DELETE FROM public.payments;

-- Camada 1
DELETE FROM public.orders;
DELETE FROM public.addresses;
DELETE FROM public.customers;
DELETE FROM public.product_options;
DELETE FROM public.coupons;
DELETE FROM public.delivery_zones;
DELETE FROM public.business_hours;
DELETE FROM public.restaurant_payment_settings;
DELETE FROM public.upsell_products;

-- Camada 0
DELETE FROM public.products;
DELETE FROM public.subscriptions;
DELETE FROM public.categories;

-- Raiz
DELETE FROM public.restaurants;
