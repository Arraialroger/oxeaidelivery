

# Corrigir Taxa de Entrega Dinamica no Checkout e Exibir Faixa de Frete

## Diagnostico

Foram encontrados **3 problemas** relacionados a taxa de entrega:

### Problema 1: Checkout ignora a taxa calculada pela zona
Na linha 140 do `Checkout.tsx`:
```
const deliveryFee = config?.delivery_fee ?? 0;
```
O sistema sempre usa o valor fixo do admin (`settings.delivery_fee`), ignorando completamente o `zoneCheckResult` que ja contem a taxa correta calculada pela zona de entrega.

### Problema 2: CartDrawer tambem mostra taxa fixa
O `CartDrawer.tsx` exibe `config.delivery_fee` como taxa de entrega, sem ter acesso ao resultado da zona.

### Problema 3: Pagina de informacoes mostra taxa fixa
O `RestaurantDetails.tsx` (linha 146) exibe apenas o valor fixo do admin como taxa de entrega, sem considerar a faixa de valores das zonas configuradas.

---

## Plano de Acao

### 1. Checkout.tsx - Usar taxa da zona de entrega

**O que muda**: A variavel `deliveryFee` passa a ser derivada do `zoneCheckResult` quando disponivel, com fallback para o valor do config.

- Substituir `const deliveryFee = config?.delivery_fee ?? 0` por logica que prioriza `zoneCheckResult?.deliveryFee`
- Considerar tambem o frete gratis (`freeDeliveryAbove`) quando o subtotal atingir o limite da zona
- O `total` e o valor salvo no banco ja usam essa variavel, entao atualizam automaticamente

**Logica**:
```
Se zoneCheckResult existe e isValid:
  - Se subtotal >= freeDeliveryAbove: deliveryFee = 0
  - Senao: deliveryFee = zoneCheckResult.deliveryFee
Senao:
  - deliveryFee = config.delivery_fee (fallback)
```

### 2. CartDrawer.tsx - Exibir faixa de frete (min-max)

**O que muda**: Em vez de mostrar um valor fixo de entrega, o carrinho mostra a faixa de valores possivel baseada nas zonas ativas do restaurante.

- Importar `useDeliveryZones` para buscar todas as zonas ativas
- Calcular o menor e o maior `delivery_fee_override` entre as zonas
- Exibir "Entrega: R$ 10,00 - R$ 15,00" quando houver faixa
- Se todas as zonas tiverem o mesmo valor, exibir valor unico
- Se nao houver zonas configuradas, usar o valor fixo do config
- O total do carrinho mostra "a partir de" ja que o valor exato depende do endereco

### 3. RestaurantDetails.tsx - Exibir faixa de frete

**O que muda**: O card de "Taxa de entrega" na pagina de informacoes do restaurante mostra a faixa de valores baseada nas zonas.

- Importar `useDeliveryZones` para buscar zonas ativas
- Calcular min/max das taxas de entrega
- Exibir "R$ 10,00 - R$ 15,00" no card
- Se nao houver zonas, mostrar o valor fixo do config como fallback

---

## Secao Tecnica

### Arquivo 1: `src/pages/Checkout.tsx`

Alteracoes na linha 140:
```typescript
// Calcular deliveryFee baseado na zona de entrega validada
const deliveryFee = (() => {
  if (zoneCheckResult?.isValid && zoneCheckResult.zone) {
    const isFreeDelivery = zoneCheckResult.freeDeliveryAbove && subtotal >= zoneCheckResult.freeDeliveryAbove;
    return isFreeDelivery ? 0 : zoneCheckResult.deliveryFee;
  }
  return config?.delivery_fee ?? 0;
})();
```

### Arquivo 2: `src/components/cart/CartDrawer.tsx`

- Adicionar hook `useDeliveryZones`
- Calcular faixa min/max das taxas
- Substituir exibicao fixa por faixa de valores
- Ajustar total para indicar que e estimado

### Arquivo 3: `src/pages/RestaurantDetails.tsx`

- Adicionar hook `useDeliveryZones` (usando o restaurantId da pagina)
- Calcular faixa min/max das taxas
- Exibir faixa no card de informacoes

### Arquivo 4: `src/hooks/useDeliveryZones.ts` (novo export)

- Criar funcao utilitaria `getDeliveryFeeRange(zones, defaultFee)` para reutilizar a logica de calculo min/max nos 3 arquivos

### Resumo de arquivos alterados:
1. `src/hooks/useDeliveryZones.ts` - Adicionar helper `getDeliveryFeeRange`
2. `src/pages/Checkout.tsx` - Usar taxa da zona validada
3. `src/components/cart/CartDrawer.tsx` - Mostrar faixa de frete
4. `src/pages/RestaurantDetails.tsx` - Mostrar faixa de frete

