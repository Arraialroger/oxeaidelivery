
# Plano: Corrigir Navegação e Adicionar Painel de Perfil do Lojista

## Visão Geral

Este plano resolve o bug de navegação entre o marketplace e a página de detalhes, e adiciona um painel no Admin para o lojista gerenciar seu próprio perfil.

---

## Problema Identificado

O botão de informação (ícone "i") no card do restaurante aponta para `/:slug`, mas o React Router está priorizando a rota `/:slug/*` que redireciona automaticamente para o menu.

**Evidência no código:**
- `RestaurantCard.tsx` linha 126: `<Link to={\`/${restaurant.slug}\`}>` (correto)
- `App.tsx` linha 40-41: `/:slug/*` com `index → Navigate to="menu"` (conflito)

---

## Parte 1: Correção do Bug de Navegação

### 1.1 Reorganizar Rotas no App.tsx

**Mudança:** Garantir que a rota `/:slug` seja tratada como uma rota terminal (sem match de wildcard).

```
Antes:
  /:slug     → RestaurantDetails
  /:slug/*   → RestaurantLayout (com redirect para menu)

Depois:
  Mesma estrutura, mas com ajuste de prioridade usando "end" ou reordenação
```

### 1.2 Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Ajustar ordem/especificidade das rotas |

---

## Parte 2: Painel de Edição do Perfil do Lojista

### 2.1 Nova Aba no Admin

Adicionar uma nova aba "Perfil" no painel administrativo que permite editar:

- Descrição do restaurante
- Redes sociais (Instagram, Facebook)
- Galeria de fotos (upload de até 6 imagens)
- Formas de pagamento aceitas
- Tempo médio de entrega
- Pedido mínimo

### 2.2 Componentes a Criar

| Componente | Descrição |
|------------|-----------|
| `src/components/admin/RestaurantProfileForm.tsx` | Formulário completo de edição |
| `src/components/admin/GalleryUploader.tsx` | Upload múltiplo de imagens para galeria |

### 2.3 Modificações Necessárias

| Arquivo | Ação |
|---------|------|
| `src/pages/Admin.tsx` | Adicionar aba "Perfil" com ícone Store |
| `src/hooks/useRestaurantProfile.ts` | Hook para buscar e atualizar dados do restaurante |

### 2.4 Fluxo de Upload de Imagens

```text
┌─────────────────────────────────────────────────────────┐
│                   Galeria de Fotos                      │
├─────────────────────────────────────────────────────────┤
│  1. Lojista seleciona imagens (até 6)                   │
│  2. Upload para Supabase Storage (bucket: restaurants)  │
│  3. URLs salvas na coluna gallery_urls[]                │
│  4. Exibidas na página de detalhes                      │
└─────────────────────────────────────────────────────────┘
```

### 2.5 Bucket de Storage (Nova Migração)

Criar bucket `restaurants` no Supabase Storage para armazenar:
- Logos
- Banners
- Fotos da galeria

---

## Parte 3: Dados de Teste para Astral

Após implementar o painel, o lojista poderá adicionar os dados. Mas para testes imediatos, rodar SQL:

```sql
UPDATE restaurants 
SET 
  description = 'A melhor hamburgueria artesanal da região.',
  instagram = '@astralburger',
  gallery_urls = ARRAY['url1', 'url2', 'url3']
WHERE slug = 'astral';
```

---

## Resumo das Entregas

| # | Entrega | Impacto |
|---|---------|---------|
| 1 | Corrigir navegação /:slug vs /:slug/* | Bug crítico resolvido |
| 2 | Aba "Perfil" no Admin | Lojista autônomo |
| 3 | Upload de galeria | Fotos gerenciadas pelo lojista |
| 4 | Storage bucket | Infraestrutura para imagens |

---

## Seção Técnica

### Detalhes da Correção de Rotas

O React Router v6 usa matching por especificidade. A rota `/:slug/*` captura qualquer path que comece com um slug, incluindo `/:slug` sozinho quando não há mais segmentos.

**Solução técnica:**
Mover a rota `/:slug` (RestaurantDetails) para **depois** da rota `/:slug/*`, mas garantir que seja uma rota separada e terminal. Alternativamente, usar um path mais específico como `/:slug/info` para detalhes.

Recomendação: Manter `/:slug` como detalhes (mais limpo semanticamente), ajustando a configuração do Router.

### RLS para Storage

```sql
-- Política para upload de imagens do restaurante
CREATE POLICY "Restaurant owners can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'restaurants' AND
  has_role(auth.uid(), 'admin')
);
```

### Hook useRestaurantProfile

```typescript
// Busca dados do restaurante do admin logado
const { data: profile, update } = useRestaurantProfile();

// Atualiza campos
await update({
  description: 'Nova descrição',
  instagram: '@novoinsta',
  gallery_urls: ['url1', 'url2']
});
```
