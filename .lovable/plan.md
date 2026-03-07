

# Diagnóstico Técnico Completo da Plataforma Arraial Delivery

---

## 1. Arquitetura Atual

### Estrutura de Pastas

```text
src/
├── components/       # UI (admin/, cart/, checkout/, kitchen/, layout/, loyalty/, menu/, platform/, pwa/, restaurant/, ui/)
├── contexts/         # CartContext, RestaurantContext (2 contextos globais)
├── hooks/            # ~50 hooks customizados (queries, mutations, realtime)
├── integrations/     # Supabase client + types gerados
├── lib/              # Utilitários (formatação, analytics, tema, classificação)
├── pages/            # 16 páginas (rotas)
├── types/            # Tipos (restaurant.ts, index.ts)
supabase/
├── functions/        # 11 Edge Functions (Deno)
├── migrations/       # 57 migrations SQL
├── config.toml       # Configuração das Edge Functions
```

### Separação Frontend / Backend / Infra

- **Frontend**: React SPA com Vite, Tailwind, Radix UI. Code splitting via `React.lazy()` para rotas pesadas (Admin, Kitchen, Checkout).
- **Backend**: 100% Supabase — banco PostgreSQL com RLS, 11 Edge Functions (Deno), 16+ funções SQL `SECURITY DEFINER`, triggers para classificação de clientes e alertas.
- **Infra**: Supabase hospedado, pg_cron para tarefas agendadas (4 jobs), pg_net para HTTP interno, PWA com service worker para push notifications.

### Padrões Adotados

- **Sem service layer nem repository pattern** — hooks React fazem queries diretas ao Supabase client. Não há camada de abstração entre UI e dados.
- **Hook-per-feature**: Cada funcionalidade tem seu hook (`useProducts`, `useConfig`, `useDashboardMetrics`, etc.).
- **RPC para operações complexas**: `create_order_transaction`, `get_dashboard_metrics`, `get_top_products`, `get_customers_with_stats`, `get_platform_restaurants_overview`.
- **Mutations centralizadas** em hooks como `useAdminMutations`.

### Edge Functions (11 funções)

| Função | Propósito | Auth |
|--------|-----------|------|
| `create-order` | Criação atômica de pedido via RPC | `verify_jwt = false`, sem auth interna |
| `process-payment` | Criação de pagamento PIX (Mercado Pago) | `verify_jwt = false`, CORS restrito |
| `payment-webhook` | Recebe callbacks do Mercado Pago | `verify_jwt = false`, sem HMAC |
| `reconcile-payments` | Reconciliação de pagamentos órfãos | CRON_SECRET ou admin JWT |
| `health-check` | Verificação de saúde do sistema | CRON_SECRET ou admin JWT |
| `process-notifications` | Envio de alertas via Telegram | CRON_SECRET ou admin JWT |
| `credit-stamp` | Crédito de selo de fidelidade | `verify_jwt = false` |
| `create-restaurant` | Onboarding de novo restaurante | `verify_jwt = false` |
| `save-payment-settings` | Salva config de pagamento | `verify_jwt = false` |
| `generate-vapid-keys` | Geração de chaves VAPID | `verify_jwt = false` |
| `send-push-notification` | Push notification unitária | `verify_jwt = false` |

### Realtime

Supabase Realtime utilizado em **8 locais**:
- `Kitchen.tsx` — pedidos em tempo real
- `PixPaymentModal.tsx` — status de pagamento PIX
- `OrderTracking.tsx` — acompanhamento do pedido pelo cliente
- `usePaymentMonitor.ts` — alertas de pagamento (admin)
- `useSystemHealth.ts` — eventos de saúde (admin)
- `useNotificationQueue.ts` — fila de notificações
- `usePlatformPaymentMonitor.ts` — monitor global (super admin)
- `usePlatformSystemHealth.ts` — saúde global (super admin)

Padrão: `supabase.channel().on('postgres_changes', ...).subscribe()` com cleanup via `supabase.removeChannel()`.

---

## 2. Fluxo Completo do Pedido

```text
1. CHECKOUT (frontend)
   └─ useCheckoutSubmit → Edge Function "create-order"
       └─ RPC "create_order_transaction" (SQL atômico):
           ├─ Idempotência (chave 5min)
           ├─ Upsert customer
           ├─ Insert address
           ├─ Insert order + items + options
           ├─ Process loyalty (stamps)
           ├─ Process coupon
           └─ Audit log

2. PAGAMENTO PIX (se pix_online)
   └─ Edge Function "process-payment"
       ├─ Resolve token (own_gateway vs platform)
       ├─ MercadoPagoProvider.createPixPayment()
       ├─ Insert registro em "payments"
       └─ Retorna QR code

3. WEBHOOK
   └─ Edge Function "payment-webhook"
       ├─ Lookup payment por provider_payment_id
       ├─ Resolve MP token por restaurante
       ├─ Verifica com API do Mercado Pago
       ├─ Atualiza status do payment
       ├─ Se approved → order.status = "preparing"
       ├─ Se rejected → order.status = "cancelled"
       ├─ Registra payment_event
       └─ Emite kds_event

4. RECONCILIAÇÃO (cron 5min)
   └─ Edge Function "reconcile-payments"
       ├─ Busca pagamentos pending > 30min
       ├─ Verifica status no Mercado Pago
       ├─ Corrige inconsistências
       ├─ Expira PIX > 24h
       └─ Registra reconciliation_run

5. MONITORAMENTO
   ├─ health-check (cron 10min) → verifica DB, pedidos pendentes, pagamentos
   ├─ system_health_events → trigger → notification_queue → process-notifications → Telegram
   └─ payment_alerts → dashboard admin
```

---

## 3. Confiabilidade e Resiliência

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Idempotência** | ✅ Implementada | Hash do carrinho em janela de 5min, verificação no SQL |
| **Retry automático** | ✅ Frontend | useCheckoutSubmit: 2 tentativas com 2s delay |
| **Tratamento de falhas** | ✅ Parcial | Erros mapeados (VALIDATION, RATE_LIMIT, TIMEOUT), mas sem dead-letter |
| **Proteção contra duplicação** | ✅ | Idempotency key no pedido + X-Idempotency-Key no MP |
| **Logs estruturados** | ✅ | JSON com correlation_id em todas as Edge Functions |
| **Monitoramento** | ✅ | Health-check a cada 10min, painel de saúde no admin |
| **Alertas** | ✅ | Trigger automático → Telegram para eventos críticos |
| **Observabilidade** | ✅ | order_audit_log, payment_events, system_health_events, reconciliation_runs |
| **Dead-letter / fallback** | ❌ | notification_queue tem max_attempts=3, mas não há DLQ formal |
| **Circuit breaker** | ❌ | Não implementado |
| **Retry no webhook** | ❌ | Depende do Mercado Pago reenviar |

---

## 4. Segurança

### O que está implementado ✅
- **RLS abrangente**: Todas as 30+ tabelas têm políticas RLS ativas
- **Isolamento multi-tenant**: `get_user_restaurant_id()`, `is_restaurant_owner()`, `is_valid_restaurant()` — todas `SECURITY DEFINER` com `search_path = public`
- **Roles separadas**: Tabela `user_roles` com enum `app_role` (admin, moderator, user, super_admin)
- **Tokens criptografados**: Pagamento usa `pgcrypto` (AES) com `PAYMENT_ENCRYPTION_KEY`
- **CORS restrito** em `create-order` e `process-payment` (whitelist de domínios)
- **Rate limiting** em `create-order` (10/min por IP, 200/h por restaurante)

### Vulnerabilidades e riscos ⚠️
1. **Todas as 11 Edge Functions com `verify_jwt = false`** — funções como `credit-stamp`, `save-payment-settings`, `create-restaurant` não validam autenticação internamente
2. **Webhook sem verificação HMAC** — `payment-webhook` não valida assinatura do Mercado Pago, vulnerável a webhooks forjados
3. **CORS `*` em 6 funções** — `reconcile-payments`, `health-check`, `process-notifications`, `payment-webhook`, `credit-stamp`, `send-push-notification`
4. **`create-order` sem autenticação** — qualquer pessoa pode criar pedidos (intencional para clientes anônimos, mas sem proteção contra abuso além do rate limit)
5. **Sem proteção CSRF** — não aplicável em SPA, mas sem validação de origin no webhook

---

## 5. Escalabilidade

### Gargalos atuais
1. **Kitchen.tsx (1.845 linhas)** — monolito que vai quebrar em manutenção e gerar re-renders desnecessários
2. **Checkout.tsx (829 linhas)** — segundo maior componente monolítico
3. **Supabase free/pro tier** — limite de 500 conexões simultâneas no pooler, pode ser gargalo com múltiplos restaurantes
4. **Rate limiting in-memory** nas Edge Functions — reseta a cada cold start, não protege realmente em cenários de escala
5. **Sem CDN/cache** para queries de catálogo — toda visita ao menu faz query ao DB

### O que escala bem
- **Multi-tenant** via `restaurant_id` em todas as tabelas com RLS
- **RPC para métricas** — processamento no server (SQL JOINs), não no client
- **Code splitting** — Admin e Kitchen não são carregados para clientes
- **PWA** — reduz carga de servidor com cache local
- **Webhook multi-tenant** — resolve token por restaurante automaticamente

### Limitações do Supabase
- 1000 rows default limit por query (pode causar bugs silenciosos com crescimento)
- Realtime tem limite de canais simultâneos por projeto
- Edge Functions têm cold start e timeout de 60s (configurável até 150s no Pro)

---

## 6. Preparação para Produção

### ✅ Pronto
- Fluxo completo de pedido E2E (criação → pagamento → webhook → KDS)
- Multi-tenant funcional com isolamento RLS
- Gateway de pagamento multi-tenant (own_gateway + plataforma)
- Sistema de fidelidade
- Zonas de entrega com geolocalização
- Dashboard com métricas
- Onboarding de restaurantes
- PWA com push notifications
- Sistema de cupons
- Alertas críticos via Telegram
- Reconciliação automática de pagamentos
- Limpeza semanal de dados (db-cleanup-weekly)

### ❌ Falta antes de operar com restaurantes reais
1. **Verificação HMAC no webhook** — risco de fraude
2. **Auth nas Edge Functions críticas** — `credit-stamp` e `save-payment-settings` precisam validar admin
3. **Testes E2E automatizados** — zero testes hoje
4. **Billing automático** — tabelas `plans` e `subscriptions` existem mas sem integração com Stripe/Asaas
5. **WhatsApp Business API** — sem integração de comunicação com clientes
6. **Refatoração Kitchen + Checkout** — instabilidade em alto volume

### Riscos críticos para lançamento
- Webhook forjado pode aprovar pagamentos falsos
- Edge Functions sem auth podem ser abusadas
- Rate limiting em memória não persiste entre cold starts

---

## 7. Dívida Técnica

1. **Componentes monolíticos** (Kitchen 1845 LOC, Checkout 829 LOC) — bugs difíceis de isolar
2. **Sem service layer** — lógica de negócio misturada com UI nos hooks
3. **57 migrations** — sem squash, onboarding lento para novos devs
4. **Sem testes** — zero unitários, zero E2E, zero de integração
5. **CORS `*` generalizado** — precisa ser restrito por função
6. **Colunas legadas** nas tabelas (ex: `troco`, `ponto_referencia`, `complemento` duplicados em `addresses`)
7. **Tracking scripts inline** (fb_pixel, gtag) — vulnerável a XSS se IDs forem manipulados (deveria sanitizar)
8. **Sem versionamento de API** — mudanças na RPC quebram frontend sem aviso
9. **QueryClient sem configuração** — `new QueryClient()` sem staleTime, gcTime, retry customizado

---

## 8. Roadmap Técnico Recomendado

### Próximos 3 Passos Prioritários (Semana 1-2)
1. **Implementar verificação HMAC** no `payment-webhook` + adicionar auth em `credit-stamp` e `save-payment-settings`
2. **Refatorar Kitchen.tsx** em 6-8 componentes menores (KdsOrderCard, KdsFilters, KdsStats, KdsPrintDialog, etc.)
3. **Configurar QueryClient** com staleTime, retry e error boundaries globais

### Próximos 30 Dias
4. Refatorar Checkout.tsx em componentes modulares
5. Implementar testes E2E para fluxo crítico (pedido → pagamento → webhook)
6. Restringir CORS em todas as Edge Functions
7. Integrar billing (Stripe ou Asaas) para cobrar assinaturas
8. Adicionar WhatsApp Business API para confirmação de pedidos
9. Implementar rate limiting persistente (via tabela no DB ou Redis)

### Preparação para Escalar em Cidades Turísticas
10. Cache de catálogo (staleTime longo para Menu queries)
11. Implementar domínio customizado por restaurante
12. SEO dinâmico por restaurante (meta tags, sitemap)
13. CDN para imagens de produtos (Supabase Storage já suporta)
14. Monitoramento de performance por restaurante (métricas de latência)

---

## 9. Avaliação Geral

### Classificação: **MVP Avançado** (quase Beta)

**Justificativa:**
- ✅ Fluxo E2E funcional e transacional com idempotência
- ✅ Multi-tenant real com isolamento RLS robusto
- ✅ Infraestrutura financeira (pagamento, reconciliação, auditoria)
- ✅ Observabilidade (logs, alertas, health-check)
- ⚠️ Segurança incompleta (webhook sem HMAC, Edge Functions sem auth)
- ❌ Zero testes automatizados
- ❌ Sem billing automático
- ❌ Componentes monolíticos arriscados para operação real

Está acima de um MVP típico pela robustez da arquitetura de pagamentos e observabilidade, mas abaixo de Beta porque faltam testes, segurança de webhook e billing. Pode operar como **piloto controlado** com 1-3 restaurantes sob supervisão direta.

---

## 10. Recomendações Estratégicas

Para competir como alternativa ao iFood em cidades turísticas:

1. **Segurança primeiro** — Um webhook fraudulento pode destruir a confiança de restaurantes. HMAC é o bloqueador #1.

2. **Billing antes de growth** — Sem cobrança automática, cada novo restaurante é custo operacional. Integrar Stripe/Asaas antes de escalar.

3. **WhatsApp é o canal** — Em cidades turísticas brasileiras, WhatsApp é mais importante que push notification. Priorizar integração com API oficial.

4. **Testes E2E como seguro** — O fluxo de checkout é complexo demais para depender de testes manuais. Cada deploy é um risco.

5. **Kitchen.tsx é bomba-relógio** — Um componente de 1845 linhas controlando a operação da cozinha vai falhar em momento crítico (sábado à noite, restaurante cheio). Refatorar antes do piloto real.

6. **Direcionar a arquitetura para event-driven** — Conforme escalar, substituir polling/cron por Supabase Database Webhooks ou Inngest para processamento de eventos em tempo real.

