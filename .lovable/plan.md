

## Diagnóstico da Situação Atual

O painel admin possui **11 abas** na barra de navegação horizontal: Dashboard, Produtos, Categorias, Entrega, Cupons, Fidelidade, Horários, Perfil, Upsell, Pagamento, Config. Isso já é bastante — em mobile, o scroll horizontal é confuso e difícil de navegar.

As abas **Perfil**, **Pagamento** e **Config** tratam de configurações do restaurante, mas estão separadas. O usuário precisa navegar entre 3 abas diferentes para configurar seu negócio.

## Proposta: Consolidar em uma Única Aba "Configurações"

Unificar **Perfil + Pagamento + Config** em uma única aba **"Configurações"** com seções colapsáveis (accordion), e adicionar uma nova seção para **Integrações** (Pixel do Facebook, Google Tag, etc.).

### Estrutura da aba unificada:

```text
🔧 Configurações
├── 📋 Perfil do Restaurante (accordion)
│   └── [conteúdo atual do RestaurantProfileForm]
├── ⚙️ Operação (accordion)
│   └── [conteúdo atual do ConfigForm: taxa entrega, horário, KDS, fidelidade]
├── 💳 Pagamento (accordion)
│   └── [conteúdo atual do PaymentSettingsForm]
└── 📊 Integrações & Rastreamento (accordion) ← NOVO
    ├── Facebook Pixel ID
    ├── Google Analytics / GTM ID
    └── (futuro: TikTok Pixel, WhatsApp API key, etc.)
```

### Benefícios:
- **Reduz de 11 para 9 abas** — navegação mais limpa
- **Agrupamento lógico** — tudo que é "configuração" fica junto
- **Escalável** — novas integrações entram na seção sem criar mais abas
- **Mobile-friendly** — menos scroll horizontal na barra de abas

### Implementação Técnica

| Arquivo | Mudança |
|---------|---------|
| `src/types/restaurant.ts` | Adicionar `fb_pixel_id?: string`, `gtag_id?: string` ao `RestaurantSettings` |
| `src/pages/Admin.tsx` | Remover abas "Perfil", "Pagamento", "Config" → criar aba única "Configurações" com componente `SettingsPage` |
| `src/components/admin/SettingsPage.tsx` | **Novo** — accordion com 4 seções: Perfil, Operação, Pagamento, Integrações |
| `src/components/admin/IntegrationsForm.tsx` | **Novo** — formulário para FB Pixel ID e Google Tag ID, salva no `settings` JSONB |
| `src/components/admin/ConfigForm.tsx` | Pequeno ajuste para funcionar como seção (sem Card wrapper externo) |
| `src/contexts/RestaurantContext.tsx` | Passa `fb_pixel_id` e `gtag_id` do settings |
| `src/components/layout/RestaurantLayout.tsx` | Injetar scripts do Pixel/GTM dinamicamente baseado nos settings do restaurante |

### Integrações (FB Pixel + Google Tag)

Cada restaurante terá campos opcionais no `settings` JSONB:
- **`fb_pixel_id`** — ex: `"123456789012345"` → injeta `<script>` do Meta Pixel
- **`gtag_id`** — ex: `"G-XXXXXXXXXX"` ou `"GTM-XXXXXXX"` → injeta `<script>` do GA4/GTM

Os scripts serão injetados dinamicamente no `RestaurantLayout` quando o cliente acessa o cardápio do restaurante — sem impacto em outros restaurantes.

### Outras Melhorias Sugeridas

1. **Webhook de pedido** — campo para URL de webhook que recebe POST quando um pedido é criado (integração com sistemas externos)
2. **Domínio personalizado por restaurante** — campo para configurar domínio customizado
3. **Mensagem de WhatsApp customizada** — template da mensagem enviada ao cliente após pedido

