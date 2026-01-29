
# Plano: Resolver 6 Demandas do Sistema Multi-Tenant

## Respostas às Perguntas

### 1. Banner no Menu (Verificação)
**Confirmado:** O banner JÁ ESTÁ sendo exibido corretamente no cardápio (Menu.tsx).

O componente `HeroBanner` na linha 53 de `Menu.tsx` usa `restaurant.hero_banner_url` do contexto do restaurante. O sistema já está funcionando corretamente - cada restaurante exibe seu próprio banner com base na coluna `hero_banner_url` da tabela `restaurants`.

**Nenhuma ação necessária** para este item.

---

### 2. Configuração de Horário de Funcionamento

Adicionar uma nova aba "Horários" no painel Admin para configurar os horários de cada dia da semana.

**Componentes a Criar:**
| Componente | Descrição |
|------------|-----------|
| `src/components/admin/BusinessHoursForm.tsx` | Formulário para editar horários por dia |

**Hook a Criar:**
| Hook | Descrição |
|------|-----------|
| `src/hooks/useBusinessHoursMutations.ts` | Mutações para CRUD de horários |

**Interface do Formulário:**
- 7 linhas (Domingo a Sábado)
- Cada linha: checkbox "Fechado" + inputs de abertura/fechamento
- Botão "Salvar Horários"

---

### 3. Campo URL do Banner (Duplicidade)

**Análise Correta:** Você está certo! O campo "Banner da Home" no `ConfigForm.tsx` (linhas 132-160) está duplicado, pois:
- Na aba **Perfil** → Upload de banner (via `RestaurantProfileForm.tsx`)
- Na aba **Config** → URL do banner (campo de texto)

Ambos escrevem na mesma coluna `hero_banner_url` da tabela `restaurants`.

**Ação:** Remover a seção "Banner da Home" do `ConfigForm.tsx`, já que o upload pelo Perfil é mais intuitivo e moderno.

---

### 4. Imagem do Produto (URL vs Upload)

**Análise Estratégica:**

| Opção | Vantagens | Desvantagens |
|-------|-----------|--------------|
| **URL (atual)** | Simples, rápido | Exige conhecimento técnico, links podem quebrar |
| **Upload (proposto)** | Intuitivo, imagens seguras no storage | Mais desenvolvimento |

**Recomendação:** Implementar **upload de imagem** para produtos, similar ao que foi feito com logo/banner. Isso torna o sistema mais profissional e acessível para lojistas não-técnicos.

**Solução:** Reutilizar o componente `ImageUploader` já criado no formulário de produto.

---

### 5. Política de Privacidade Multi-Tenant

**Problema Identificado:** Os arquivos `PrivacyPolicy.tsx`, `TermsOfUse.tsx` e `Footer.tsx` estão hardcoded com "Astral Gastro Bar". Todos os restaurantes veem a mesma política.

**Solução:** Tornar dinâmico usando o contexto do restaurante:
- O `Footer.tsx` deve exibir o nome do restaurante atual (do contexto)
- Os links de privacidade/termos devem redirecionar para `/:slug/privacidade` e `/:slug/termos`
- As páginas devem buscar os dados do restaurante pelo slug

**Opção Avançada (futuro):** Permitir que cada lojista edite seu próprio texto de política via Admin. Por ora, usar template genérico com nome dinâmico.

---

### 6. Explicação: Crop de Imagem

**O que é?**
O "crop" (recorte) de imagem permite que o usuário ajuste a área da foto antes do upload, garantindo que a imagem se encaixe perfeitamente na proporção desejada.

**Exemplo Prático:**
1. Lojista seleciona uma foto de banner (ex: 2000x1500px)
2. O sistema abre um modal de recorte mostrando uma área 16:9
3. Lojista move/redimensiona a área de seleção
4. Apenas a área selecionada é enviada ao servidor

**Benefícios:**
- Imagens sempre na proporção correta
- Evita distorção ou cortes automáticos ruins
- Melhor experiência para o lojista

**Biblioteca sugerida:** `react-image-crop` ou `react-easy-crop`

---

## Plano de Implementação

### Fase 1: Correções Urgentes

#### 1.1 Remover Banner da Home do ConfigForm
**Arquivo:** `src/components/admin/ConfigForm.tsx`
- Remover linhas 132-160 (seção "Banner da Home")
- Remover `hero_banner_url` do estado e submit

#### 1.2 Tornar Footer Dinâmico
**Arquivo:** `src/components/layout/Footer.tsx`
- Importar `useRestaurantContext`
- Exibir `restaurant.name` em vez de "Astral Gastro Bar"
- Ajustar links para usar slug do restaurante

### Fase 2: Horários de Funcionamento

#### 2.1 Criar Hook de Mutações
**Arquivo:** `src/hooks/useBusinessHoursMutations.ts`
```typescript
// CRUD para business_hours
// - upsertBusinessHours: atualiza ou insere horário
// - deleteBusinessHours: remove horário de um dia
```

#### 2.2 Criar Formulário de Horários
**Arquivo:** `src/components/admin/BusinessHoursForm.tsx`
- Grid com 7 dias da semana
- Inputs de hora (abertura/fechamento)
- Switch "Fechado" para cada dia

#### 2.3 Integrar ao Admin
**Arquivo:** `src/pages/Admin.tsx`
- Nova aba "Horários" com ícone Clock

### Fase 3: Upload de Imagem para Produtos

#### 3.1 Modificar ProductForm
**Arquivo:** `src/components/admin/ProductForm.tsx`
- Substituir campo URL por `ImageUploader`
- Usar bucket `restaurants` para armazenar (path: `{restaurant_id}/products/{product_id}`)

### Fase 4: Política de Privacidade Multi-Tenant

#### 4.1 Criar Rotas Dinâmicas
**Arquivo:** `src/App.tsx`
- Adicionar rotas `/:slug/privacidade` e `/:slug/termos`

#### 4.2 Atualizar Páginas
**Arquivos:** `PrivacyPolicy.tsx`, `TermsOfUse.tsx`
- Buscar restaurante pelo slug
- Substituir "Astral Gastro Bar" por `restaurant.name`
- Usar contatos do restaurante (whatsapp, phone)

---

## Resumo das Entregas

| # | Tarefa | Prioridade | Status |
|---|--------|------------|--------|
| 1 | Banner no Menu | - | Já funciona ✅ |
| 2 | Horários de Funcionamento | Alta | A implementar |
| 3 | Remover Banner do Config | Média | A implementar |
| 4 | Upload de Imagem no Produto | Média | A implementar |
| 5 | Política Multi-Tenant | Alta | A implementar |
| 6 | Crop de Imagem | Baixa | Explicado (futuro) |

---

## Seção Técnica

### Estrutura do BusinessHoursForm

```typescript
interface DayConfig {
  day_of_week: number; // 0=Domingo, 6=Sábado
  is_closed: boolean;
  open_time: string | null; // "18:00"
  close_time: string | null; // "23:00"
}
```

### Lógica de Upload de Produto

O bucket `restaurants` já existe. A estrutura de paths será:
```
restaurants/
  {restaurant_id}/
    logo-{timestamp}.png
    banner-{timestamp}.png
    gallery/
      {timestamp}.png
    products/
      {product_id}-{timestamp}.png
```

### Footer Dinâmico

```tsx
export function Footer() {
  const { restaurant } = useRestaurantContext();
  const name = restaurant?.name || 'Restaurante';
  
  return (
    <footer>
      <p>© {year} {name}. Todos os direitos reservados.</p>
    </footer>
  );
}
```
