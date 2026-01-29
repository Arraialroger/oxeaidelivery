

# Correção: Erro "Cannot coerce the result to a single JSON object"

## Diagnóstico

O erro ocorre porque a **RLS policy bloqueia o UPDATE** na tabela `restaurants`.

### Causa Raiz

| Dado | Valor |
|------|-------|
| Policy atual | `owner_id = auth.uid()` |
| `restaurants.owner_id` | `NULL` para ambos restaurantes |
| Resultado | Query retorna 0 linhas, `.single()` falha |

A arquitetura de autenticação do sistema usa `user_roles` para definir administradores:

```text
user_roles
├── user_id: eef6d9a1... (arraialroger@gmail.com)
├── role: admin
└── restaurant_id: 5fc8a42e... (Bruttus)
```

Porém, a RLS policy da tabela `restaurants` olha para `owner_id`, que está vazio.

---

## Solução

### Opção A: Atualizar RLS Policy (Recomendada)

Modificar a policy para aceitar tanto `owner_id` quanto admins via `user_roles`:

```sql
-- Remover policy antiga
DROP POLICY IF EXISTS "Owners can manage their restaurant" ON public.restaurants;

-- Criar nova policy que aceita owners OU admins
CREATE POLICY "Owners and admins can manage their restaurant"
ON public.restaurants
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid() 
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    AND id = get_user_restaurant_id(auth.uid())
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    AND id = get_user_restaurant_id(auth.uid())
  )
);
```

### Opção B: Preencher owner_id (Simples, mas limitada)

Atualizar os restaurantes com o `user_id` dos admins:

```sql
UPDATE restaurants SET owner_id = 'e7a6285a-7d5c-4bdc-a8f5-021444c106ea' WHERE slug = 'astral';
UPDATE restaurants SET owner_id = 'eef6d9a1-9676-4de2-8254-36c587bfd81d' WHERE slug = 'bruttus';
```

**Limitação:** Só um owner por restaurante. Se quiser múltiplos admins, use Opção A.

---

## Correção Adicional no Código

Mesmo após corrigir a RLS, o código deve tratar graciosamente quando nenhum resultado retorna:

**Arquivo:** `src/hooks/useAdminMutations.ts`

**Alteração:** Trocar `.single()` por `.maybeSingle()` ou remover retorno:

```typescript
// Linha 271-272 - ANTES
.select()
.single();

// DEPOIS
.select()
.maybeSingle();  // Não falha se 0 linhas
```

Ou simplesmente remover o `.select().single()` já que não precisamos do retorno:

```typescript
const { error, count } = await supabase
  .from('restaurants')
  .update(updatePayload)
  .eq('id', restaurantId);
  
if (error) throw error;
if (count === 0) throw new Error('Você não tem permissão para atualizar este restaurante.');
```

---

## Plano de Execução

| Passo | Ação |
|-------|------|
| 1 | Criar migration para atualizar RLS policy da tabela `restaurants` |
| 2 | Atualizar `useUpdateRestaurantSettings` para tratar 0 linhas afetadas |
| 3 | Testar salvamento de configurações em ambos restaurantes |

---

## Arquivos a Modificar

| Arquivo/Recurso | Alteração |
|-----------------|-----------|
| Migration SQL | Nova RLS policy para `restaurants` |
| `src/hooks/useAdminMutations.ts` | Remover `.single()` e adicionar verificação de `count` |

---

## Impacto

- Admin do Bruttus poderá salvar configurações do Bruttus
- Admin do Astral poderá salvar configurações do Astral
- Cada um só consegue editar seu próprio restaurante (isolamento mantido)

