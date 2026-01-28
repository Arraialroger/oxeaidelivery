
# Correção: Logout Resiliente para Sessões Inválidas

## Problema

O logout falha com "Erro ao sair da conta" quando a sessão do servidor foi invalidada ou está em estado inconsistente (comum após manipulação direta do banco de dados).

## Causa Raiz

```typescript
// useAuth.ts - atual
const signOut = async () => {
  const { error } = await supabase.auth.signOut(); // Falha se sessão não existe
  return { error };
};
```

O Supabase retorna erro 403 "session_not_found" quando tenta invalidar uma sessão que não existe no servidor, mas o cliente ainda tem tokens locais.

## Solução

Tornar o logout resiliente usando `scope: 'local'` que força a limpeza dos tokens locais **independentemente** do estado do servidor:

```typescript
// useAuth.ts - corrigido
const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
};
```

### Por que `scope: 'local'` resolve?

| Scope | Comportamento |
|-------|---------------|
| `global` (padrão) | Invalida sessão no servidor E limpa tokens locais - falha se servidor não encontrar sessão |
| `local` | Limpa tokens locais **sempre** - não depende do servidor |

Para um app multi-tenant onde usuários podem ter sessões em estados inconsistentes, `scope: 'local'` é mais seguro.

## Arquivo a Modificar

**src/hooks/useAuth.ts** - Linha 94-97:

```typescript
const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
};
```

## Fluxo Corrigido

```text
Usuario clica "Sair"
        ↓
signOut({ scope: 'local' })
        ↓
Limpa tokens do localStorage
        ↓
Retorna sucesso (independente do servidor)
        ↓
Usuario deslogado localmente ✅
```

## Solução Imediata para o Usuário

Enquanto a correção não é implementada, você pode resolver o problema atual:

1. Abra o DevTools (F12) no navegador
2. Vá em **Application** > **Local Storage** > `https://astral.oxeai.com.br`
3. Delete todas as entradas que começam com `sb-`
4. Recarregue a página

Isso limpa manualmente os tokens e "desloga" o usuário.

## Risco

**Muito Baixo** - A mudança afeta apenas o comportamento do logout. O `scope: 'local'` é adequado para a maioria dos casos de uso e é mais resiliente a estados inconsistentes.

## Consideração Adicional

O trigger `handle_new_user` no Supabase deveria recriar o profile automaticamente se o usuário fizer login novamente, mas como você deletou apenas o profile e não o usuário em `auth.users`, o trigger não será acionado (ele só dispara em INSERT no auth.users).

Se o usuário `rogerbahia55@gmail.com` ainda existir em `auth.users`, você pode:
1. Recriar o profile manualmente
2. Ou deletar o usuário em `auth.users` e deixar a pessoa criar conta novamente
