

# Correcao de 2 Problemas Pendentes

## Problema 1: Poligono faz a tela inteira desaparecer

**Causa raiz identificada:** O singleton do Google Maps pode ter sido carregado SEM a biblioteca `drawing` em uma sessao anterior ou por outro componente. A verificacao na linha 57 do `useGoogleMaps.ts` detecta o script existente e marca como carregado, sem verificar se a biblioteca `drawing` esta disponivel. Quando o codigo tenta criar `new google.maps.drawing.DrawingManager(...)`, o namespace `google.maps.drawing` esta `undefined`, gerando um erro nao tratado que crasha todo o React e deixa a tela em branco.

**Correcao em dois pontos:**

### `src/hooks/useGoogleMaps.ts`
- Na verificacao de script existente (linha 57-63), ao encontrar um script ja carregado, verificar se as bibliotecas necessarias estao realmente disponiveis. Se `drawing` foi solicitada mas `google.maps.drawing` nao existe, remover o script antigo e recarregar com as bibliotecas corretas.

### `src/components/admin/DeliveryZoneMap.tsx`
- No bloco de criacao do DrawingManager (linha 257-284), adicionar uma verificacao defensiva: se `google.maps.drawing` nao existir, exibir mensagem de erro orientando o usuario a atualizar a pagina, em vez de crashar silenciosamente.

---

## Problema 2: Bairro vem incorreto ao usar localizacao atual

**O que o usuario quer:** Ao usar "Usar minha localizacao atual", trazer APENAS rua e numero. O campo bairro deve ficar vazio para preenchimento manual, pois o Google frequentemente retorna bairros incorretos na regiao.

**Correcao:**

### `src/pages/Checkout.tsx`
- Na funcao `handleLocationSelect` (linha 191-201), remover completamente a logica de auto-preenchimento do bairro. Manter apenas a extracao de `route` (rua) e `street_number` (numero).
- Isso garante que o campo bairro sempre fique vazio, forcando o preenchimento manual pelo campo editavel que ja foi adicionado no `AddressSection.tsx`.

---

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useGoogleMaps.ts` | Recarregar script se biblioteca `drawing` estiver ausente |
| `src/components/admin/DeliveryZoneMap.tsx` | Guard defensivo antes de criar DrawingManager |
| `src/pages/Checkout.tsx` | Remover auto-preenchimento de bairro |

