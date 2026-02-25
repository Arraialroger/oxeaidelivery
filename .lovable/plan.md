

# Testes e Visibilidade da Fila de Notificacoes

## Resumo

Adicionar camada de testes manuais, metricas e visibilidade em tempo real para a `notification_queue` no painel Monitor, sem integrar canais externos.

## Arquitetura

```text
+----------------------------+
| PaymentMonitorPanel        |
+----------------------------+
| [Cards de Metricas]        |  <-- Pendentes, Falhadas, Taxa sucesso 24h, Ultima enviada
| [Testes do Sistema]        |  <-- Botao "Disparar Health-check manual"
| [Status do Sistema]        |  <-- Existente
| [Pagamentos Inconsist.]    |  <-- Existente
| [Status das Notificacoes]  |  <-- NOVO: tabela com filtros
| [Alertas do Sistema]       |  <-- Existente
+----------------------------+
         |
         | Realtime subscription
         v
+---------------------+
| notification_queue   |
| (filtro restaurant_id)
+---------------------+
```

## Componentes a Criar/Editar

### 1. Hook: `useNotificationQueue` (novo arquivo)

`src/hooks/useNotificationQueue.ts`

Responsabilidades:
- Query de notificacoes com filtros de status e canal
- Query de metricas agregadas (pendentes, falhadas, taxa sucesso 24h, ultima enviada)
- Subscription Realtime na `notification_queue` com filtro `restaurant_id`
- Mutation para disparar health-check manual via `supabase.functions.invoke('health-check')`

Queries:
- **Lista**: `notification_queue` com filtros de `status` e `channel`, order by `created_at desc`, limit 50
- **Metricas**: 3 queries count (pending, failed, sent nas ultimas 24h) + 1 query para ultima enviada
- **Disparo manual**: `supabase.functions.invoke('health-check', { method: 'POST' })` -- usa JWT do admin automaticamente

### 2. Componente: `NotificationQueueSection` (novo arquivo)

`src/components/admin/NotificationQueueSection.tsx`

Contem:
- **Cards de metricas** (3 cards no topo):
  - Fila: total pendentes + total falhadas
  - Taxa de sucesso: % sent / (sent + failed) nas ultimas 24h
  - Ultima enviada: data/hora + canal
- **Botao de teste**: "Disparar Health-check manual" com loading e toast de feedback
- **Tabela de notificacoes** com colunas: Canal, Status, Tentativas, Ultima tentativa, Tempo na fila, Erro
- **Filtros**: Select de status (todos/pending/sent/failed) e canal (todos/email/whatsapp/slack)
- **Badges coloridos**: pending=amarelo, processing=azul, sent=verde, failed=vermelho
- **Skeleton loading** nos cards e tabela
- **Estado vazio** amigavel

### 3. Edicao: `PaymentMonitorPanel.tsx`

- Importar e renderizar `NotificationQueueSection` entre os cards existentes e a tabela de alertas
- Nenhuma logica movida, apenas composicao

### 4. Edicao: `usePaymentMonitor.ts`

- Adicionar subscription Realtime na `notification_queue` com filtro `restaurant_id`
- Invalidar queries de notificacoes quando houver mudancas

## Detalhamento Tecnico

### Hook `useNotificationQueue`

```text
Queries:
1. notificationsList:
   SELECT * FROM notification_queue
   WHERE restaurant_id = $restaurantId
   [AND status = $statusFilter]
   [AND channel = $channelFilter]
   ORDER BY created_at DESC LIMIT 50

2. pendingCount:
   SELECT count(*) FROM notification_queue
   WHERE restaurant_id = $restaurantId AND status = 'pending'

3. failedCount:
   SELECT count(*) FROM notification_queue
   WHERE restaurant_id = $restaurantId AND status = 'failed'

4. sentLast24h:
   SELECT count(*) FROM notification_queue
   WHERE restaurant_id = $restaurantId
   AND status = 'sent'
   AND sent_at >= now() - interval '24 hours'

5. failedLast24h:
   SELECT count(*) FROM notification_queue
   WHERE restaurant_id = $restaurantId
   AND status = 'failed'
   AND created_at >= now() - interval '24 hours'

6. lastSent:
   SELECT * FROM notification_queue
   WHERE restaurant_id = $restaurantId AND status = 'sent'
   ORDER BY sent_at DESC LIMIT 1

Mutation triggerHealthCheck:
   supabase.functions.invoke('health-check', { method: 'POST' })
   -- JWT do admin enviado automaticamente pelo SDK

Realtime:
   Channel 'monitor-notifications' on notification_queue
   filter: restaurant_id=eq.$restaurantId
   -> invalidate all notification queries
```

### Componente `NotificationQueueSection`

Layout:
- 3 cards em grid `grid-cols-1 sm:grid-cols-3`
- Botao de teste em card separado "Testes do Sistema"
- Tabela com overflow-x-auto
- Filtros inline no header da tabela

Status badges:
- `pending` -> Badge variant="secondary" com cor amarela
- `processing` -> Badge com cor azul
- `sent` -> Badge com cor verde (outline)
- `failed` -> Badge variant="destructive"

### Realtime no `usePaymentMonitor`

Adicionar um 4o canal de subscription:

```text
const notifChannel = supabase
  .channel('monitor-notifications')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'notification_queue',
    filter: `restaurant_id=eq.${restaurantId}`,
  }, () => {
    queryClient.invalidateQueries({ queryKey: ['notification-queue'] });
  })
  .subscribe();
```

### Seguranca

- Health-check ja aceita JWT de admin (verificado no codigo existente)
- Nenhum secret exposto no frontend
- RLS da notification_queue ja configurado para SELECT por admins do restaurante
- Filtro explicito de restaurant_id em todas as queries (defesa em profundidade)

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useNotificationQueue.ts` | Criar |
| `src/components/admin/NotificationQueueSection.tsx` | Criar |
| `src/components/admin/PaymentMonitorPanel.tsx` | Editar (adicionar NotificationQueueSection) |
| `src/hooks/usePaymentMonitor.ts` | Editar (adicionar Realtime da notification_queue) |

## O que NAO muda

- Nenhuma migracao SQL necessaria (tabela e indices ja existem)
- Edge Functions inalteradas
- Nenhum provedor externo integrado
- RLS ja configurado corretamente

