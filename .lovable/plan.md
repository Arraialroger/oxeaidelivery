

# Fase 1: Tema Dinamico por Restaurante

## Resumo

Implementar um sistema de cores dinamicas onde cada restaurante configura suas cores no painel admin, e o frontend aplica automaticamente via CSS variables. Zero impacto no banco (usa o JSONB `settings` existente). Fallback para tema neutro otimizado para conversao.

## O que muda para o lojista

Uma nova secao "Cores / Aparencia" aparece dentro da aba **Perfil** do admin, com 4 color pickers simples:
- **Cor primaria** (botoes, destaques, CTA)
- **Cor secundaria** (fundo de cards, badges)
- **Cor de fundo** (background geral)
- **Cor de texto** (textos principais)

Preview em tempo real ao lado dos pickers mostrando como ficam botao, card e texto.

---

## Arquitetura Tecnica

### 1. Banco de Dados (zero migrations)

As cores ficam dentro de `restaurants.settings` (JSONB), adicionando um objeto `theme`:

```text
settings: {
  ...campos_existentes,
  theme: {
    primary: "#E63946",
    secondary: "#1D3557",
    background: "#FFFFFF",
    foreground: "#1A1A2E"
  }
}
```

Nenhuma coluna nova. Nenhuma migration. O campo `primary_color` e `secondary_color` existentes na tabela continuam para compatibilidade (favicon, PWA), mas o tema visual usa `settings.theme`.

### 2. Tipo RestaurantSettings (src/types/restaurant.ts)

Adicionar interface `RestaurantTheme` e campo `theme?` ao `RestaurantSettings`. Definir `DEFAULT_THEME` neutro:

```text
DEFAULT_THEME = {
  primary: "#E63946"    -- vermelho conversivo (CTA forte)
  secondary: "#1D3557"  -- azul escuro (confianca)
  background: "#FFFFFF" -- fundo limpo
  foreground: "#1A1A2E" -- texto escuro legivel
}
```

### 3. Injecao de CSS Variables (src/contexts/RestaurantContext.tsx)

Dentro do `RestaurantProvider`, apos carregar o restaurante, injetar CSS variables no `document.documentElement.style`:

```text
--primary: [HSL convertido de theme.primary]
--primary-foreground: [calculado automaticamente]
--background: [HSL convertido de theme.background]
--foreground: [HSL convertido de theme.foreground]
--secondary: [HSL convertido de theme.secondary]
--card: [derivado de background]
--muted: [derivado de secondary]
--border: [derivado de secondary]
--ring: [igual ao primary]
```

Isso substitui automaticamente todas as CSS variables do Tailwind definidas em `index.css`, sem precisar alterar nenhum componente existente. Todos os botoes, cards, textos e backgrounds ja usam essas variables.

Logica de cleanup: ao desmontar o provider, remover as variables para nao contaminar outros restaurantes.

### 4. Utilidade de Conversao HEX -> HSL (src/lib/themeUtils.ts)

Criar funcao `hexToHSL(hex: string): string` que converte "#E63946" para "355 80% 56%" (formato Tailwind sem `hsl()`).

Funcao `applyTheme(theme: RestaurantTheme)` que calcula todas as variables derivadas e aplica no DOM.

Funcao `removeTheme()` para cleanup.

Validacao: aceitar apenas hex validos (`/^#[0-9A-Fa-f]{6}$/`), rejeitar qualquer outro input (prevencao de CSS injection).

### 5. Editor de Cores no Admin (src/components/admin/RestaurantProfileForm.tsx)

Adicionar um novo Card "Aparencia" dentro do formulario existente, com:
- 4 inputs `type="color"` nativos do HTML (funcionam em todos os browsers, zero dependencia)
- Ao lado, um mini-preview com: botao primario, card com fundo secondary, texto foreground sobre background
- O preview atualiza em tempo real conforme o usuario muda as cores
- Botao "Restaurar Padrao" que reseta para DEFAULT_THEME

As cores sao salvas no campo `settings` via `useRestaurantProfile` (ja existe a mutation de update).

### 6. Hook useRestaurantProfile (update)

Atualizar o hook para incluir `theme` no UpdateProfileData, salvando dentro de `settings.theme` via merge com settings existentes.

### 7. useRestaurantHead (update)

Atualizar para usar `settings.theme.primary` como `theme-color` do PWA (com fallback para `primary_color`).

---

## Fluxo Completo

```text
Lojista abre Admin > Perfil > Aparencia
  |
  v
Escolhe 4 cores com color picker nativo
  |
  v
Preview em tempo real mostra resultado
  |
  v
Clica "Salvar"
  |
  v
settings.theme salvo no JSONB do restaurants
  |
  v
Cliente acessa /slug/menu
  |
  v
RestaurantProvider carrega restaurant
  |
  v
useEffect injeta CSS variables no :root
  |
  v
Tailwind aplica as cores em TODOS os componentes automaticamente
```

---

## Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/lib/themeUtils.ts` | **Criar** - hexToHSL, applyTheme, removeTheme |
| `src/types/restaurant.ts` | **Modificar** - adicionar RestaurantTheme + DEFAULT_THEME |
| `src/contexts/RestaurantContext.tsx` | **Modificar** - useEffect para injetar CSS variables |
| `src/components/admin/RestaurantProfileForm.tsx` | **Modificar** - adicionar Card "Aparencia" com color pickers |
| `src/hooks/useRestaurantProfile.ts` | **Modificar** - incluir theme no update |
| `src/hooks/useRestaurantHead.ts` | **Modificar** - usar theme.primary para PWA |

---

## Tema Padrao Neutro (otimizado para conversao)

Quando o restaurante nao configura nada, aplica-se:
- **Primaria**: Vermelho (#E63946) -- cor de maior conversao em delivery/food
- **Secundaria**: Azul escuro (#1D3557) -- transmite confianca
- **Fundo**: Branco (#FFFFFF) -- limpo, profissional
- **Texto**: Quase preto (#1A1A2E) -- legibilidade maxima

Esse tema segue os padroes de iFood, Rappi e UberEats.

---

## Seguranca

- Validacao regex de hex no frontend e no Zod schema
- CSS variables sao injetadas via `style.setProperty()` (seguro, nao aceita CSS arbitrario)
- Nenhum `dangerouslySetInnerHTML` ou template literal de CSS
- Isolamento garantido: cleanup no unmount do provider

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Lojista escolhe cores com baixo contraste | Mini-preview mostra resultado em tempo real |
| Flash de tema padrao antes do tema carregar | Tema padrao neutro (branco) nao causa flash visivel |
| Cores do admin (dashboard) serem afetadas | Admin nao esta dentro do RestaurantProvider, logo nao e afetado |

---

## O que NAO esta nesta fase (futuro)

- Marketplace de temas prontos
- Dark mode toggle
- Custom CSS
- Upload de favicon customizado (ja funciona via logo)
- Validacao WCAG de contraste

