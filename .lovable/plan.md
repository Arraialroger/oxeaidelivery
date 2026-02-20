

# Branding Dinamico Multi-Tenant: Plano Estrategico e Executavel

## Situacao Atual

Tudo esta hardcoded para "Astral Gastro Bar" em `index.html` e `vite.config.ts`. O `RestaurantContext` ja carrega todos os dados necessarios (`name`, `logo_url`, `primary_color`, `description`, `hero_banner_url`) mas nao os aplica ao `<head>` da pagina.

Nenhum hook `useRestaurantHead` existe. O manifest PWA e estatico no build.

---

## Cronograma de Implementacao

### Sprint 1 (Dia 1-2): Title, Favicon, Theme Color e Meta Tags

**Escopo:**
- Criar hook `useRestaurantHead.ts` que manipula o DOM do `<head>`
- Integrar no `RestaurantLayoutContent`
- Atualizar `index.html` com valores genericos de fallback

**Entregas ao final:**
- Ao acessar `seuapp.com/astral/menu`, o titulo da aba mostra "Astral Gastro Bar"
- O favicon muda para o logo do restaurante
- A cor do tema (barra do navegador mobile) reflete a `primary_color`
- Meta tags OG (og:title, og:image, og:description) sao atualizadas para cada restaurante

**Detalhes tecnicos:**
- `document.title` = `restaurant.name + " | Delivery"`
- Manipulacao de `<link rel="icon">` via `document.querySelector`
- Manipulacao de `<meta property="og:*">` via DOM
- Cleanup no `useEffect` return para restaurar valores padrao ao sair

**Impacto:** Alto. Todo cliente que abre o app ve imediatamente a marca do restaurante na aba do navegador e ao compartilhar links no Google.

---

### Sprint 2 (Dia 3-4): Manifest PWA Dinamico

**Escopo:**
- Gerar manifest JSON dinamicamente via Blob URL no cliente
- Atualizar `<link rel="manifest">` no hook
- Manter o `vite-plugin-pwa` apenas para service worker e workbox (remover bloco `manifest`)
- Manter um `manifest.webmanifest` estatico generico como fallback

**Entregas ao final:**
- Ao instalar o PWA de qualquer restaurante, o nome e icone na tela inicial correspondem ao restaurante
- O `start_url` aponta para `/{slug}/menu`

**Detalhes tecnicos:**
```text
const manifest = {
  name: restaurant.name,
  short_name: restaurant.name.substring(0, 12),
  description: restaurant.description || "Faca seu pedido",
  theme_color: restaurant.primary_color || "#000000",
  background_color: restaurant.primary_color || "#000000",
  display: "standalone",
  start_url: `/${restaurant.slug}/menu`,
  scope: `/${restaurant.slug}/`,
  icons: [
    { src: restaurant.logo_url, sizes: "192x192", type: "image/png" },
    { src: restaurant.logo_url, sizes: "512x512", type: "image/png" }
  ]
}
const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
const url = URL.createObjectURL(blob);
// Atualizar <link rel="manifest"> href
```

**Risco:** Usuarios que ja instalaram o PWA antigo verao "Astral" ate reinstalar. Nao ha como forcar atualizacao de manifest pos-instalacao -- isso e uma limitacao do proprio browser.

**Impacto:** Medio-alto. Cada restaurante tem seu proprio "app" na tela inicial do cliente.

---

### Sprint 3 (Dia 5): Fallbacks e Robustez

**Escopo:**
- Atualizar `index.html` com titulo generico ("Delivery" em vez de "Astral Gastro Bar")
- Garantir que a pagina Index (marketplace) tenha seu proprio branding ("Arraial Delivery")
- Tratar casos: restaurante sem logo, sem cor, sem descricao
- Testar em multiplos restaurantes

**Entregas ao final:**
- Marketplace (`/`) mostra "Arraial Delivery" com branding proprio
- Qualquer rota `/:slug/*` mostra branding do restaurante
- Sem logo = favicon padrao da plataforma
- Sem cor = tema escuro padrao

**Impacto:** Essencial para robustez multi-tenant.

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useRestaurantHead.ts` | CRIAR -- hook principal |
| `src/components/layout/RestaurantLayout.tsx` | EDITAR -- chamar o hook |
| `index.html` | EDITAR -- valores genericos |
| `vite.config.ts` | EDITAR -- remover manifest estatico, manter workbox |

---

## Analise Estrategica Aprofundada

### SEO e Compartilhamento em Redes Sociais

**O problema:** WhatsApp, Facebook, Twitter e Telegram fazem scraping do HTML inicial (sem executar JavaScript). Como o app e uma SPA React, as meta tags OG que atualizamos via JS nao sao lidas por esses crawlers.

**Solucoes ranqueadas por viabilidade:**

1. **Edge Function de Pre-rendering (recomendada para o futuro proximo)**
   - Uma Edge Function no Supabase que intercepta requisicoes de crawlers (detectados pelo User-Agent)
   - Retorna um HTML minimo com as meta tags corretas para aquele slug
   - Custo baixo, sem mudar a arquitetura do frontend
   - Implementacao: 1-2 dias quando for prioridade

2. **Servico de pre-rendering externo (ex: Prerender.io, Rendertron)**
   - Proxy que renderiza a pagina e serve HTML estatico para bots
   - Custo mensal, mas plug-and-play
   - Nao requer mudanca no codigo

3. **Migrar para Next.js/SSR**
   - Resolveria 100% o problema, mas e uma reescrita completa do frontend
   - NAO recomendo agora -- o custo e desproporcional ao beneficio
   - So faz sentido se houver necessidade forte de SEO organico (ex: aparecer no Google como resultado de busca)
   - Para um app de delivery acessado via link direto, SSR e overkill

**Minha recomendacao:** Implementar a solucao client-side agora (funciona para Google, que executa JS). Quando compartilhamento em redes sociais virar prioridade comercial, implementar a Edge Function de pre-rendering (solucao 1). Nao migrar para Next.js.

### Manifest e PWA

**Riscos tecnicos do manifest dinamico:**
- **Performance:** Nenhum impacto mensuravel. Gerar um JSON de 500 bytes e criar um Blob URL leva menos de 1ms.
- **Cache do Service Worker:** O workbox pode cachear o manifest antigo. Solucao: excluir `manifest.webmanifest` do `globPatterns`.
- **Reinstalacao:** Usuarios que ja instalaram nao verao mudancas no icone/nome sem reinstalar. Isso e uma limitacao dos browsers, nao do codigo.

**Como grandes plataformas fazem:**
- iFood, Rappi, UberEats nao sao multi-tenant no PWA -- cada marca tem seu proprio app nativo
- Plataformas white-label como Cardapio Digital, Anota AI usam subdominio por restaurante (`restaurante.plataforma.com`) com manifest gerado no servidor
- A abordagem de Blob URL e valida e usada por plataformas menores que rodam como SPA

### Branding Avancado -- Funcionalidades Futuras

Sugestoes para aumentar o valor percebido da plataforma, ordenadas por impacto:

1. **Dominio proprio por restaurante** (alto valor percebido)
   - Permitir que o restaurante use `pedidos.restaurante.com.br`
   - Lovable ja suporta dominios customizados
   - Implementacao: DNS CNAME + roteamento por hostname no app

2. **Cores dinamicas completas (CSS Custom Properties)**
   - Ao carregar o restaurante, injetar `--primary`, `--secondary`, `--accent` como CSS variables
   - Todo o tema Tailwind/shadcn ja usa CSS variables -- so precisa sobrescrever
   - O app inteiro muda de cor para cada restaurante sem nenhuma mudanca nos componentes

3. **E-mail transacional personalizado**
   - Confirmacao de pedido, reset de senha com logo e cores do restaurante
   - Requer templates de e-mail dinamicos (Resend, SendGrid ou Supabase Email Templates)

4. **QR Code personalizado para mesa/delivery**
   - Gerar QR code com logo do restaurante embutido
   - Link direto para `seuapp.com/slug/menu`

5. **Splash screen customizada no PWA**
   - O browser gera automaticamente a splash screen a partir do manifest (nome + icone + background_color)
   - Com o manifest dinamico, isso ja vem de graca

---

## Indicadores para Acompanhar

| Metrica | Como medir |
|---------|------------|
| Adocao PWA por restaurante | Evento `appinstalled` + analytics |
| Taxa de compartilhamento | Clicks em botoes de share (se existirem) |
| Branding configurado | % de restaurantes com logo e cores definidas |

## Proximo Passo

Aprovar este plano para implementar as Sprints 1, 2 e 3 (Title/Favicon/Meta/Manifest dinamico) em uma unica iteracao de codigo.

