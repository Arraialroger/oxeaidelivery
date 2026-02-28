

# Plano de Limpeza Completa do Banco de Dados

## Diagnostico Atual

| Tabela | Registros | Acao |
|--------|-----------|------|
| plans | 3 | MANTER |
| profiles | 1 | MANTER |
| user_roles | 5 | MANTER |
| restaurants | 4 | APAGAR |
| orders | 11 | APAGAR |
| products | 22 | APAGAR |
| categories | 15 | APAGAR |
| business_hours | 14 | APAGAR |
| delivery_zones | 3 | APAGAR |
| coupons | 1 | APAGAR |
| product_options | 4 | APAGAR |
| subscriptions | 2 | APAGAR |
| onboarding_events | 3 | APAGAR |
| order_audit_log | 2 | APAGAR |
| reconciliation_runs | 1423 | APAGAR |
| push_subscriptions | 1 | APAGAR |

Tabelas ja vazias (sem acao necessaria): addresses, customers, payments, payment_events, payment_alerts, order_items, order_item_options, stamp_transactions, coupon_uses, checkout_events, kds_events, combo_slots, combo_slot_products, sms_codes, referral_clicks, delivery_attempts_log, notification_queue, system_health_events, restaurant_payment_settings.

## Ordem de Execucao (respeitando foreign keys)

A limpeza sera feita em uma unica operacao SQL, na seguinte ordem para evitar violacoes de FK:

1. **Camada 5 (folhas):** reconciliation_runs, order_audit_log, onboarding_events, push_subscriptions, referral_clicks, delivery_attempts_log, checkout_events, kds_events, sms_codes
2. **Camada 4:** notification_queue, payment_events, payment_alerts, stamp_transactions, coupon_uses, combo_slot_products
3. **Camada 3:** order_item_options, combo_slots
4. **Camada 2:** order_items, payments
5. **Camada 1:** orders, addresses, customers, product_options, coupons, delivery_zones, business_hours, restaurant_payment_settings
6. **Camada 0:** products, subscriptions, categories
7. **Raiz:** restaurants

## O que sera preservado

- **plans** (3 registros) -- estrutura de planos (free, pro, enterprise)
- **profiles** (1 registro) -- seu perfil de usuario autenticado
- **user_roles** (5 registros) -- suas permissoes de admin/super_admin

## Importante

Apos a limpeza, os user_roles que apontam para restaurant_id ficam orfaos (o restaurante nao existira mais). Vou limpar apenas os user_roles que referenciam restaurantes apagados, mantendo os que nao tem restaurant_id (como super_admin).

## Detalhes Tecnicos

Sera executado via ferramenta de insercao/delecao (nao migration, pois e operacao de dados). Cada DELETE sera executado em sequencia respeitando a ordem acima. Ao final, os user_roles com restaurant_id serao limpos para evitar referencias orfas -- o campo sera setado para NULL, mantendo o role intacto.

Apos a limpeza, voce podera testar o fluxo completo de onboarding criando um novo restaurante pelo wizard.

