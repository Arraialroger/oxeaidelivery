

# Correção: Erro ao Criar Pedido - CORS Bloqueando Domínio de Produção

## Diagnóstico

O pedido está falhando porque o domínio de produção `https://deliveryarraial.com.br` **não está na lista de origens permitidas** (CORS) das Edge Functions. Quando você acessa via `deliveryarraial.com.br/michael-burger/checkout`, a requisição para `create-order` é rejeitada pelo navegador antes mesmo de ser processada.

Os logs confirmam: a função inicia (boot) mas encerra (shutdown) sem processar nenhuma requisição — comportamento típico de falha CORS.

## Correção

Adicionar `https://deliveryarraial.com.br` na lista `ALLOWED_ORIGINS` de **duas** Edge Functions:

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/create-order/index.ts` | Adicionar domínio de produção ao ALLOWED_ORIGINS |
| `supabase/functions/process-payment/index.ts` | Adicionar domínio de produção ao ALLOWED_ORIGINS |

Ambas precisam ter a lista atualizada para:
```
"https://deliveryarraial.lovable.app"
"https://deliveryarraial.com.br"
"https://id-preview--0384a06e-621e-4be3-9b52-eaa7f97369ec.lovable.app"
```

Após a edição, as duas funções precisam ser re-deployed.

