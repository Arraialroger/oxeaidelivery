
# Auditoria Completa de Autenticação Multi-Tenant

## Resumo Executivo

Analisei **10 arquivos** relacionados a autenticação e navegação. Identifiquei **6 pontos de inconsistência** que quebram o contexto multi-tenant, afetando a experiência do usuário entre restaurantes.

---

## Status por Arquivo

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| `useAuth.ts` | ✅ OK | Recentemente corrigido com slug |
| `Auth.tsx` | ✅ OK | Recentemente corrigido |
| `Account.tsx` | ✅ OK | Recentemente corrigido |
| `Admin.tsx` | ✅ OK | Usa slug corretamente |
| `AdminLogin.tsx` | ✅ OK | Usa slug corretamente |
| `AdminCustomers.tsx` | ✅ OK | Usa slug corretamente |
| `BottomNav.tsx` | ⚠️ AVISO | Fallback sem slug |
| `OrderTracking.tsx` | ❌ CRÍTICO | 2 navegações quebradas |
| `Checkout.tsx` | ⚠️ AVISO | 1 navegação com fallback |

---

## Problemas Identificados

### 1. OrderTracking.tsx - CRÍTICO (2 problemas)

**Linha 280** - "Voltar ao Menu" quando pedido não encontrado:
```typescript
// ATUAL (ERRADO)
<button onClick={() => navigate('/')} className="text-primary underline">
  Voltar ao Menu
</button>

// CORRETO
<button onClick={() => navigate(`/${slug}/menu`)} className="text-primary underline">
  Voltar ao Menu
</button>
```

**Linha 292** - Botão voltar no header:
```typescript
// ATUAL (ERRADO)
<button onClick={() => navigate('/')}>
  <ArrowLeft className="w-6 h-6" />
</button>

// CORRETO
<button onClick={() => navigate(`/${slug}/menu`)}>
  <ArrowLeft className="w-6 h-6" />
</button>
```

**Impacto**: Usuário acompanhando pedido em `/bruttus/order/123` que clica em "Voltar" vai para `/` (landing page) em vez de `/bruttus/menu`.

---

### 2. BottomNav.tsx - AVISO (1 problema)

**Linha 20** - Fallback do accountPath:
```typescript
// ATUAL (RISCO)
const accountPath = slug ? `/${slug}/account` : '/account';

// IDEAL (sem fallback perigoso)
const accountPath = `/${slug}/account`;
```

**Análise**: Este código nunca deve executar o fallback porque o BottomNav só é renderizado dentro do RestaurantLayout, que sempre terá um slug. Porém, o fallback para `/account` criaria uma rota inexistente se acionado.

**Impacto**: Baixo - o cenário sem slug é teoricamente impossível na arquitetura atual, mas o código defensivo com fallback incorreto pode mascarar bugs futuros.

---

### 3. Checkout.tsx - AVISO (1 problema)

**Linha 409** - Botão quando restaurante está fechado:
```typescript
// ATUAL (COM FALLBACK)
<Button onClick={() => navigate(slug ? `/${slug}/menu` : "/")}>Voltar ao Cardápio</Button>

// IDEAL (sem fallback)
<Button onClick={() => navigate(`/${slug}/menu`)}>Voltar ao Cardápio</Button>
```

**Análise**: Similar ao BottomNav, este fallback nunca deveria ser acionado porque Checkout está dentro do RestaurantLayout.

**Impacto**: Baixo - mesma situação do BottomNav.

---

## Arquivos Verificados (OK)

### useAuth.ts ✅
- `signUp` aceita `restaurantSlug` como parâmetro
- `emailRedirectTo` construído dinamicamente: `/${slug}/account`
- `signIn` e `signOut` não precisam de contexto de restaurante

### Auth.tsx ✅
- Usa `useParams` para extrair slug
- Usa `useRestaurantContext` para branding dinâmico
- Todas as navegações incluem slug: `/${slug}/account`, `/${slug}/menu`
- Passa slug para `signUp`

### Account.tsx ✅
- Usa `useParams` para extrair slug
- Navegações corrigidas: `/${slug}/menu`, `/${slug}/auth`, `/${slug}/order/${id}`

### Admin.tsx ✅
- Links externos usam `/${slug}/menu`, `/${slug}/kitchen`
- Logout redireciona para `/${slug}/admin/login`

### AdminLogin.tsx ✅
- Pós-login redireciona para `/${slug}/admin`
- Botão voltar vai para `/${slug}/menu`

### AdminCustomers.tsx ✅
- Logout redireciona para `/${slug}/admin/login`
- Navegações mantêm contexto do slug

---

## Plano de Correção

### Fase 1: Correções Críticas (OrderTracking.tsx)

**Alterações necessárias:**

1. Adicionar extração do slug (já existe orderId, adicionar slug):
```typescript
const { orderId, slug } = useParams<{ orderId: string; slug: string }>();
```

2. Corrigir navegação quando pedido não encontrado (linha 280):
```typescript
<button onClick={() => navigate(`/${slug}/menu`)} className="text-primary underline">
```

3. Corrigir botão voltar no header (linha 292):
```typescript
<button onClick={() => navigate(`/${slug}/menu`)}>
```

### Fase 2: Limpeza Defensiva (Opcional)

Remover fallbacks desnecessários em:
- `BottomNav.tsx` linha 20
- `Checkout.tsx` linha 409

Isso é opcional porque esses fallbacks nunca são acionados na arquitetura atual, mas removê-los tornaria o código mais limpo e explícito.

---

## Fluxos de Autenticação Validados

### Fluxo de Signup (Cliente)
```
/bruttus/auth > Criar conta
     ↓
useAuth.signUp(email, pass, metadata, "bruttus")
     ↓
emailRedirectTo = "https://site.com/bruttus/account"
     ↓
E-mail enviado com link correto
     ↓
Usuário confirma e vai para /bruttus/account ✅
```

### Fluxo de Login (Cliente)
```
/bruttus/auth > Login
     ↓
useAuth.signIn(email, pass)
     ↓
Auth.tsx: navigate(`/${slug}/account`) = /bruttus/account ✅
```

### Fluxo de Logout (Cliente)
```
/bruttus/account > Sair
     ↓
useAuth.signOut()
     ↓
Permanece em /bruttus/account (deslogado) ✅
```

### Fluxo de Login (Admin)
```
/bruttus/admin/login > Login
     ↓
useEffect detecta isAdmin
     ↓
navigate(`/${slug}/admin`) = /bruttus/admin ✅
```

### Fluxo de Logout (Admin)
```
/bruttus/admin > Logout
     ↓
signOut()
     ↓
navigate(`/${slug}/admin/login`) = /bruttus/admin/login ✅
```

---

## Resumo de Alterações

| Arquivo | Tipo | Alterações |
|---------|------|------------|
| `OrderTracking.tsx` | Crítico | 3 alterações (adicionar slug + 2 navigates) |
| `BottomNav.tsx` | Opcional | 1 alteração (remover fallback) |
| `Checkout.tsx` | Opcional | 1 alteração (remover fallback) |

---

## Validação Pós-Correção

| Cenário | Teste | Esperado |
|---------|-------|----------|
| Order Tracking voltar | `/bruttus/order/123` > Voltar | `/bruttus/menu` |
| Order não encontrado | `/bruttus/order/xxx` > Voltar ao Menu | `/bruttus/menu` |
| Login cliente | `/bruttus/auth` > Login | `/bruttus/account` |
| Signup cliente | `/bruttus/auth` > Criar conta | Email → `/bruttus/account` |
| Logout cliente | `/bruttus/account` > Sair | Permanece em `/bruttus/account` |
| Login admin | `/bruttus/admin/login` | `/bruttus/admin` |
| Logout admin | `/bruttus/admin` > Sair | `/bruttus/admin/login` |

---

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Corrigir OrderTracking.tsx | 3 min |
| Limpeza BottomNav.tsx (opcional) | 1 min |
| Limpeza Checkout.tsx (opcional) | 1 min |
| Testar fluxos | 5 min |
| **Total** | **~10 min** |

---

## Risco

**Baixo** - As correções são cirúrgicas e afetam apenas navegação. Não há alterações em lógica de autenticação ou dados.
