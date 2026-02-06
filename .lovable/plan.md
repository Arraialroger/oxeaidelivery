
# Plano de Correção: Loop Infinito nos Componentes de Mapa

## Diagnóstico

Identifiquei **2 bugs críticos** que causam loop infinito de renders e impedem o carregamento do mapa:

### Bug 1: Loop infinito no `AddressSearchBox.tsx`

O `useEffect` de sincronização do valor tem `inputValue` como dependência, criando um ciclo:
- `value` muda → `setInputValue(value)` → `inputValue` muda → useEffect roda novamente → loop

### Bug 2: Array `libraries` recriado a cada render no `useGoogleMaps.ts`

O valor padrão `['places']` cria um novo array a cada render, fazendo o `useEffect` rodar infinitamente.

---

## Plano de Ação

### Correção 1: `AddressSearchBox.tsx`

Remover `inputValue` das dependências do useEffect de sincronização:

```typescript
// ANTES (bug)
useEffect(() => {
  if (value !== undefined && value !== inputValue) {
    setInputValue(value);
  }
}, [value, inputValue]);

// DEPOIS (corrigido)
useEffect(() => {
  if (value !== undefined) {
    setInputValue(value);
  }
}, [value]);
```

### Correção 2: `useGoogleMaps.ts`

Memoizar o array de libraries usando `useMemo`:

```typescript
// ANTES (bug)
const { libraries = ['places'] } = options;

useEffect(() => {
  // ...
}, [libraries]);

// DEPOIS (corrigido)
const librariesKey = useMemo(
  () => (options.libraries || ['places']).join(','),
  [options.libraries]
);

useEffect(() => {
  // ...
}, [librariesKey]);
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/checkout/AddressSearchBox.tsx` | Remover `inputValue` das dependências do useEffect |
| `src/hooks/useGoogleMaps.ts` | Memoizar `libraries` para evitar recriação a cada render |

---

## Resultado Esperado

Após as correções:
1. O loop infinito será eliminado
2. O script do Google Maps será carregado corretamente
3. O mapa aparecerá no checkout

---

## Próximos Passos (após correção)

1. Testar o mapa no preview do Lovable
2. Verificar se o autocomplete de endereço funciona
3. Testar a localização via GPS
4. Validar no domínio `deliveryarraial.com.br`
