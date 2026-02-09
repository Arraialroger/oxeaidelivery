
# Correcao dos 3 Bugs Identificados

## Bug 1: Poligono desaparece ao ser selecionado

**Causa raiz:** O hook `useGoogleMaps` usa um singleton global (`isScriptLoaded`). Se o script do Google Maps for carregado primeiro por um componente que pede apenas `['places']` (ex: `AddressSearchBox`), o script e marcado como carregado e nunca mais recarrega. Quando o `DeliveryZoneMap` pede `['places', 'drawing']`, o script ja esta carregado SEM a biblioteca `drawing`. Resultado: `google.maps.drawing.DrawingManager` e `undefined`, causando um erro silencioso que "some" com tudo.

**Correcao:** Modificar `useGoogleMaps.ts` para acumular todas as bibliotecas requisitadas globalmente. Se uma nova chamada pede bibliotecas que ainda nao foram carregadas, o hook deve recarregar o script com todas as bibliotecas combinadas. Alternativa mais simples: forcar que o script SEMPRE carregue com `['places', 'drawing']` como padrao, ja que ambas sao usadas na aplicacao.

**Arquivo:** `src/hooks/useGoogleMaps.ts`
- Alterar a lista padrao de bibliotecas de `['places']` para `['places', 'drawing']` (linha 32)

---

## Bug 2: "Usar minha localizacao atual" fica carregando infinitamente

**Causa raiz:** Loop infinito no `AddressMapPicker.tsx`. O hook `useGeolocation()` retorna `coords` como um objeto novo a cada render (`{ lat: ..., lng: ... }`). O `useEffect` na linha 119 depende de `gpsCoords`, que muda de referencia a cada re-render, mesmo com valores identicos. O fluxo:

1. GPS retorna coordenadas
2. `gpsCoords` e um novo objeto -> effect dispara
3. `handleLocationSelect` e chamado -> atualiza estado no pai
4. Pai re-renderiza -> `onLocationSelect` prop muda de referencia
5. `handleLocationSelect` e recriado -> `gpsCoords` tambem e novo objeto
6. Effect dispara novamente -> volta ao passo 3 -> loop infinito

**Correcao:** No `useGeolocation()`, memoizar o objeto `coords` com `useMemo` para manter referencia estavel. No `AddressMapPicker`, usar um `useRef` para rastrear se o GPS ja foi processado, evitando re-execucoes.

**Arquivos:**
- `src/hooks/useGoogleMaps.ts` (funcao `useGeolocation`): Memoizar `coords` com `useMemo`
- `src/components/checkout/AddressMapPicker.tsx`: Adicionar `ref` de controle (`gpsProcessedRef`) para executar o efeito GPS apenas uma vez por requisicao

---

## Bug 3: Bairro nao detectado e botao "Continuar" bloqueado

**Causa raiz:** O Google Geocoder nem sempre retorna os componentes `neighborhood` ou `sublocality` no endereço. Em areas como Arraial d'Ajuda, esses campos podem vir vazios. O `handleLocationSelect` no `Checkout.tsx` (linha 196) so preenche `neighborhood` se o valor existir. Como o campo fica vazio e o botao "Continuar" (linha 777) exige `neighborhood` preenchido, o usuario fica bloqueado.

**Correcao em duas partes:**

1. **Ampliar a busca de bairro no geocoding** (`Checkout.tsx`): Adicionar fallbacks para extrair o bairro de outros campos do Google (`administrative_area_level_4`, `administrative_area_level_3`, `political`, ou ate extrair do `formatted_address`).

2. **Exibir campo bairro editavel no modo mapa** (`AddressSection.tsx`): Quando o bairro nao for detectado automaticamente, mostrar o campo "Bairro" no modo mapa para preenchimento manual, junto com complemento e referencia. Isso garante que o usuario nunca fique bloqueado.

**Arquivos:**
- `src/pages/Checkout.tsx` (funcao `handleLocationSelect`): Adicionar fallbacks na extracao do bairro
- `src/components/checkout/AddressSection.tsx`: Adicionar campo "Bairro" editavel no modo mapa, visivel quando o bairro esta vazio ou sempre como campo editavel

---

## Resumo das Alteracoes

| Arquivo | Bug | Alteracao |
|---------|-----|----------|
| `src/hooks/useGoogleMaps.ts` | 1 e 2 | Carregar `drawing` por padrao; memoizar `coords` no `useGeolocation` |
| `src/components/checkout/AddressMapPicker.tsx` | 2 | Adicionar controle `gpsProcessedRef` para evitar loop |
| `src/pages/Checkout.tsx` | 3 | Ampliar fallbacks de extracao de bairro |
| `src/components/checkout/AddressSection.tsx` | 3 | Adicionar campo "Bairro" editavel no modo mapa |

## Detalhes Tecnicos

### useGoogleMaps.ts - Correcao da biblioteca drawing

```text
Antes:  (options.libraries || ['places']).join(',')
Depois: (options.libraries || ['places', 'drawing']).join(',')
```

### useGeolocation - Memoizar coords

```text
Antes:
  coords: position?.coords
    ? { lat: position.coords.latitude, lng: position.coords.longitude }
    : null,

Depois:
  const coords = useMemo(
    () => position?.coords
      ? { lat: position.coords.latitude, lng: position.coords.longitude }
      : null,
    [position?.coords?.latitude, position?.coords?.longitude]
  );
  return { ..., coords };
```

### AddressMapPicker - Evitar loop GPS

```text
Adicionar:
  const gpsProcessedRef = useRef<string | null>(null);

No useEffect do GPS:
  const key = `${gpsCoords.lat},${gpsCoords.lng}`;
  if (gpsProcessedRef.current === key) return; // ja processado
  gpsProcessedRef.current = key;
  // ... continuar com updateMarker e handleLocationSelect
```

### Checkout.tsx - Fallbacks de bairro

```text
Antes:
  const sublocality = getComponent("sublocality_level_1") || getComponent("sublocality");
  const neighborhoodValue = getComponent("neighborhood") || sublocality;

Depois:
  const neighborhoodValue =
    getComponent("neighborhood") ||
    getComponent("sublocality_level_1") ||
    getComponent("sublocality") ||
    getComponent("administrative_area_level_4") ||
    getComponent("administrative_area_level_3") ||
    getComponent("political");
```

### AddressSection.tsx - Campo bairro no modo mapa

```text
Adicionar ao TabsContent "map", junto com complemento e referencia:
  <div>
    <Label>Bairro *</Label>
    <Input
      value={manualData.neighborhood}
      onChange={(e) => onManualDataChange({...manualData, neighborhood: e.target.value})}
      placeholder="Nome do bairro"
    />
  </div>
```
