# Correção: Configurações Multi-Tenant ✅ IMPLEMENTADO

## Status: CONCLUÍDO

## Diagnóstico

O painel administrativo está usando a **tabela `config` legada** (1 linha global) em vez da coluna **`restaurants.settings`** (JSONB por restaurante).

### Arquitetura Atual (Problema)

```text
ConfigForm.tsx
     ↓
useUpdateConfig()
     ↓
UPDATE config SET ... WHERE id = 1  ← ERRADO! Tabela global
```

### Arquitetura Correta (Solução)

```text
ConfigForm.tsx
     ↓
useUpdateRestaurantSettings()
     ↓
UPDATE restaurants SET settings = ... WHERE id = {restaurantId}  ← CORRETO! Multi-tenant
```

---

## Dados Atuais no Banco

| Restaurante | Tabela | loyalty_enabled |
|-------------|--------|-----------------|
| Astral | `restaurants.settings` | true |
| Bruttus | `restaurants.settings` | false |
| Global (legada) | `config` | true |

Os dados na tabela correta (`restaurants`) já estão lá! O problema é que o painel de admin não lê nem escreve nela.

---

## Plano de Correção

### Fase 1: Atualizar Hook de Leitura

**Arquivo:** `src/hooks/useConfig.ts`

O hook já lê da tabela correta (`restaurants.settings`), mas precisa passar o `restaurantId` para o contexto.

Verificar se está funcionando corretamente.

### Fase 2: Criar Hook de Escrita Multi-Tenant

**Arquivo:** `src/hooks/useAdminMutations.ts`

Substituir o `useUpdateConfig` atual por `useUpdateRestaurantSettings`:

```typescript
export function useUpdateRestaurantSettings(restaurantId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<RestaurantSettings>) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      // Buscar settings atuais
      const { data: current } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .single();
      
      // Mesclar settings
      const mergedSettings = { ...current?.settings, ...settings };
      
      const { data, error } = await supabase
        .from('restaurants')
        .update({ settings: mergedSettings })
        .eq('id', restaurantId)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });
}
```

### Fase 3: Atualizar ConfigForm

**Arquivo:** `src/components/admin/ConfigForm.tsx`

1. Importar o contexto do restaurante
2. Usar o novo hook `useUpdateRestaurantSettings(restaurantId)`
3. Adicionar campos extras do restaurante (banner, nome, etc.)

### Fase 4: Remover Tabela Legada

Após confirmar que tudo funciona, criar migration para:

1. Remover a tabela `config`
2. Remover referências ao hook antigo `useUpdateConfig`

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useAdminMutations.ts` | Adicionar `useUpdateRestaurantSettings` |
| `src/components/admin/ConfigForm.tsx` | Usar contexto e novo hook |
| `src/hooks/useConfig.ts` | Verificar compatibilidade |
| Migration SQL | Remover tabela `config` (opcional, após validação) |

---

## Fluxo Corrigido

```text
Admin acessa /bruttus/admin
          ↓
RestaurantContext identifica restaurantId = "5fc8a42e..."
          ↓
ConfigForm carrega settings do Bruttus
          ↓
Admin habilita loyalty_enabled
          ↓
UPDATE restaurants SET settings = {..., loyalty_enabled: true} 
WHERE id = "5fc8a42e..."
          ↓
Bruttus agora tem fidelidade ativada!
```

---

## Benefícios

1. Cada restaurante tem suas próprias configurações
2. Não há mais confusão com tabela global
3. Arquitetura consistente com o resto do sistema multi-tenant
4. Código mais simples e manutenível

---

## Seção Técnica

### Campos a migrar da tabela `config` para `restaurants.settings`

A tabela `config` tem esses campos que precisam estar em `settings`:

| Campo `config` | Campo `settings` | Status |
|----------------|------------------|--------|
| `delivery_fee` | `delivery_fee` | Já existe |
| `restaurant_open` | `is_open` | Já existe |
| `kds_enabled` | `kds_enabled` | Já existe |
| `hero_banner_url` | Deveria ir para `restaurants.hero_banner_url` | Já existe coluna na tabela |
| `loyalty_enabled` | `loyalty_enabled` | Já existe |
| `loyalty_stamps_goal` | `loyalty_stamps_goal` | Já existe |
| `loyalty_min_order` | `loyalty_min_order` | Já existe |
| `loyalty_reward_value` | `loyalty_reward_value` | Já existe |

### RLS da tabela `restaurants`

A política atual permite que owners atualizem seus restaurantes:

```sql
Policy: "Owners can manage their restaurant"
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid())
```

Isso significa que o admin precisa estar logado como owner. Precisamos verificar se a policy permite também admins com role na `user_roles`.

---

## Indicadores de Sucesso

1. Admin do Bruttus consegue habilitar fidelidade
2. Configurações do Astral não são afetadas
3. Cada restaurante vê apenas suas próprias configurações
4. A tabela `config` pode ser removida sem impacto

