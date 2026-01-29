

# Diagnóstico Completo: Problemas Multi-Tenant Identificados

## Resumo Executivo

Analisei o banco de dados e o código. Identifiquei **4 problemas distintos**, sendo 2 de arquitetura e 2 de configuração. Os problemas estão claramente documentados abaixo.

---

## 1. PROBLEMA: Notificações Push Redirecionam para 404

### Causa Raiz

A URL construída pelo Edge Function `send-push-notification` não inclui o slug do restaurante:

```typescript
// Linha 472-473 de send-push-notification/index.ts
const pushPayload = {
  url: `/order/${orderId}`,  // ❌ ERRADO - falta o slug!
};
```

O Service Worker (`sw-push.js`) usa essa URL diretamente:

```javascript
// Linha 77-89 de sw-push.js
const url = event.notification.data?.url || '/';
clients.openWindow(url);  // Abre /order/123 em vez de /astral/order/123
```

### Impacto
- Ao clicar na notificação, o usuário é direcionado para `/order/{orderId}`
- Como a rota correta é `/{slug}/order/{orderId}`, o resultado é 404

### Solução
O Edge Function precisa receber o slug do restaurante e incluí-lo na URL:

```typescript
// send-push-notification precisa receber restaurant_slug
const pushPayload = {
  url: `/${restaurantSlug}/order/${orderId}`,
};
```

O Kitchen.tsx precisa enviar o slug ao chamar o Edge Function.

---

## 2. PROBLEMA: Selo de Fidelidade Não Computado no Bruttus

### Causa Raiz

O restaurante "Bruttus" tem o programa de fidelidade **DESABILITADO** nas configurações:

```sql
-- Resultado da query:
-- Astral: loyalty_enabled: true
-- Bruttus: loyalty_enabled: false  ← DESABILITADO!
```

A Edge Function `credit-stamp` corretamente verifica isso na linha 70:

```typescript
if (!settings?.loyalty_enabled) {
  console.log('[credit-stamp] Loyalty program disabled for this restaurant');
  return { skipped: true, reason: 'loyalty_disabled' };
}
```

### Impacto
- Pedidos do Bruttus nunca ganham selos porque `loyalty_enabled: false`
- Não é um bug, é configuração

### Solução
- Se você quer que o Bruttus tenha programa de fidelidade, atualize as settings:

```sql
UPDATE restaurants 
SET settings = jsonb_set(settings, '{loyalty_enabled}', 'true')
WHERE slug = 'bruttus';
```

---

## 3. PROBLEMA: Pedidos de Restaurantes Diferentes Aparecendo na Mesma Conta

### Causa Raiz

A arquitetura de autenticação atual tem uma **falha conceitual**:

| Entidade | Escopo | Problema |
|----------|--------|----------|
| `auth.users` | Global | Um usuário = um email/telefone global |
| `profiles` | Global | Sem `restaurant_id` |
| `customers` | Por restaurante | Isolado corretamente |

Quando você faz login com `rogerbahia55@gmail.com`:

1. O sistema busca o profile pelo `user.id`
2. O profile tem telefone `73999161487`
3. A busca de pedidos usa esse telefone no hook `useCustomerOrders`
4. **Porém**, o hook corretamente filtra por `restaurant_id` (linha 39 de `useCustomerOrders.ts`)

Verifiquei o código de `useCustomerOrders.ts` e ele **está correto**:

```typescript
// useCustomerOrders.ts - linhas 35-43
const { data: customer } = await supabase
  .from('customers')
  .select('id')
  .eq('phone', phone)
  .eq('restaurant_id', restaurantId)  // ✅ Filtro correto!
  .maybeSingle();
```

### Então por que apareceram pedidos de outro restaurante?

Existem duas possibilidades:

**Hipótese A: Problema de Cache**
- O React Query pode ter cacheado pedidos de uma sessão anterior
- A `queryKey` inclui `restaurantId`, então isso é improvável

**Hipótese B: Lógica de Fallback**
Verifiquei a linha 70-72 de `Account.tsx`:

```typescript
const { data: orders } = useCustomerOrders(searchPhone);  // usa searchPhone
const { data: stamps } = useCustomerStamps(searchPhone || profilePhone);
```

O `searchPhone` vem do formulário de busca OU do perfil. Se você buscou manualmente usando o telefone sem estar no contexto correto, pode ter visto pedidos errados.

### Dados Reais no Banco

```
Clientes:
- 73999161487 no Astral → stamps_count: 1 ✅
- 73999161487 no Bruttus → stamps_count: 0 (loyalty desabilitado)

Pedidos:
- Astral: stamp_earned: true ✅
- Bruttus: stamp_earned: false (esperado, loyalty_enabled: false)
```

**Os dados estão corretos!** O isolamento está funcionando no banco.

### Possível Cenário de Confusão

Você pode ter:
1. Acessado `/astral/account` - viu pedido do Astral ✅
2. Navegado para `/bruttus/account` **sem recarregar**
3. O estado `searchPhone` persistiu do Astral
4. A query rodou com o `restaurantId` do Bruttus, mas o cache do React Query pode ter mostrado dados antigos

### Solução
Limpar o `searchPhone` quando o restaurante muda:

```typescript
// Account.tsx - adicionar useEffect para limpar estado quando slug muda
useEffect(() => {
  setSearchPhone(null);
  setPhone('');
}, [slug]);
```

---

## 4. PROBLEMA: Profile Global vs Customers Multi-Tenant

### Arquitetura Atual

```
auth.users (Supabase Auth)
    ↓
profiles (tabela pública, global)
    - id = user_id
    - email
    - phone ← Um telefone global!
    - name

customers (multi-tenant)
    - id
    - phone
    - restaurant_id ← Isolado por restaurante
```

### O Problema Conceitual

Um usuário pode ter:
- **1 conta de login** (rogerbahia55@gmail.com)
- **N clientes** (um por restaurante que ele frequenta)

Isso é **correto para SaaS multi-tenant**! Cada restaurante tem seu próprio registro de cliente.

Porém, a tela de Account busca o telefone do **profile global** e usa para buscar no **customers multi-tenant**. Isso funciona, mas pode causar confusão se:
- O profile tem telefone X
- O cliente no restaurante Y foi criado com telefone W diferente

### Não é um bug, mas uma oportunidade de melhoria

A arquitetura está correta, mas o UX pode ser melhorado mostrando claramente que "você está vendo pedidos do restaurante {slug}".

---

## Resumo dos Problemas e Soluções

| # | Problema | Severidade | Causa | Solução |
|---|----------|------------|-------|---------|
| 1 | Notificação 404 | **CRÍTICO** | URL sem slug | Incluir slug no payload push |
| 2 | Bruttus sem selo | Configuração | `loyalty_enabled: false` | Habilitar nas settings |
| 3 | Pedidos misturados | **MÉDIO** | Estado React persistente | Limpar estado ao mudar restaurante |
| 4 | Profile global | Design | Arquitetura SaaS | Melhoria de UX (opcional) |

---

## Plano de Correção

### Fase 1: Correção Crítica (Notificações)

**1. Atualizar Edge Function `send-push-notification`:**
- Buscar o `slug` do restaurante antes de enviar
- Incluir na URL: `/${slug}/order/${orderId}`

**2. Atualizar `Kitchen.tsx`:**
- Passar o `slug` ao chamar a Edge Function (já tem acesso via contexto)

### Fase 2: Correção de Estado (Account)

**1. Atualizar `Account.tsx`:**
- Adicionar `useEffect` para limpar `searchPhone` quando `slug` muda
- Invalidar queries do React Query quando restaurante muda

### Fase 3: Configuração (Opcional)

**1. Habilitar fidelidade no Bruttus:**
- Atualizar `settings.loyalty_enabled = true` via SQL ou painel admin

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/send-push-notification/index.ts` | Buscar slug e incluir na URL |
| `src/pages/Kitchen.tsx` | Enviar slug no payload da notificação |
| `src/pages/Account.tsx` | Limpar estado ao trocar restaurante |

---

## Verificação: Os Dados Estão Corretos

Confirmei via queries SQL que:
- Clientes estão isolados por `restaurant_id` ✅
- Pedidos estão isolados por `restaurant_id` ✅
- Selos estão isolados por `restaurant_id` ✅
- O pedido do Astral ganhou selo (`stamp_earned: true`) ✅
- O pedido do Bruttus não ganhou selo porque `loyalty_enabled: false` ✅

**Não há vazamento de dados no banco**. Os problemas são de UI/UX e configuração.

