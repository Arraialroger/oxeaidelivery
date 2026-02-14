

# Automatizar Push Notifications por Status do Pedido

## Diagnostico

Apos analise detalhada do codigo, as push notifications **ja sao disparadas automaticamente** em cada mudanca de status no KDS (`Kitchen.tsx`, linha 612). O sistema ja cobre todos os status: `preparing`, `ready`, `out_for_delivery`, `delivered` e `cancelled`.

**O problema real**: o cliente precisa clicar manualmente no botao "Ativar" na pagina de rastreamento para se inscrever nas notificacoes. Isso cria atrito e muitos clientes nunca ativam, perdendo todas as notificacoes.

## Solucao

Automatizar a inscricao push em dois momentos-chave, eliminando a necessidade de acao manual do cliente:

### 1. Auto-subscribe na pagina de rastreamento (pedido novo)

Quando o cliente chega na pagina de rastreamento vindo do checkout (`?new=true`), o sistema automaticamente solicita permissao de notificacao e faz a inscricao, sem necessidade de clicar em botao.

**Arquivo**: `src/pages/OrderTracking.tsx`
- Adicionar `useEffect` que detecta `?new=true` + push suportado + permissao nao negada + nao inscrito
- Chamar `subscribe()` automaticamente apos 2 segundos (dar tempo da pagina carregar)
- Se permissao ja foi concedida anteriormente, inscricao e silenciosa
- Se primeira vez, o navegador mostra o prompt nativo de permissao
- Exibir toast de confirmacao apenas quando sucesso

### 2. Melhorar o banner de push para pedidos existentes

Para clientes que acessam pedidos existentes (sem `?new=true`), manter o banner atual mas com texto mais urgente e CTA mais visivel.

**Arquivo**: `src/pages/OrderTracking.tsx`
- Ajustar texto do banner para ser mais persuasivo
- Adicionar animacao de atencao no botao

### 3. Re-subscribe automatico se permissao ja concedida

Se o cliente ja deu permissao de notificacao em um pedido anterior, os proximos pedidos inscrevem automaticamente sem nenhum prompt.

**Arquivo**: `src/pages/OrderTracking.tsx`
- No `useEffect` de auto-subscribe, verificar `Notification.permission === 'granted'`
- Se ja concedido, inscrever silenciosamente sem mostrar nenhum UI

## Detalhes Tecnicos

### Fluxo do auto-subscribe:

```text
Cliente finaliza pedido
       |
       v
Redireciona para /slug/order/id?new=true
       |
       v
useEffect detecta new=true
       |
       v
Verifica: pushSupported && !isSubscribed && permission !== 'denied'
       |
       +-- permission === 'granted' --> subscribe() silencioso
       |
       +-- permission === 'default' --> subscribe() (mostra prompt nativo)
       |
       +-- permission === 'denied' --> nao faz nada (mostra banner informativo existente)
```

### Arquivos modificados:

1. **`src/pages/OrderTracking.tsx`** - Adicionar logica de auto-subscribe via useEffect

### Nenhuma mudanca necessaria em:
- Edge Function `send-push-notification` (ja funciona)
- `Kitchen.tsx` (ja dispara push em cada status)
- `usePushNotifications.ts` (hook ja esta pronto)
- Banco de dados (tabela `push_subscriptions` ja existe)

## Impacto Esperado

- **Antes**: Apenas clientes que clicam manualmente em "Ativar" recebem notificacoes (estimativa: 10-20%)
- **Depois**: Todo cliente que aceita a permissao do navegador recebe automaticamente (estimativa: 60-80%)
- **Resultado**: Mais engajamento, menos clientes ligando para perguntar status, experiencia premium

