
# Corrigir Redirecionamento do Email de Confirmacao

## Diagnostico

Quando o usuario faz signup no fluxo de onboarding, o `supabase.auth.signUp()` na funcao `OnboardingAuthGate` (linha 397 do `Onboarding.tsx`) **nao inclui** a opcao `emailRedirectTo`. Isso faz com que o Supabase use a "Site URL" padrao configurada no dashboard, que provavelmente ainda aponta para `oxeaidelivery.lovable.app` -- um dominio antigo/incorreto.

Por isso, ao clicar no link de confirmacao do email, o usuario e redirecionado para `oxeaidelivery.lovable.app`, que mostra "Project not found".

## Solucao

### 1. Corrigir o codigo -- `src/pages/Onboarding.tsx`

Adicionar `emailRedirectTo` ao `signUp` dentro do `OnboardingAuthGate`, apontando para a rota `/onboarding` (para que o usuario retorne ao wizard apos confirmar):

```ts
const { data, error: authError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/onboarding`,
    data: { name, phone: phone.replace(/\D/g, '') },
  },
});
```

### 2. Atualizar Site URL no Supabase Dashboard (acao manual do usuario)

Acessar o Supabase Dashboard > Authentication > URL Configuration e alterar a **Site URL** de `oxeaidelivery.lovable.app` para `deliveryarraial.lovable.app` (ou o dominio customizado `deliveryarraial.com.br` se ja estiver configurado).

Isso garante que qualquer email de autenticacao que nao tenha `emailRedirectTo` explicito tambem aponte para o dominio correto.

### 3. Corrigir tambem o `useAuth.ts`

O `useAuth.ts` usa `window.location.origin` para o `emailRedirectTo`, o que funciona corretamente quando o usuario esta no dominio certo. Nao precisa de alteracao no codigo, mas a Site URL no dashboard precisa estar correta como fallback.

### Arquivos modificados
- `src/pages/Onboarding.tsx` -- adicionar `emailRedirectTo` ao signup (1 linha)

### Acao manual necessaria
- Atualizar Site URL no Supabase Dashboard: Authentication > URL Configuration > Site URL para `https://deliveryarraial.lovable.app`
- Adicionar `https://deliveryarraial.com.br` na lista de Redirect URLs permitidas
