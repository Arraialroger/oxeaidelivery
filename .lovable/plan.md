

# Corrigir Domínio no Onboarding

## Problema
O campo "Link do seu cardápio" exibe o hostname do preview do Lovable (`0384a06e-621e-...lovableproject.com/`) em vez do domínio real `deliveryarraial.com.br`.

Isso acontece porque usamos `window.location.hostname`, que retorna o domínio do ambiente atual -- que no preview de desenvolvimento é o ID do projeto Lovable.

## Solucao

### 1. Criar variavel de ambiente `VITE_APP_DOMAIN`
No arquivo `.env`, adicionar:
```
VITE_APP_DOMAIN="deliveryarraial.com.br"
```

### 2. Atualizar `src/pages/Onboarding.tsx`
Substituir todas as 3 ocorrencias de `window.location.hostname` por:
```ts
const appDomain = import.meta.env.VITE_APP_DOMAIN || window.location.hostname;
```

Isso garante que:
- Em producao com dominio customizado: mostra `deliveryarraial.com.br`
- Em qualquer outro ambiente sem a variavel: mostra o hostname atual como fallback

### Arquivos modificados
- `.env` -- adicionar `VITE_APP_DOMAIN`
- `src/pages/Onboarding.tsx` -- usar a variavel em vez de `window.location.hostname` (3 ocorrencias: campo de slug, preview do cartao, e resumo final)

