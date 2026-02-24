

# Camada de Notificacoes Externas com Protecao contra Duplicacao

## Resumo

Criar a tabela `notification_queue`, a Edge Function `process-notifications`, e o trigger `enqueue_critical_alert_notification()` com protecao de idempotencia em dois niveis: logica no trigger (NOT EXISTS) e indice UNIQUE no banco.

## Componentes

### 1. Migracao SQL

**Tabela `notification_queue`:**
- `id` uuid PK default gen_random_uuid()
- `alert_id` uuid NOT NULL (FK para payment_alerts)
- `restaurant_id` uuid
- `channel` text default 'email' (email, whatsapp, slack)
- `recipient` text nullable
- `subject` text NOT NULL
- `body` text NOT NULL
- `status` text default 'pending' (pending, processing, sent, failed, skipped)
- `attempts` integer default 0
- `max_attempts` integer default 3
- `last_attempt_at` timestamptz
- `sent_at` timestamptz
- `error_message` text
- `metadata` jsonb default '{}'
- `created_at` timestamptz default now()

**Indice UNIQUE em `alert_id`:**
- `CREATE UNIQUE INDEX idx_notification_queue_alert_id ON notification_queue(alert_id)`
- Garante protecao a nivel de banco contra duplicacoes, mesmo em cenarios de concorrencia

**Indice para performance do worker:**
- `CREATE INDEX idx_notification_queue_pending ON notification_queue(status, created_at) WHERE status = 'pending'`

**RLS:**
- SELECT: admins podem ver notificacoes do seu restaurante (`restaurant_id = get_user_restaurant_id(auth.uid())`)
- Sem INSERT/UPDATE/DELETE via frontend (apenas service role e trigger SECURITY DEFINER)

**Funcao trigger `enqueue_critical_alert_notification()`:**

```text
CREATE FUNCTION enqueue_critical_alert_notification()
RETURNS trigger AS $$
BEGIN
  IF NEW.severity = 'critical'
     AND NEW.alert_type LIKE 'health_%'
     AND NOT EXISTS (
       SELECT 1 FROM notification_queue WHERE alert_id = NEW.id
     )
  THEN
    INSERT INTO notification_queue (alert_id, restaurant_id, channel, subject, body, metadata)
    VALUES (
      NEW.id,
      NEW.restaurant_id,
      'email',
      'Alerta Critico: ' || NEW.alert_type,
      NEW.message,
      jsonb_build_object('alert_type', NEW.alert_type, 'source', 'auto_trigger')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Trigger:**
- `AFTER INSERT ON payment_alerts FOR EACH ROW EXECUTE FUNCTION enqueue_critical_alert_notification()`

A protecao contra duplicacao opera em dois niveis:
1. **Logica**: `NOT EXISTS` no trigger evita tentativa de insert duplicado
2. **Banco**: indice UNIQUE em `alert_id` como barreira final contra race conditions

### 2. Edge Function `process-notifications`

- Autenticacao via `CRON_SECRET_KEY` (mesmo padrao de reconcile-payments e health-check)
- Busca ate 20 registros com `status = 'pending'` e `attempts < max_attempts`
- Para cada notificacao:
  - Marca como `processing`
  - Simula envio com log estruturado `[NOTIFY-SIM]`
  - Marca como `sent` com `sent_at` ou incrementa `attempts` e registra `error_message`
  - Se `attempts >= max_attempts`, marca como `failed`
- Log com `correlation_id`, metricas de processamento
- Totalmente assincrono, nao bloqueia nenhum fluxo

### 3. Config.toml

Adicionar entrada para `process-notifications` com `verify_jwt = false`.

## Arquivos a Criar/Editar

1. **Nova migracao SQL** -- tabela, indices, funcao trigger, RLS
2. **`supabase/functions/process-notifications/index.ts`** -- Edge Function worker
3. **`supabase/config.toml`** -- registro da nova funcao

## O que NAO muda

- Fluxo de criacao de alertas (health-check, reconcile-payments)
- PaymentMonitorPanel (sem mudancas visuais)
- Nenhum provedor externo integrado

## Acao Manual Apos Implementacao

Configurar o pg_cron no SQL Editor:

```text
SELECT cron.schedule(
  'process-notifications-every-2min',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/process-notifications',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer CRON_SECRET_KEY"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) AS request_id;
  $$
);
```

