
# Corrigir Taxa de Entrega no Marketplace e Melhorar Checkout

## Diagnostico

### Problema 1: Marketplace mostra taxa fixa do admin
O `RestaurantCard.tsx` (linha 45) usa `restaurant.settings.delivery_fee` que vem do campo fixo do admin. Isso mostra "Taxa: R$ 5,00" para todos, ignorando as zonas configuradas no mapa. A pagina de informacoes (`RestaurantDetails.tsx`) ja foi corrigida para mostrar a faixa (R$ 10,00 - R$ 15,00), mas o card do marketplace nao.

**Causa raiz**: O `useRestaurants.ts` so busca dados da tabela `restaurants` (campo `settings.delivery_fee`). Nao consulta a tabela `delivery_zones` para calcular a faixa.

### Problema 2: Checkout nao atualiza frete apos upsell
Analisando o codigo, a logica de calculo do `deliveryFee` no `Checkout.tsx` (linhas 140-146) esta tecnicamente correta - ela usa `subtotal` reativo do `useCart()` e `zoneCheckResult` do estado. Quando o upsell adiciona um item, `subtotal` muda e `deliveryFee` recalcula.

**Porem**: o display do "Gratis" so aparece se `zoneCheckResult?.freeDeliveryAbove` existir (linha 807). Se o cliente adicionou um endereco que validou a zona corretamente, deveria funcionar. O possivel problema e que `zoneCheckResult` pode estar `null` caso o endereco nao tenha sido validado antes do upsell, ou o `freeDeliveryAbove` da zona e `null`. Vou adicionar uma verificacao mais robusta e um feedback visual claro quando o frete muda para gratis apos upsell.

### Problema 3: Campo "Taxa de Entrega" no Admin
Este campo (`ConfigForm.tsx`, linhas 92-103) agora e redundante. Com as zonas de entrega configuradas no mapa, o frete e definido por zona. O campo fixo so serve como fallback para restaurantes SEM zonas configuradas.

**Sugestao**: Transformar o campo em "Taxa de Entrega Padrao (fallback)" com uma nota explicativa, ou remove-lo e usar R$ 0 como fallback quando nao ha zonas.

---

## Plano de Acao

### 1. RestaurantCard - Mostrar faixa de frete das zonas

**Arquivo**: `src/components/marketplace/RestaurantCard.tsx`
- Buscar zonas de entrega do restaurante via query direta ao Supabase (similar ao que ja foi feito no `RestaurantDetails.tsx`)
- Calcular min/max das taxas usando `getDeliveryFeeRange` de `useDeliveryZones.ts`
- Exibir "Taxa: R$ 10,00 - R$ 15,00" quando houver faixa, ou valor unico se todas iguais
- Fallback para `settings.delivery_fee` se nao houver zonas

**Abordagem**: Para evitar N+1 queries (uma por card), criar um hook ou query que busca zonas agrupadas por restaurante, ou fazer a query individualmente com cache do React Query (cada card faz sua query com `queryKey: ['delivery-zones-public', restaurantId]`).

### 2. Checkout - Garantir reatividade do frete gratis apos upsell

**Arquivo**: `src/pages/Checkout.tsx`
- Adicionar um `useEffect` que detecta quando `deliveryFee` muda de valor positivo para 0 (frete gratis atingido) e exibe um toast de congratulacao
- Garantir que a condicao de display "Gratis" funcione mesmo quando `freeDeliveryAbove` nao esta explicitamente configurado na zona
- O calculo ja e reativo; o foco e melhorar o feedback visual

### 3. ConfigForm - Contextualizar o campo de frete

**Arquivo**: `src/components/admin/ConfigForm.tsx`
- Renomear label para "Taxa de Entrega Padrao (R$)"
- Adicionar nota explicativa: "Usada apenas quando o endereco do cliente nao se enquadra em nenhuma zona de entrega configurada no mapa."
- Verificar se o restaurante tem zonas configuradas e, se sim, mostrar um aviso: "Voce tem X zonas de entrega configuradas. A taxa sera calculada automaticamente pelo mapa."

---

## Secao Tecnica

### Arquivo 1: `src/components/marketplace/RestaurantCard.tsx`

- Importar `useQuery` e `supabase` para buscar zonas do restaurante
- Importar `getDeliveryFeeRange` de `@/hooks/useDeliveryZones`
- Adicionar query para buscar zonas ativas do restaurante especifico
- Substituir `deliveryFee.toFixed(2)` por logica de faixa (min-max)
- Usar `staleTime` longo para evitar refetch excessivo

### Arquivo 2: `src/pages/Checkout.tsx`

- Adicionar `useRef` para rastrear o valor anterior de `deliveryFee`
- Adicionar `useEffect` que compara `prevDeliveryFee > 0` com `deliveryFee === 0` e mostra toast: "Voce ganhou entrega gratis!"
- Isso cobre o cenario de upsell onde o subtotal ultrapassa o `freeDeliveryAbove`

### Arquivo 3: `src/components/admin/ConfigForm.tsx`

- Importar `useDeliveryZones` para verificar se existem zonas configuradas
- Alterar label do campo de "Taxa de Entrega (R$)" para "Taxa de Entrega Padrao (R$)"
- Adicionar texto explicativo abaixo do campo
- Se houver zonas configuradas, exibir badge informativo

### Resumo de arquivos alterados:
1. `src/components/marketplace/RestaurantCard.tsx` - Faixa de frete das zonas
2. `src/pages/Checkout.tsx` - Toast de frete gratis apos upsell
3. `src/components/admin/ConfigForm.tsx` - Contextualizar campo de frete
