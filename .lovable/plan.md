
# Diagnóstico: Redirecionamento Incorreto Após Confirmação de E-mail

## Problema Identificado

Ao criar uma conta em `/bruttus/account`, após confirmar o e-mail, o usuário é redirecionado para `/astral/menu` em vez de `/bruttus/menu` ou `/bruttus/account`.

## Causa Raiz

O problema está na linha 72 do arquivo `src/hooks/useAuth.ts`:

```typescript
const signUp = async (email: string, password: string, metadata?: { name?: string; phone?: string }) => {
  const redirectUrl = `${window.location.origin}/`;  // <-- PROBLEMA AQUI
  // ...
}
```

O `emailRedirectTo` está configurado como `${window.location.origin}/` (a raiz do site), **sem incluir o slug do restaurante**.

### Fluxo Atual (Quebrado)

```text
1. Usuário em /bruttus/auth clica "Criar conta"
2. useAuth.signUp() é chamado com redirectUrl = "https://astral.oxeai.com.br/"
3. E-mail de confirmação é enviado com link para "https://astral.oxeai.com.br/"
4. Usuário clica no link do e-mail
5. Supabase autentica e redireciona para "https://astral.oxeai.com.br/"
6. App carrega na raiz "/" (página Index/landing)
7. Como o useAuth detecta usuário logado, mas não há slug...
8. O comportamento padrão ou algum fallback leva a /astral/menu
```

O slug `bruttus` é completamente perdido no passo 2, pois o `useAuth` não tem acesso ao contexto do restaurante (ele é um hook genérico, não conectado ao RestaurantContext).

## Solução Proposta

### Opção 1: Passar o slug para o signUp (Recomendada)

Modificar a função `signUp` para aceitar o slug como parâmetro:

**src/hooks/useAuth.ts:**
```typescript
const signUp = async (
  email: string, 
  password: string, 
  metadata?: { name?: string; phone?: string },
  restaurantSlug?: string  // Novo parâmetro
) => {
  // Usar slug se fornecido, senão usa raiz
  const redirectPath = restaurantSlug ? `/${restaurantSlug}/account` : '/';
  const redirectUrl = `${window.location.origin}${redirectPath}`;
  
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        name: metadata?.name,
        phone: metadata?.phone,
        restaurant_slug: restaurantSlug, // Salvar para referência futura
      },
    },
  });
  return { error };
};
```

**src/pages/Auth.tsx:**
```typescript
const { error: authError } = await signUp(signupEmail, signupPassword, {
  name: signupName,
  phone: signupPhoneDigits,
}, slug);  // Passar o slug aqui
```

### Opção 2: Usar URL atual como redirect

Uma alternativa mais simples seria usar a URL atual como base:

```typescript
const signUp = async (email: string, password: string, metadata?: ...) => {
  // Pega a URL atual e substitui /auth por /account
  const currentPath = window.location.pathname;
  const redirectPath = currentPath.replace('/auth', '/account');
  const redirectUrl = `${window.location.origin}${redirectPath}`;
  // ...
}
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAuth.ts` | Adicionar parâmetro `slug` ao `signUp` e construir URL dinâmica |
| `src/pages/Auth.tsx` | Passar o `slug` ao chamar `signUp` |

## Fluxo Corrigido

```text
1. Usuário em /bruttus/auth clica "Criar conta"
2. useAuth.signUp() é chamado com slug = "bruttus"
3. redirectUrl = "https://astral.oxeai.com.br/bruttus/account"
4. E-mail de confirmação contém link correto
5. Usuário clica no link
6. Supabase redireciona para /bruttus/account
7. Usuário vê a página de conta do Bruttus (contexto correto)
```

## Validação Pós-Implementação

| Teste | Resultado Esperado |
|-------|-------------------|
| Criar conta em `/bruttus/auth` | E-mail contém link para `/bruttus/account` |
| Criar conta em `/astral/auth` | E-mail contém link para `/astral/account` |
| Confirmar e-mail (Bruttus) | Redireciona para `/bruttus/account` |
| Confirmar e-mail (Astral) | Redireciona para `/astral/account` |

## Consideração sobre Link Expirado

Nos logs de autenticação, vi mensagens de "Email link is invalid or has expired" - isso indica que o link de confirmação tem validade limitada. Isso é comportamento normal do Supabase e não está relacionado a este bug.

## Risco

**Baixo** - A mudança é cirúrgica e afeta apenas o redirect após signup. Login, logout e outras funcionalidades permanecem inalteradas.

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Atualizar useAuth.ts | 2 min |
| Atualizar Auth.tsx | 1 min |
| Testar fluxo completo | 5 min |
| **Total** | **~8 min** |
