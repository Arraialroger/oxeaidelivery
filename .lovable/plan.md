
# Upsell Gerenciado pelo Admin -- Plano de Implementacao

## Diagnostico

Atualmente, o upsell no checkout e 100% automatico: busca produtos ativos de categorias diferentes das que estao no carrinho, sem controle do restaurante. Isso gera sugestoes aleatorias que nem sempre fazem sentido comercial.

O objetivo e dar ao restaurante **controle total** sobre o que aparece como upsell, mantendo simplicidade.

---

## Minha Recomendacao: O Que Priorizar

Analisando suas 12 sugestoes, vou classificar por **impacto vs. complexidade**:

### FASE 1 -- Implementar agora (alto impacto, baixo custo)
| Funcionalidade | Justificativa |
|---|---|
| Selecionar produtos de upsell manualmente | Core da funcionalidade. Sem isso, nada funciona |
| Ativar/desativar upsell | Switch simples, essencial para controle |
| Definir ordem de exibicao | Drag-and-drop ja existe no projeto (dnd-kit instalado) |
| Limite de ate 10 produtos | Regra simples no frontend |
| Valor minimo do carrinho | Um campo numerico, filtra no frontend |
| Integracao com frete gratis | Ja existe a logica, so precisa conectar a mensagem "Adicione X e ganhe frete gratis" |

### FASE 2 -- Implementar depois (medio impacto, media complexidade)
| Funcionalidade | Justificativa |
|---|---|
| Upsell por categoria | Requer logica condicional (se carrinho tem lanche, mostrar bebidas). Util mas pode esperar |
| Horarios/dias da semana | Complexidade extra de agenda. A maioria dos restaurantes nao precisa disso imediatamente |

### NAO IMPLEMENTAR AGORA (alto custo, baixo retorno imediato)
| Funcionalidade | Justificativa |
|---|---|
| Produtos mais vendidos automaticamente | Requer analytics de vendas por produto, queries complexas, e o beneficio e marginal vs. selecao manual |
| Metricas de conversao de upsell | Requer tracking de eventos no banco, dashboards novos. Importante mas e fase 3 |
| Diferentes upsells por unidade | O sistema ja e multi-tenant. Cada restaurante configura o seu proprio |

---

## Plano Tecnico -- FASE 1

### 1. Tabela `upsell_products` no banco

Nova tabela para armazenar os produtos selecionados como upsell:

```text
upsell_products
- id (uuid, PK)
- restaurant_id (uuid, FK restaurants)
- product_id (uuid, FK products)
- order_index (int, para ordenacao)
- created_at (timestamp)
```

Configuracoes gerais ficam no campo `settings` (JSON) da tabela `restaurants`:
```text
settings.upsell_enabled: boolean (default true)
settings.upsell_min_cart_value: number (default 0)
```

Isso evita criar uma tabela extra so para 2 campos de configuracao.

### 2. Componente Admin: `UpsellManager.tsx`

Nova secao na aba "Config" do admin (ou uma nova aba dedicada):

- **Switch** para ativar/desativar upsell
- **Campo numerico** para valor minimo do carrinho
- **Lista de produtos** selecionados como upsell (com drag-and-drop para reordenar)
- **Botao "Adicionar Produto"** que abre um seletor dos produtos ja cadastrados (filtrados por ativos)
- Limite visual de 10 produtos
- Botao de remover em cada produto

### 3. Atualizar `UpsellSection.tsx` no Checkout

A query atual busca produtos automaticamente. Vai mudar para:

```text
Se upsell_enabled E existem produtos na tabela upsell_products:
  - Buscar esses produtos especificos na ordem configurada
  - Filtrar os que ja estao no carrinho
  - Aplicar filtro de valor minimo do carrinho
Senao (fallback):
  - Manter a logica automatica atual (categorias diferentes)
```

Isso garante que restaurantes que nao configuraram upsell manual continuam vendo sugestoes automaticas.

### 4. Mensagem de frete gratis no upsell

Quando o cliente esta proximo do valor de frete gratis:
- Cada card de upsell que, ao ser adicionado, faria o subtotal atingir o `freeDeliveryAbove`, recebe um badge: "Adicione e ganhe frete gratis!"

### Resumo de arquivos

1. **Migration SQL** -- Criar tabela `upsell_products` com RLS
2. **`src/components/admin/UpsellManager.tsx`** -- Novo componente de gestao
3. **`src/hooks/useUpsellProducts.ts`** -- Novo hook para CRUD dos upsell products
4. **`src/pages/Admin.tsx`** -- Adicionar a secao de upsell (nova aba ou dentro de Config)
5. **`src/components/checkout/UpsellSection.tsx`** -- Atualizar query para priorizar produtos manuais
6. **`src/components/admin/ConfigForm.tsx`** -- Adicionar campos upsell_enabled e upsell_min_cart_value

### RLS da nova tabela

- SELECT: publico (anon pode ler para exibir no checkout)
- INSERT/UPDATE/DELETE: apenas owner do restaurante (`is_restaurant_owner(auth.uid(), restaurant_id)`)
