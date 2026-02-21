# Guia de Testes PIX - Fase de Estabilização

## Cenários de Teste

### 1. PIX Aprovado Normalmente
1. Criar pedido com pagamento PIX Online
2. Verificar que QR Code aparece no modal
3. Console: `[PIX] Payment created: paymentId=X, cid=Y`
4. Pagar via app do banco
5. Verificar transição automática para "Pagamento Aprovado"
6. Console: `[PIX] Status change detected via realtime: approved`
7. Verificar redirecionamento para Order Tracking

### 2. PIX Rejeitado
1. Simular rejeição via SQL: `UPDATE payments SET status = 'rejected' WHERE id = 'X'`
2. Verificar que modal mostra "Pagamento Rejeitado"
3. Verificar botão "Gerar novo PIX" funciona

### 3. PIX Expirado
1. Esperar countdown zerar no modal
2. Verificar que mostra "Erro" com botão "Tentar novamente"
3. Verificar que localStorage foi limpo
4. Clicar em "Tentar novamente" → novo QR Code

### 4. Cliente Fecha e Volta (mesmo dispositivo)
1. Criar pedido PIX, ver QR Code
2. Fechar modal (X)
3. Navegar para Order Tracking
4. Verificar banner "Pagamento pendente" com botão "Pagar"
5. Clicar "Pagar" → modal abre com mesmo QR Code (via localStorage)

### 5. Cliente Recarrega Página
1. Criar pedido PIX
2. Recarregar página (F5)
3. Abrir modal novamente → deve restaurar PIX do localStorage
4. Console: `[PIX] Restored from localStorage, paymentId=X`

### 6. Webhook Atrasado
1. Criar pedido PIX
2. Polling detecta aprovação antes do webhook
3. Console: `[PIX-POLL] #N: status=approved`
4. Verificar transição correta

### 7. Double-Click Protection
1. Na tela de checkout, clicar rapidamente no botão "Enviar Pedido"
2. Console deve mostrar: `[CHECKOUT] Blocked duplicate submission`
3. Verificar que apenas 1 pedido foi criado

### 8. Reconciliação Automática
1. Criar pagamento aprovado com pedido pendente manualmente:
   ```sql
   UPDATE payments SET status = 'approved', paid_at = now() WHERE id = 'X';
   -- NÃO atualizar o order
   ```
2. Chamar `reconcile-payments` via curl ou Supabase dashboard
3. Verificar que o pedido foi atualizado para `preparing`
4. Verificar registro em `payment_events` com `event_type = 'reconciliation_fix'`
5. Verificar alerta em `payment_alerts`

### 9. Rate Limiting
1. Tentar criar mais de 3 PIX para o mesmo pedido → erro 429
2. Tentar mais de 100 PIX por restaurante/hora → erro 429

### 10. Validação de Valor (Anti-fraude)
1. Chamar `process-payment` com amount diferente do order.total
2. Verificar resposta: `Amount does not match order total`

## Verificação de Logs Estruturados

### No Console do Navegador
Filtrar por `[PIX`:
- `[PIX] Creating payment for order=X`
- `[PIX] Payment created: paymentId=X, cid=Y`
- `[PIX-RT] Channel: SUBSCRIBED`
- `[PIX-POLL] #1: status=pending`
- `[PIX] Status change detected via realtime: approved`
- `[PIX] Cleanup: channel removed, polls=N`

### Nos Logs da Edge Function
Cada log é JSON estruturado com campos:
- `fn`: nome da função
- `cid`: correlation_id (rastreamento end-to-end)
- `action`: ação executada
- `detail`: dados relevantes

### Indicador Realtime (DEV)
No modal PIX, bolinha no header:
- 🟢 Verde: SUBSCRIBED (conectado)
- 🟡 Amarelo: Conectando
- 🔴 Vermelho: Erro de conexão

## Endpoints para Teste Manual

```bash
# Criar pagamento
curl -X POST https://xcogccusyerkvoimfxeb.supabase.co/functions/v1/process-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANON_KEY" \
  -d '{"order_id":"...", "restaurant_id":"...", "amount": 50.00}'

# Executar reconciliação
curl -X POST https://xcogccusyerkvoimfxeb.supabase.co/functions/v1/reconcile-payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ANON_KEY"
```
