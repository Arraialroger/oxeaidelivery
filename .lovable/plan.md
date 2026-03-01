

# Rotina de Limpeza Automatica do Banco de Dados

## Diagnostico Atual

**Cron jobs existentes:**
| Job | Frequencia | O que faz |
|-----|-----------|-----------|
| reconcile-payments-every-5min | */5 min | Reconcilia pagamentos |
| health-check-every-10min | */10 min | Verifica saude do sistema |
| process-notifications-every-2min | */2 min | Processa fila de notificacoes |
| cleanup-reconciliation-runs (job 2) | Domingo 3AM | DELETE > 60 dias (DUPLICADO) |
| cleanup-reconciliation-runs-90d (job 4) | Domingo 3AM | DELETE > 90 dias |

**Problemas encontrados:**
1. Job duplicado de limpeza (job 2 e job 4) -- um limpa 60d, outro 90d
2. Nenhuma limpeza para: `system_health_events`, `payment_events`, `kds_events`, `checkout_events`, `delivery_attempts_log`, `notification_queue` (processadas), `order_audit_log`, `sms_codes`, `push_subscriptions` expiradas
3. Essas tabelas crescem infinitamente em producao

## Politica de Retencao Recomendada

| Tabela | Retencao | Justificativa |
|--------|----------|---------------|
| reconciliation_runs | 90 dias | Auditoria de cron, volume alto |
| system_health_events | 90 dias | Observabilidade, volume medio |
| payment_events | 180 dias | Auditoria financeira, requer mais tempo |
| kds_events | 60 dias | Operacional, alto volume |
| checkout_events | 90 dias | Analytics de funil |
| delivery_attempts_log | 90 dias | Otimizacao de zonas |
| notification_queue (sent) | 30 dias | Ja processadas, so historico |
| order_audit_log | 180 dias | Auditoria de pedidos |
| sms_codes | 1 dia | Efemeros, ja existe funcao mas sem cron |
| push_subscriptions (expiradas) | 0 dias | Ja expiradas, sem utilidade |
| payment_alerts (resolvidos) | 90 dias | Historico de alertas |
| upsell_events | 90 dias | Analytics de conversao |
| referral_clicks | 180 dias | Analytics de marketing |

## Plano de Implementacao

### Passo 1: Remover job duplicado
Executar via SQL (nao migration): `SELECT cron.unschedule(2);` para remover o job antigo de 60 dias.

### Passo 2: Criar cron job unificado de limpeza
Um unico job semanal (Domingo 3AM UTC) que executa todos os DELETEs em sequencia:

```text
DELETE FROM reconciliation_runs WHERE executed_at < NOW() - INTERVAL '90 days';
DELETE FROM system_health_events WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM kds_events WHERE created_at < NOW() - INTERVAL '60 days';
DELETE FROM checkout_events WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM delivery_attempts_log WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM notification_queue WHERE status = 'sent' AND sent_at < NOW() - INTERVAL '30 days';
DELETE FROM notification_queue WHERE status = 'failed' AND created_at < NOW() - INTERVAL '30 days';
DELETE FROM payment_events WHERE created_at < NOW() - INTERVAL '180 days';
DELETE FROM order_audit_log WHERE created_at < NOW() - INTERVAL '180 days';
DELETE FROM payment_alerts WHERE resolved = true AND resolved_at < NOW() - INTERVAL '90 days';
DELETE FROM upsell_events WHERE created_at < NOW() - INTERVAL '90 days';
DELETE FROM referral_clicks WHERE created_at < NOW() - INTERVAL '180 days';
DELETE FROM sms_codes WHERE created_at < NOW() - INTERVAL '1 day';
DELETE FROM push_subscriptions WHERE expires_at < NOW();
```

### Passo 3: Remover job antigo de reconciliation_runs (job 4)
Substituido pelo job unificado: `SELECT cron.unschedule(4);`

## Execucao Tecnica

Tudo sera feito via SQL direto (nao migration), pois:
- Contem dados especificos do projeto (job IDs)
- Cron jobs nao devem ser replicados em remix

Serao 3 operacoes SQL sequenciais:
1. `cron.unschedule(2)` -- remove duplicado
2. `cron.unschedule(4)` -- remove antigo individual
3. `cron.schedule('db-cleanup-weekly', ...)` -- cria job unificado

## Resultado Esperado

- Um unico job de limpeza semanal cobrindo todas as tabelas de logs
- Zero acumulo infinito de dados
- Dados financeiros preservados por 6 meses (payment_events, order_audit_log)
- Dados operacionais preservados por 60-90 dias
- Dados efemeros limpos em 24h-30 dias

## Indicadores para Acompanhar

- Volume das tabelas de logs (query semanal)
- Execucao do job no `cron.job_run_details`
- Tempo de execucao do cleanup (se > 30s, considerar batch)

