

# Sprint 2 Fix: Realtime + Polling no PixPaymentModal

## Problema Identificado

O `PixPaymentModal.tsx` usa polling via `setInterval` para verificar o status do pagamento, mas tem um bug critico na logica de estados:

1. O `useEffect` (linha 78) verifica `if (state !== 'ready') return`
2. Imediatamente muda `state` para `'polling'` (linha 81)
3. Como `state` esta nas dependencias do `useEffect`, ele re-executa
4. Na re-execucao, `state === 'polling'` (nao e `ready`), entao faz `return`
5. O cleanup da primeira execucao destroi o `setInterval`
6. Resultado: polling nunca funciona efetivamente

Alem disso, **nao usa Supabase Realtime** apesar da tabela `payments` ja estar na publicacao `supabase_realtime`.

## Solucao

Reescrever o mecanismo de deteccao de pagamento no `PixPaymentModal.tsx` para usar:

1. **Supabase Realtime como canal primario** -- recebe UPDATE instantaneamente
2. **Polling como fallback** -- a cada 5 segundos, caso o Realtime falhe
3. **Correcao do bug de estado** -- separar o estado de "pronto para exibir" do estado de "aguardando pagamento"

## Alteracoes

### Arquivo: `src/components/checkout/PixPaymentModal.tsx`

Substituir o `useEffect` de polling (linhas 77-113) por um novo `useEffect` que:

1. **Cria um canal Realtime** com `supabase.channel(`pix-payment:${paymentId}`)` escutando `postgres_changes` na tabela `payments` filtrado por `id=eq.${paymentId}` para evento `UPDATE`
2. Quando recebe payload com `status === 'approved'`:
   - Muda estado para `'approved'`
   - Dispara `onPaymentApproved()` apos 2 segundos
3. Quando recebe `status === 'rejected'`:
   - Muda estado para `'rejected'`
4. **Inicia polling como fallback** com `setInterval` a cada 5 segundos (mesmo SELECT atual)
5. O polling nao depende mais do `state` -- usa uma ref `isListeningRef` para controlar se deve continuar
6. Cleanup: remove o canal Realtime e limpa o interval

### Logica de estado corrigida:

```text
'loading' -> createPayment() -> 'ready'
'ready'   -> useEffect detecta paymentId != null -> inicia Realtime + polling (sem mudar estado)
            -> Realtime/polling detecta approved -> 'approved' -> onPaymentApproved()
            -> Realtime/polling detecta rejected -> 'rejected'
```

O estado `'polling'` sera removido. Os estados `'ready'` e visualmente "aguardando" serao o mesmo -- o indicador "Aguardando pagamento..." continuara aparecendo quando `state === 'ready'`.

### Mudancas especificas:

- Remover o estado `'polling'` do type `PixState`
- Atualizar a condicao do JSX de `(state === 'ready' || state === 'polling')` para `state === 'ready'`
- Novo useEffect com Realtime + polling fallback, dependencias: `[paymentId, onPaymentApproved]` (sem `state`)
- Adicionar logs temporarios (`console.log`) para debug:
  - `[PIX-RT] Channel subscribed`
  - `[PIX-RT] Realtime event received: {status}`
  - `[PIX-POLL] Polling result: {status}`

## O que NAO muda

- Criacao do pagamento (edge function `process-payment`)
- Webhook (`payment-webhook`)
- Tabela `payments` e suas policies
- Fluxo do `Checkout.tsx` (onPaymentApproved, onClose)
- UI do modal (QR code, timer, copy)

## Resultado esperado

Quando o pagamento PIX for aprovado:
1. O webhook atualiza a tabela `payments`
2. O Realtime notifica o frontend em menos de 1 segundo
3. O modal mostra "Pagamento Aprovado!" automaticamente
4. Apos 2 segundos, redireciona para a tela de acompanhamento
5. Se o Realtime falhar, o polling detecta em ate 5 segundos

