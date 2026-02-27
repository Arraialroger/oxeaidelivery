
# Sistema de Observabilidade e Alertas via Telegram

## Resumo

Implementar deteccao automatica de falhas criticas com envio de alertas em tempo real via Telegram Bot API, reutilizando a infraestrutura existente (`notification_queue`, `payment_alerts`, `order_audit_log`) e criando uma nova tabela `system_health_events` como hub central de observabilidade.

## Arquitetura

```text
Fontes de Eventos:
  create-order (failed/timeout)
  process-payment (failed)
  payment-webhook (failed)
  health-check (critical results)
  order_audit_log (status=failed)
       |
       v
system_health_events (nova tabela)
       |
       | trigger (severity=critical)
       v
notification_queue (channel=telegram)
       |
       | pg_cron cada 2 min -> process-notifications
       v
Edge Function process-notifications
       |
       | fetch() -> Telegram Bot API
       v
Bot Telegram envia mensagem formatada
```

## Secrets Necessarios

Antes de implementar, serao solicitados 2 novos secrets:

| Secret | Descricao | Onde obter |
|--------|-----------|------------|
| `TELEGRAM_BOT_TOKEN` | Token do bot criado via @BotFather | https://t.me/BotFather -> /newbot |
| `TELEGRAM_CHAT_ID` | ID do chat/grupo que recebera alertas | Enviar mensagem ao bot, acessar `https://api.telegram.org/bot{TOKEN}/getUpdates` |

## Componentes

### 1. Migracao SQL

**Nova tabela: `system_health_events`**

| Coluna | Tipo | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| event_type | text | NOT NULL |
| severity | text | NOT NULL (info, warning, critical) |
| source | text | NOT NULL (create-order, process-payment, health-check, etc.) |
| restaurant_id | uuid | nullable |
| correlation_id | text | nullable |
| message | text | NOT NULL |
| metadata | jsonb | '{}' |
| created_at | timestamptz | now() |

**Indices:**
- `(severity, created_at DESC)`
- `(restaurant_id, created_at DESC)`

**RLS:**
- SELECT: admins do restaurante veem seus eventos; eventos globais (restaurant_id IS NULL) visiveis para qualquer admin
- INSERT/UPDATE/DELETE: bloqueados para frontend (apenas SECURITY DEFINER)

**Novo trigger: `enqueue_critical_health_event`**

Ao inserir em `system_health_events` com `severity = 'critical'`:
- Insere na `notification_queue` com `channel = 'telegram'`
- Dedup via NOT EXISTS (mesmo event_type + restaurant_id nos ultimos 30 min)
- Mensagem formatada em Markdown para Telegram

**Nova funcao SQL: `log_health_event()`**

Funcao `SECURITY DEFINER` que as Edge Functions chamam via RPC para registrar eventos. Parametros: event_type, severity, source, restaurant_id, correlation_id, message, metadata.

### 2. Edge Function: `process-notifications` (editar)

Substituir o bloco `[NOTIFY-SIM]` (simulacao) por envio real baseado no canal:

```text
if (notification.channel === 'telegram') {
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');
  
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: formatTelegramMessage(notification),
      parse_mode: 'Markdown',
    }),
  });
} else {
  // Canais futuros (email, whatsapp, slack) - manter simulacao
  log("[NOTIFY-SIM]", { channel: notification.channel });
}
```

**Formato da mensagem Telegram:**

Para `critical`:
```text
🔴 *ALERTA CRITICO*
*Tipo:* {event_type}
*Restaurante:* {restaurant_name ou id}
*Horario:* {timestamp formatado}
*Correlation ID:* `{correlation_id}`
*Detalhes:* {resumo do body}
```

Para `warning`:
```text
🟠 *AVISO*
*Tipo:* {event_type}
*Restaurante:* {restaurant_name ou id}
*Horario:* {timestamp formatado}
```

**Rate limit interno:** Maximo 20 mensagens Telegram por execucao do batch (ja controlado pelo LIMIT 20 existente).

**Retry:** Ja implementado via `attempts/max_attempts` na `notification_queue`.

### 3. Edge Functions existentes (editar para emitir eventos)

Adicionar chamada `supabase.rpc('log_health_event', {...})` nos pontos de falha de cada Edge Function:

**`create-order/index.ts`:**
- Apos falha no RPC (linhas 103-139): emitir evento `order_creation_failed` com severity `critical`
- Apos timeout (linha 129): emitir evento `order_creation_timeout` com severity `critical`

**`process-payment/index.ts`:**
- Apos falha na chamada ao Mercado Pago: emitir `payment_processing_failed` com severity `critical`

**`payment-webhook/index.ts`:**
- Apos falha na validacao do webhook: emitir `webhook_validation_failed` com severity `warning`

**`health-check/index.ts`:**
- Apos detectar resultados criticos (linha 197-234): emitir `health_check_critical` via `log_health_event` (alem dos payment_alerts ja existentes)

### 4. Dashboard "Saude da Plataforma" (novo componente)

**Novo arquivo: `src/components/admin/PlatformHealthPanel.tsx`**

Secoes:
- **Cards de metricas (grid 4 colunas):**
  - Erros criticos 24h (count de system_health_events severity=critical)
  - Warnings 24h
  - Ultimo evento critico (timestamp + tipo)
  - Tempo medio pedido->confirmacao (avg de orders.created_at ate payments.paid_at)
- **Grafico de falhas por hora** (recharts BarChart, ultimas 24h agrupado por hora)
- **Tabela de eventos recentes** com filtro por severidade e restaurante
- **Botao "Disparar alerta de teste":**
  - Insere evento ficticio via RPC `log_health_event` com event_type='test_alert', severity='critical'
  - O trigger enfileira na notification_queue
  - O cron process-notifications envia para Telegram
  - Frontend mostra toast confirmando

**Novo arquivo: `src/hooks/useSystemHealth.ts`**

Queries:
- Lista de system_health_events (ultimos 100, filtros de severidade/restaurante)
- Counts por severidade nas ultimas 24h
- Ultimo evento critico
- Tempo medio pedido->confirmacao
- Dados para grafico de falhas por hora (GROUP BY date_trunc('hour', created_at))

Realtime:
- Subscription na tabela `system_health_events` com filtro por restaurant_id

### 5. Integracao no Admin

Adicionar nova tab "Saude" no `Admin.tsx`:
- Icone: HeartPulse
- Renderizar `PlatformHealthPanel`
- Posicionar ao lado de "Monitor"

Atualizar o filtro de canal no `NotificationQueueSection.tsx`:
- Adicionar opcao "Telegram" no select de canais

### 6. Notificacao na notification_queue

Adicionar `'telegram'` como valor valido no campo `channel`.
A tabela ja suporta qualquer texto, nao precisa de migracao para isso.

## Arquivos a Criar/Editar

| Arquivo | Acao |
|---------|------|
| Nova migracao SQL | Criar: tabela system_health_events, trigger, funcao log_health_event, RLS |
| `supabase/functions/process-notifications/index.ts` | Editar: substituir simulacao por envio real Telegram |
| `supabase/functions/create-order/index.ts` | Editar: adicionar log_health_event em falhas |
| `supabase/functions/health-check/index.ts` | Editar: adicionar log_health_event para criticos |
| `src/hooks/useSystemHealth.ts` | Criar: hook com queries e realtime |
| `src/components/admin/PlatformHealthPanel.tsx` | Criar: dashboard de saude |
| `src/pages/Admin.tsx` | Editar: adicionar tab Saude |
| `src/components/admin/NotificationQueueSection.tsx` | Editar: adicionar "Telegram" no filtro de canal |

## O que NAO muda

- Fluxo de checkout transacional
- Fluxo de pagamento PIX
- Logica de idempotencia
- RLS existentes em outras tabelas
- Edge Functions de reconciliacao (apenas emissao de eventos)

## Sequencia de Implementacao

1. Solicitar secrets `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`
2. Migracao SQL (tabela + trigger + funcao RPC)
3. Editar `process-notifications` para envio real via Telegram
4. Editar Edge Functions para emitir eventos de saude
5. Criar hook `useSystemHealth` + componente `PlatformHealthPanel`
6. Integrar no Admin e atualizar filtros
7. Testar end-to-end com botao de alerta de teste

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Token Telegram invalido | Validacao na Edge Function + log de erro + status=failed na fila |
| Flood de mensagens | Dedup de 30 min no trigger + LIMIT 20 no batch + rate limit existente |
| Telegram API fora do ar | Retry automatico via attempts/max_attempts (3 tentativas) |
| Eventos demais em system_health_events | Indice eficiente + cleanup futuro (90 dias) |
