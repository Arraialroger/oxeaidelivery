

# Correção dos 3 Problemas de Autenticação

## Problemas Identificados

### Problema 1: "E-mail já cadastrado mas não confirmado" em outro restaurante
**Causa raiz**: A autenticação do Supabase é global. Quando o usuário criou conta no "Michael Burger", o email foi registrado no `auth.users` mas ainda não confirmado. Ao tentar criar conta no "Maiza Pizza" ou no `/onboarding` com o mesmo email, o Supabase retorna `identities: []`, e o código interpreta como "não confirmado".

**Solução**: Quando detectar email já cadastrado (identities vazio), além da mensagem de erro, mostrar o botão "Reenviar e-mail de confirmação" (já existe no Auth.tsx mas falta no Onboarding.tsx). Também melhorar a mensagem para explicar que a conta é global e basta confirmar o email e fazer login.

### Problema 2: Botão "Reenviar e-mail de confirmação" não funciona
**Causa raiz**: O `resendConfirmation` no `useAuth.ts` usa `supabase.auth.resend({ type: 'signup', email })`. Isso pode falhar silenciosamente se o Supabase estiver com rate limit ou se o email já foi confirmado. Além disso, no Auth.tsx o `resendError` pode estar ocorrendo mas a mensagem genérica não ajuda.

**Solução**: Adicionar tratamento de erro mais específico no resend, incluir feedback visual de loading no botão, e usar `mapAuthError` para traduzir erros do resend.

### Problema 3: "Esqueci minha senha" e erro no link de recuperação + falta no Onboarding
**Causa raiz no Auth.tsx**: O `ForgotPasswordLink` usa `window.location.origin` para o `redirectTo`. Se o domínio customizado `deliveryarraial.com.br` não está configurado como "Site URL" ou "Redirect URL" no Supabase Dashboard, o Supabase rejeita o redirect.

**Causa raiz no Onboarding**: Simplesmente não existe o componente de "Esqueci minha senha" na aba "Entrar".

**Solução**: 
- Adicionar "Esqueci minha senha" na aba login do Onboarding
- Melhorar mensagens de erro do reset password
- Verificar que o redirect URL inclui o domínio correto

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Onboarding.tsx` | Adicionar botão "Reenviar confirmação" quando identities=0, adicionar "Esqueci minha senha" na aba login |
| `src/pages/Auth.tsx` | Melhorar feedback do resend e do forgot password com loading state e mensagens específicas |
| `src/hooks/useAuth.ts` | Melhorar `resendConfirmation` com tratamento de erro mais robusto |

## Detalhes Técnicos

### Onboarding.tsx - Mudanças
1. Quando `identities.length === 0`, além do erro, mostrar botão "Reenviar e-mail de confirmação" com loading state
2. Na aba "Entrar", adicionar componente de "Esqueci minha senha" idêntico ao do Auth.tsx (input de email + botão enviar link)
3. Usar `supabase.auth.resend()` para o reenvio e `supabase.auth.resetPasswordForEmail()` para recuperação

### Auth.tsx - Mudanças
1. Adicionar loading state no botão "Reenviar e-mail de confirmação" para feedback visual
2. Melhorar mensagem de erro do resend com `mapAuthError` pattern

### useAuth.ts - Mudanças
1. O `resendConfirmation` já funciona corretamente na lógica, o problema pode ser rate limiting do Supabase (limite de 1 email por 60s). Adicionar nota sobre isso na mensagem de sucesso.

## Nota Importante sobre Redirect URLs
O domínio `deliveryarraial.com.br` precisa estar configurado no Supabase Dashboard em:
- **Authentication > URL Configuration > Site URL**: `https://deliveryarraial.com.br`  
- **Authentication > URL Configuration > Redirect URLs**: adicionar `https://deliveryarraial.com.br/**`

Sem isso, o "Esqueci minha senha" continuará falhando independentemente do código. Isso será mencionado ao usuário após a implementação.

