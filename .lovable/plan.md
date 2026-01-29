
# Auditoria Completa de Codigo - Code Review

## Resumo Executivo

Analisei **25+ arquivos** incluindo paginas, hooks, contextos, edge functions e politicas RLS. Identifiquei **23 problemas** categorizados por severidade.

---

## 1. ERROS CRITICOS

### 1.1 Console.logs em Producao (Checkout.tsx)
**Arquivo:** `src/pages/Checkout.tsx` - Linhas 193-195, 316-319, 365-369, 381-383
**Problema:** Logs extensivos com dados sensiveis (IDs de pedido, dados de cliente) que vazam para o console do navegador em producao.
**Risco:** Exposicao de dados, facilita engenharia reversa.
**Correcao:** Remover ou envolver em condicional `process.env.NODE_ENV === 'development'`.

```typescript
// ATUAL (ERRADO)
console.log("[CHECKOUT] PEDIDO CRIADO COM SUCESSO!");
console.log("[CHECKOUT] Objeto order completo:", JSON.stringify(order, null, 2));

// CORRETO
if (import.meta.env.DEV) {
  console.log("[CHECKOUT] Order created:", order.id);
}
```

### 1.2 AudioContext Global Nao Gerenciado (Kitchen.tsx)
**Arquivo:** `src/pages/Kitchen.tsx` - Linha 223
**Problema:** `sharedAudioContext` e uma variavel global fora do React que nunca e limpa.
**Risco:** Memory leak em sessoes longas do KDS.
**Correcao:** Mover para um ref ou gerenciar o ciclo de vida.

```typescript
// ATUAL (ERRADO - variavel global)
let sharedAudioContext: AudioContext | null = null;

// CORRETO (usar ref dentro do componente)
const audioContextRef = useRef<AudioContext | null>(null);
```

---

## 2. FALHAS DE SEGURANCA

### 2.1 RLS Policies "Always True" (8 ocorrencias)
**Fonte:** Supabase Linter
**Tabelas afetadas:** `order_items`, `order_item_options`, `push_subscriptions`, `sms_codes`
**Problema:** Politicas INSERT com `WITH CHECK (true)` permitem que qualquer pessoa insira dados.
**Risco:** Usuarios anonimos podem criar pedidos falsos, spam de SMS codes.
**Correcao:** Adicionar validacao de `restaurant_id` nas policies de INSERT.

```sql
-- ATUAL (ERRADO)
Policy: "Anyone can insert order items"
WITH CHECK (true)

-- CORRETO
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.restaurant_id IS NOT NULL
  )
)
```

### 2.2 Function Search Path Mutable
**Fonte:** Supabase Linter
**Problema:** Funcao `update_restaurants_updated_at` nao define `search_path`.
**Risco:** Vulnerabilidade de privilege escalation via schema poisoning.
**Correcao:** Adicionar `SET search_path = public` na funcao.

### 2.3 Leaked Password Protection Desabilitado
**Fonte:** Supabase Linter
**Problema:** Usuarios podem cadastrar senhas que foram vazadas em breaches conhecidos.
**Risco:** Contas facilmente comprometidas por credential stuffing.
**Correcao:** Habilitar "Leaked Password Protection" em Auth Settings do Supabase Dashboard.

### 2.4 Falta de Sanitizacao de Input (ProductForm.tsx)
**Arquivo:** `src/components/admin/ProductForm.tsx`
**Problema:** `image_url` aceita qualquer URL sem validacao.
**Risco:** XSS via URLs maliciosas, SSRF se a imagem for processada no backend.
**Correcao:** Validar que a URL comeca com `https://` e pertence a dominios confiados.

```typescript
// Adicionar validacao
const isValidImageUrl = (url: string) => {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
```

### 2.5 Exposicao de restaurantId no Frontend
**Arquivos:** Multiplos hooks e componentes
**Problema:** `restaurantId` (UUID) e exposto em network requests e pode ser usado para enumerar restaurantes.
**Avaliacao:** BAIXO RISCO - O UUID nao e sequencial e as RLS policies protegem o acesso.
**Recomendacao:** Monitorar, mas nao e critico.

---

## 3. PROBLEMAS DE DESEMPENHO

### 3.1 Queries N+1 em Kitchen.tsx
**Arquivo:** `src/pages/Kitchen.tsx` - Linha 343
**Problema:** A query busca pedidos com nested selects (customer, address, items, options), mas nao tem paginacao.
**Risco:** Lentidao com muitos pedidos ativos.
**Correcao:** Limitar a query ou implementar virtualizacao.

```typescript
// Adicionar limite
.limit(50) // Maximo 50 pedidos ativos
```

### 3.2 useProducts Duplicado (Menu.tsx)
**Arquivo:** `src/pages/Menu.tsx` - Linhas 24-25
**Problema:** Duas chamadas separadas para `useProducts` - uma com categoria e outra sem.
**Risco:** Duas queries simultaneas no banco.
**Correcao:** Unificar a logica ou usar cache mais agressivo.

```typescript
// ATUAL (2 queries)
const { data: products = [] } = useProducts(activeCategory);
const { data: allProducts = [] } = useProducts(null);

// MELHOR (1 query + filtro)
const { data: allProducts = [] } = useProducts(null);
const products = activeCategory 
  ? allProducts.filter(p => p.category_id === activeCategory)
  : allProducts;
```

### 3.3 Real-time Subscription Sem Filtro (Kitchen.tsx)
**Arquivo:** `src/pages/Kitchen.tsx` - Linha 452-458
**Problema:** Subscription escuta TODOS os eventos da tabela `orders`, nao apenas do restaurante atual.
**Risco:** Processamento desnecessario, possivel vazamento de dados entre tenants.
**Correcao:** Adicionar filtro `filter=restaurant_id=eq.{id}` na subscription.

```typescript
// ATUAL (ERRADO - recebe eventos de todos os restaurantes)
.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, ...)

// CORRETO
.on('postgres_changes', { 
  event: '*', 
  schema: 'public', 
  table: 'orders',
  filter: `restaurant_id=eq.${restaurantId}` // Filtrar por tenant
}, ...)
```

### 3.4 LocalStorage Sync Excessivo (CartContext.tsx)
**Arquivo:** `src/contexts/CartContext.tsx` - Linhas 45-53
**Problema:** Salva no localStorage a cada mudanca de items, sem debounce.
**Risco:** Operacoes I/O excessivas em carrinhos grandes.
**Correcao:** Adicionar debounce de 500ms.

---

## 4. MAS PRATICAS

### 4.1 Tipo `any` em Catch Blocks
**Arquivos:** `ProductForm.tsx` linha 85, e outros
**Problema:** `catch (error: any)` perde type safety.
**Correcao:** Usar type guard ou `error instanceof Error`.

```typescript
// ATUAL (ERRADO)
} catch (error: any) {
  toast({ description: error.message });

// CORRETO
} catch (error) {
  const message = error instanceof Error ? error.message : 'Erro desconhecido';
  toast({ description: message });
}
```

### 4.2 Magic Numbers
**Arquivos:** Multiplos
**Exemplos:**
- `180 * 24 * 60 * 60 * 1000` em credit-stamp (180 dias)
- `10 * 60 * 1000` em Kitchen.tsx (10 minutos para urgencia)
- `3600` em send-push-notification (TTL)
**Correcao:** Extrair para constantes nomeadas.

```typescript
const STAMP_EXPIRATION_DAYS = 180;
const URGENT_ORDER_MINUTES = 10;
const PUSH_TTL_SECONDS = 3600;
```

### 4.3 Falta de Memoizacao (Account.tsx)
**Arquivo:** `src/pages/Account.tsx`
**Problema:** `formatPrice`, `formatDate`, `formatPhone` sao recriadas a cada render.
**Correcao:** Mover para fora do componente ou usar `useCallback`.

### 4.4 useEffect com Dependencias Faltando
**Arquivo:** `src/pages/Checkout.tsx` - Linhas 96-120
**Problema:** `loadProfile` usa `name` e `phone` mas nao estao nas dependencias.
**Risco:** Comportamento inconsistente, stale closures.
**Correcao:** Adicionar dependencias ou usar ref.

```typescript
// ATUAL (AVISO do ESLint)
useEffect(() => {
  const loadProfile = async () => {
    if (profile.name && !name) { ... } // 'name' nao esta nas deps
  };
}, [user, profileLoaded]); // Faltam: name, phone

// CORRETO
useEffect(() => {
  const loadProfile = async () => {
    if (profile?.name) setName(profile.name);
    if (profile?.phone) setPhone(formatPhone(profile.phone));
  };
}, [user, profileLoaded]); // Agora nao depende de name/phone
```

### 4.5 Falta de Error Boundaries
**Problema:** Nenhum componente usa Error Boundaries.
**Risco:** Erro em qualquer componente crasha toda a aplicacao.
**Correcao:** Adicionar ErrorBoundary no App.tsx e em rotas criticas.

### 4.6 Validacao de Preco Insuficiente (ProductForm.tsx)
**Arquivo:** `src/components/admin/ProductForm.tsx`
**Problema:** `parseFloat(formData.price)` pode retornar NaN se o input for invalido.
**Correcao:** Validar antes de submeter.

```typescript
const price = parseFloat(formData.price);
if (isNaN(price) || price < 0) {
  toast({ title: 'Preco invalido', variant: 'destructive' });
  return;
}
```

---

## 5. PROBLEMAS ESTRUTURAIS

### 5.1 Componente Kitchen.tsx Muito Grande (1826 linhas)
**Problema:** Arquivo monolitico com multiplas responsabilidades.
**Correcao:** Dividir em:
- `KitchenOrders.tsx` - Lista de pedidos
- `KitchenHistory.tsx` - Historico
- `KitchenReports.tsx` - Relatorios
- `useKitchenOrders.ts` - Logica de dados
- `useKitchenAudio.ts` - Logica de audio

### 5.2 Duplicacao de Logica de Formatacao de Telefone
**Arquivos:** `Checkout.tsx`, `Auth.tsx`, `Account.tsx`, `Kitchen.tsx`
**Problema:** `formatPhone` e reimplementada em 4+ arquivos.
**Correcao:** Criar `src/lib/phoneUtils.ts`.

### 5.3 Tabela config Legada Nao Removida
**Problema:** Existe tabela `config` com id=1 que era global, mas agora as configs sao por restaurante.
**Risco:** Confusao, codigo morto em `useUpdateConfig`.
**Correcao:** Remover tabela `config` e o hook `useUpdateConfig` do sistema.

---

## 6. RESUMO DE PRIORIDADES

| Prioridade | Categoria | Quantidade | Impacto |
|------------|-----------|------------|---------|
| P0 - Critico | Seguranca RLS | 8 policies | Alto |
| P0 - Critico | Leaked Password | 1 config | Alto |
| P1 - Alto | Console logs em prod | 15+ logs | Medio |
| P1 - Alto | Real-time sem filtro | 1 | Alto |
| P2 - Medio | Desempenho | 4 issues | Medio |
| P3 - Baixo | Mas praticas | 10+ issues | Baixo |

---

## 7. PLANO DE ACAO RECOMENDADO

### Curto Prazo (1-2 dias)
1. Habilitar Leaked Password Protection no Supabase
2. Revisar e corrigir as 8 RLS policies com `true`
3. Adicionar filtro de `restaurant_id` na subscription real-time
4. Remover/condicionar console.logs de producao

### Medio Prazo (1 semana)
1. Adicionar Error Boundaries
2. Criar utilitarios compartilhados (formatPhone, formatPrice)
3. Implementar paginacao no KDS
4. Adicionar validacao de URL de imagem

### Longo Prazo (2+ semanas)
1. Refatorar Kitchen.tsx em componentes menores
2. Remover tabela config legada
3. Implementar testes unitarios
4. Adicionar monitoramento de erros (Sentry)

---

## 8. INDICADORES PARA ACOMPANHAR

| Metrica | Atual | Meta |
|---------|-------|------|
| Linter issues Supabase | 9 | 0 |
| Tamanho maior componente | 1826 linhas | <400 |
| Console.logs em prod | 15+ | 0 |
| Cobertura de testes | 0% | >60% |
| Error Boundaries | 0 | 3+ |

---

## 9. NOTA FINAL

O codigo esta funcional e bem estruturado para multi-tenancy, porem apresenta dividas tecnicas acumuladas especialmente em seguranca RLS e tamanho de componentes. A prioridade imediata deve ser as correcoes de seguranca (RLS policies e Leaked Password Protection), seguida pela limpeza de logs e otimizacoes de desempenho.
