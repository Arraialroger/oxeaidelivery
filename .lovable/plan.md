

# Checkout Transacional Atomico (com Auditoria e Timeout)

## Resumo

Mover toda a logica de criacao de pedido para uma unica transacao SQL no backend, com auditoria estruturada via tabela `order_audit_log` e tratamento robusto de timeout/retry no frontend.

## Arquitetura

```text
Frontend (Checkout.tsx)
    |
    | POST /create-order (1 chamada, timeout 25s)
    | body: { idempotency_key, restaurant_id, customer, address, items, loyalty?, coupon? }
    |
    v
Edge Function: create-order (timeout 30s)
    |
    | supabase.rpc('create_order_transaction', payload)
    |
    v
PostgreSQL Function (SECURITY DEFINER, statement_timeout 15s)
    BEGIN
      check idempotency -> return existing if found
      upsert customer
      insert address
      insert order (with idempotency_key)
      insert order_items + order_item_options
      process loyalty (conditional)
      record coupon_uses (conditional)
      INSERT audit log (status='created')
      RETURN order_id
    COMMIT (automatico) ou ROLLBACK (em erro)
    |
    | on exception -> INSERT audit log (status='failed') via separate call
```

## REFINAMENTO 1: Tabela de Auditoria

### Nova tabela: `order_audit_log`

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| correlation_id | text | NOT NULL |
| idempotency_key | text | NOT NULL |
| restaurant_id | uuid | NOT NULL |
| customer_phone | text | |
| total | numeric | |
| status | text | NOT NULL (created, reused, failed) |
| error_message | text | nullable |
| metadata | jsonb | '{}' |
| created_at | timestamptz | now() |

**RLS:** SELECT apenas para admins do restaurante. INSERT apenas via SECURITY DEFINER (sem acesso direto do frontend).

**Indice:** `(restaurant_id, created_at DESC)` para consultas rapidas no painel admin.

### Como funciona dentro da transacao

A funcao SQL `create_order_transaction` registra o audit log em 3 cenarios:

1. **Pedido criado com sucesso** -> `status = 'created'`, inclui `order_id` no metadata
2. **Pedido reutilizado (idempotencia)** -> `status = 'reused'`, inclui `order_id` existente no metadata
3. **Falha** -> A Edge Function registra `status = 'failed'` com `error_message` apos o rollback (fora da transacao, pois o rollback desfaria o log)

Isso garante rastreabilidade completa para debug, antifraude e auditoria operacional.

## REFINAMENTO 2: Timeout e Feedback

### Edge Function `create-order`

- **Timeout explicito**: `AbortController` com 25 segundos no `fetch` interno (se houver chamadas externas)
- **statement_timeout**: A funcao SQL configura `SET LOCAL statement_timeout = '15s'` no inicio da transacao
- **Tratamento de erro estruturado**: Retorna codigos de erro semanticos para o frontend:
  - `ORDER_CREATED` -> sucesso
  - `ORDER_REUSED` -> idempotencia ativada, retorna order_id existente
  - `VALIDATION_ERROR` -> dados invalidos (400)
  - `RESTAURANT_INACTIVE` -> restaurante nao ativo (400)
  - `TIMEOUT_ERROR` -> transacao excedeu limite (504)
  - `INTERNAL_ERROR` -> erro generico (500)

### Frontend `useCheckoutSubmit`

- **Retry automatico**: 1 retry em caso de erro de rede (5xx ou timeout), com delay de 2 segundos
- **Idempotency key**: `hash(phone + JSON.stringify(cartItems) + floor(Date.now() / 300000))` -- mesma chave por 5 minutos, garantindo que retry nao duplica
- **Timeout visual**: Apos 20 segundos sem resposta, mostra mensagem "Estamos processando seu pedido..."
- **Mensagens de erro amigaveis**:
  - Timeout: "O servidor demorou para responder. Estamos verificando seu pedido..."
  - Rede: "Erro de conexao. Tentando novamente..."
  - Validacao: Mensagem especifica retornada pelo backend
  - Generico: "Erro ao criar pedido. Tente novamente."
- **Estado de retry visivel**: Botao mostra "Tentando novamente..." durante retry

## Componentes Detalhados

### 1. Migracao SQL

**Tabela `order_audit_log`** com colunas listadas acima.

**Coluna `idempotency_key`** na tabela `orders`:
- `ALTER TABLE orders ADD COLUMN idempotency_key text`
- `CREATE UNIQUE INDEX idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL`

**Constraint UNIQUE em `customers(phone, restaurant_id)`**:
- Verificar se ja existe antes de criar

**Funcao `create_order_transaction(p_data jsonb)`**:
- `SECURITY DEFINER SET search_path = public`
- `SET LOCAL statement_timeout = '15s'` no inicio
- Logica completa descrita na arquitetura acima
- Retorna `jsonb` com `{ order_id, status, correlation_id }`

### 2. Edge Function `create-order/index.ts`

```text
Responsabilidades:
- Validar campos obrigatorios
- Gerar correlation_id
- Rate limit por IP (10/min) e restaurant_id (200/hora)
- Chamar supabase.rpc('create_order_transaction', { p_data: payload })
- Em caso de erro SQL, registrar audit log com status='failed'
- Retornar { order_id, correlation_id, status_code }
- Logs estruturados JSON com correlation_id em todas as acoes
```

### 3. Hook `useCheckoutSubmit.ts`

```text
export function useCheckoutSubmit() {
  // Gera idempotency_key estavel por 5 minutos
  // useMutation com:
  //   - retry: 1 (apenas em 5xx/network error)
  //   - retryDelay: 2000ms
  //   - onMutate: set loading state
  //   - onError: toast com mensagem amigavel
  //   - onSuccess: return { orderId, correlationId }
  // Timer visual de 20s para feedback de "processando..."
}
```

### 4. Refatoracao `Checkout.tsx`

Substituir `handleSubmitOrder` (linhas 321-544) por:

```text
const { submit, isSubmitting, isRetrying, isSlowRequest } = useCheckoutSubmit();

const handleSubmitOrder = async () => {
  const result = await submit({
    restaurantId,
    customer: { phone: getPhoneDigits(phone), name, customerType },
    address: { street, number, neighborhood, complement, reference, lat, lng, ... },
    order: { paymentMethod, change, subtotal, deliveryFee, total, loyaltyDiscount, ... },
    items: items.map(i => ({ ... })),
    loyalty: useReward ? { ... } : null,
    coupon: appliedCoupon ? { ... } : null,
  });

  if (result?.orderId) {
    // analytics, pix modal ou navigate (logica existente mantida)
  }
};

// No botao:
<Button disabled={isSubmitting}>
  {isRetrying ? "Tentando novamente..." : isSlowRequest ? "Processando..." : "Confirmar Pedido"}
</Button>
```

Reducao estimada: ~200 linhas removidas.

## Fluxo de Idempotencia

```text
1. Frontend gera: idempotency_key = hash(phone + cartJSON + floor(timestamp/300000))
2. Edge Function repassa para a funcao SQL
3. SQL verifica: SELECT id FROM orders WHERE idempotency_key = $key AND restaurant_id = $rid
4. Se existir: registra audit log 'reused', retorna order_id existente
5. Se nao: executa transacao completa, registra audit log 'created'
6. Se falhar: Edge Function registra audit log 'failed' fora da transacao
```

## Arquivos a Criar/Editar

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Criar: tabela order_audit_log, coluna idempotency_key em orders, constraint UNIQUE customers, funcao create_order_transaction |
| `supabase/functions/create-order/index.ts` | Criar: Edge Function wrapper com timeout e audit |
| `supabase/config.toml` | Editar: adicionar create-order com verify_jwt = false |
| `src/hooks/useCheckoutSubmit.ts` | Criar: hook com mutation, retry e feedback |
| `src/pages/Checkout.tsx` | Editar: substituir handleSubmitOrder por chamada ao hook |

## O que NAO muda

- Tabelas existentes (exceto nova coluna em orders)
- RLS policies existentes
- Edge Functions existentes (process-payment, payment-webhook, etc.)
- Fluxo de pagamento PIX (recebe order_id pronto)
- UI do checkout (steps, formularios)

## Seguranca

- Funcao SQL usa SECURITY DEFINER (bypassa RLS de forma controlada)
- Edge Function valida restaurant ativo via `is_valid_restaurant()`
- Rate limiting por IP e restaurant_id
- Idempotency key previne duplicacao
- Audit log registra todas as tentativas (debug e antifraude)
- Nenhum secret exposto no frontend
- `statement_timeout` de 15s previne transacoes longas

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Funcao SQL complexa | Testes manuais com chamada direta via SQL Editor antes de conectar frontend |
| Timeout em transacoes | statement_timeout de 15s; operacoes simples (~5 INSERTs, < 100ms esperado) |
| Falha na Edge Function | Retry 1x no frontend com mesma idempotency_key; audit log registra falha |
| Audit log dentro de transacao que faz rollback | Logs de 'failed' sao gravados FORA da transacao pela Edge Function |

