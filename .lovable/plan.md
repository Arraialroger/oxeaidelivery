

# Roadmap Completo: Do MVP ao Primeiro Cliente Real

## Premissa
Nenhum restaurante real está operando. Todos os dados são de teste. Isso nos permite fazer mudanças estruturais sem risco.

## Fase 1: Fluxo Crítico de Ponta a Ponta (Prioridade Maxima)
**Objetivo**: Um dono de restaurante consegue se cadastrar, configurar tudo e receber o primeiro pedido real.

### 1.1 Validar e Corrigir o Onboarding Self-Service
- Testar o fluxo completo: signup -> wizard -> restaurante criado -> admin acessivel
- Garantir que `owner_id` seja corretamente atribuido na criacao
- Verificar que categorias e produtos template aparecem no menu publico
- Testar que o trial de 14 dias do plano Pro e criado corretamente

### 1.2 Validar o Fluxo Completo de Pedido
- Cliente acessa `/{slug}`, ve o menu, adiciona ao carrinho
- Checkout com endereco, pagamento PIX via Mercado Pago
- Pedido aparece na Cozinha (KDS) em tempo real
- Admin pode mudar status do pedido
- Push notification funciona para o cliente

### 1.3 Limpar Tabela `config` Legada
- A tabela `config` (singleton) e um residuo pre-multi-tenant
- Verificar se ainda ha codigo dependente dela e migrar para `restaurants.settings`
- Remover referencias no frontend para evitar confusao

## Fase 2: Completar o Admin para Operacao Real
**Objetivo**: O dono consegue operar o dia-a-dia sem suporte tecnico.

### 2.1 Modularizar Componentes Grandes
- `Kitchen.tsx` (~1.845 linhas) - Dividir em: `KdsOrderCard`, `KdsFilters`, `KdsStatusColumns`, `KdsPrintReceipt`, `KdsTimerBadge`
- `Checkout.tsx` (~830 linhas) - Dividir em: `CheckoutSummary`, `CheckoutPayment`, `CheckoutDeliveryMode`
- Isso nao muda funcionalidade, mas evita bugs futuros e facilita manutencao

### 2.2 Funcionalidades Admin Faltantes
- **Relatorio de vendas exportavel** (PDF/CSV) - donos precisam disso para contabilidade
- **Configuracao de horario de funcionamento** conectada ao `schedule_mode: auto` (ja existe UI mas validar integracao)
- **Notificacao de novo pedido por som/vibracaoo** no KDS (alem do push)

### 2.3 Experiencia do Cliente Final
- **Tela "Meus Pedidos"** - historico de pedidos do cliente naquele restaurante
- **Tela de acompanhamento de pedido** - validar que o tracking em tempo real funciona
- **Feedback pos-pedido** - avaliacaoo simples (1-5 estrelas) para gerar dados de qualidade

## Fase 3: Monetizacao e Billing
**Objetivo**: Cobrar dos restaurantes apos o trial.

### 3.1 Ativar o Sistema de Subscriptions
- Os planos (Starter/Pro/Enterprise) ja existem no banco
- Criar pagina de billing no admin: mostrar plano atual, dias restantes do trial, botao de upgrade
- Implementar limites reais baseados no plano (ex: Starter = 30 produtos, Pro = ilimitado)
- Criar Edge Function para verificar limites antes de criar produto/zona

### 3.2 Gateway de Cobranca da Plataforma
- Integrar cobranca recorrente (Mercado Pago ou Stripe) para os planos
- Webhook para atualizar status da subscription automaticamente
- Email automatico 3 dias antes do trial expirar

## Fase 4: Comunicacao Real com Cliente
**Objetivo**: O restaurante consegue se comunicar com seus clientes.

### 4.1 WhatsApp Business API
- Notificacao de "pedido confirmado" e "pedido saiu para entrega" via WhatsApp
- Requer conta WhatsApp Business API (Meta) - custo por mensagem
- Alternativa mais simples: link `wa.me` com mensagem pre-formatada

### 4.2 Email Transacional
- Confirmacao de pedido por email
- Configurar dominio de email para envio (Resend, SendGrid ou similar)

## Fase 5: Growth e Escala
**Objetivo**: Atrair mais restaurantes e otimizar conversao.

### 5.1 Landing Page / Marketplace
- Pagina inicial da plataforma mostrando restaurantes disponiveis por cidade
- SEO basico: meta tags, sitemap, Open Graph por restaurante

### 5.2 Dashboard de Conversao
- Usar dados de `checkout_events` para mostrar funil: visualizou menu -> adicionou ao carrinho -> iniciou checkout -> pagou
- Taxa de abandono por etapa

### 5.3 Automacoes de Retencao
- Push/WhatsApp para clientes inativos ha 7+ dias
- Cupom automatico de reativacao
- Usar a classificacao de clientes (`customerClassification.ts`) para segmentar

---

## Resumo de Prioridade

| Fase | Esforco | Impacto | Prazo Sugerido |
|------|---------|---------|----------------|
| 1. Fluxo E2E | Medio | Critico | 1-2 semanas |
| 2. Admin Completo | Alto | Alto | 2-3 semanas |
| 3. Monetizacao | Medio | Critico | 1-2 semanas |
| 4. Comunicacao | Medio | Alto | 1-2 semanas |
| 5. Growth | Variavel | Medio | Continuo |

## Proximo Passo Recomendado
Comecar pela **Fase 1**: testar o onboarding de ponta a ponta e o fluxo completo de um pedido. Se isso funcionar sem falhas, a plataforma esta pronta para o primeiro cliente real. Todo o resto pode ser construido iterativamente com o restaurante ja operando.

## Detalhes Tecnicos

### Arquivos principais a modificar na Fase 1:
- `src/pages/Onboarding.tsx` + `src/hooks/useOnboarding.ts` - validar fluxo
- `supabase/functions/create-restaurant/index.ts` - ja implementado, testar
- `src/pages/Kitchen.tsx` - validar recebimento de pedidos em tempo real
- `supabase/functions/process-payment/index.ts` - validar PIX end-to-end

### Arquivos a criar na Fase 2:
- `src/components/kitchen/KdsOrderCard.tsx`
- `src/components/kitchen/KdsFilters.tsx`
- `src/components/kitchen/KdsStatusColumns.tsx`
- `src/components/checkout/CheckoutSummary.tsx`
- `src/components/admin/SalesReport.tsx`
- `src/components/admin/BillingDashboard.tsx`

### Tabela `config` - Dependencias a remover:
- `src/hooks/useConfig.ts` - migrar para `useRestaurantContext().settings`
- `src/components/admin/ConfigForm.tsx` - substituir por settings do restaurante
- Qualquer referencia direta a `config` no frontend

