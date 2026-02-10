

# Correcao Definitiva do Bug de Poligono

## Causa Raiz

Ha dois problemas que se combinam:

1. **O `DeliveryZoneSimulator.tsx` carrega o Google Maps apenas com `['places']`** (linha 33), sem incluir `drawing`. Se este componente renderiza antes do mapa de zonas, o script e carregado sem a biblioteca de desenho.

2. **O hook `useGoogleMaps` tem um curto-circuito na linha 42** que impede a correcao: quando `isScriptLoaded` e `true`, o hook retorna imediatamente sem nunca verificar se as bibliotecas necessarias estao presentes. A logica de "recarregar se drawing estiver faltando" (linhas 57-73) NUNCA e alcancada porque o `return` na linha 44 acontece antes.

```text
Fluxo do bug:
  Simulator carrega -> useGoogleMaps(['places']) -> script carrega -> isScriptLoaded = true
  DeliveryZoneMap carrega -> useGoogleMaps(['places','drawing']) -> isScriptLoaded ja e true -> return (linha 44)
  -> google.maps.drawing = undefined -> crash ao clicar Poligono
```

## Correcoes

### 1. `src/components/admin/DeliveryZoneSimulator.tsx` (linha 33)
Alterar a chamada para incluir ambas as bibliotecas, padronizando com o restante do app:

```text
Antes:  useGoogleMaps({ libraries: ['places'] })
Depois: useGoogleMaps({ libraries: ['places', 'drawing'] })
```

Isso resolve a causa primaria: todos os componentes passam a solicitar as mesmas bibliotecas.

### 2. `src/hooks/useGoogleMaps.ts` (linhas 42-44)
Adicionar verificacao de bibliotecas no curto-circuito para prevenir regressoes futuras. Se `isScriptLoaded` e `true` mas a biblioteca `drawing` esta faltando, nao fazer return e prosseguir para a logica de reload:

```text
Antes:
  if (isScriptLoaded) {
    setIsLoaded(true);
    return;
  }

Depois:
  if (isScriptLoaded) {
    const needsDrawing = librariesKey.includes('drawing');
    const drawingAvailable = !!window.google?.maps?.drawing;
    if (!needsDrawing || drawingAvailable) {
      setIsLoaded(true);
      return;
    }
    // Drawing is needed but missing - fall through to reload logic
    isScriptLoaded = false;
  }
```

### 3. `src/hooks/useGoogleMaps.ts` (logica de reload, linhas 63-66)
Ao remover o script antigo para recarregar, tambem limpar `window.google` para evitar conflitos:

```text
if (drawingMissing) {
  existingScript.remove();
  delete (window as any).google;
  isScriptLoaded = false;
}
```

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `DeliveryZoneSimulator.tsx` | Solicitar `['places', 'drawing']` em vez de `['places']` |
| `useGoogleMaps.ts` linha 42-44 | Verificar se drawing esta disponivel antes do curto-circuito |
| `useGoogleMaps.ts` linha 63-66 | Limpar `window.google` ao recarregar script |

Essas tres alteracoes resolvem o bug de forma definitiva e previnem regressoes futuras caso algum novo componente solicite bibliotecas parciais.

