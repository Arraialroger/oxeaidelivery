
# Correção do Fluxo de Autenticação Multi-Tenant

## Problema Identificado

O botão "Entrar" na página de conta redireciona para `/auth` em vez de `/{slug}/auth`, fazendo com que o sistema interprete "auth" como um slug de restaurante inexistente.

## Arquivos Afetados

Identifiquei **dois arquivos** com navegação quebrada:

### 1. src/pages/Account.tsx
| Linha | Problema | Correção |
|-------|----------|----------|
| 130 | `navigate('/')` - Voltar vai para raiz | `navigate(\`/${slug}/menu\`)` |
| 218 | `navigate('/auth')` - Entrar sem slug | `navigate(\`/${slug}/auth\`)` |
| 374 | `navigate(\`/order/${order.id}\`)` - Tracking sem slug | `navigate(\`/${slug}/order/${order.id}\`)` |

### 2. src/pages/Auth.tsx
| Linha | Problema | Correção |
|-------|----------|----------|
| 64 | `navigate('/account')` - Pós-login sem slug | `navigate(\`/${slug}/account\`)` |
| 163 | `to="/"` - Voltar ao cardápio sem slug | `to={\`/${slug}/menu\`}` |
| 176-177 | Logo hardcoded "Astral" | Usar `restaurant?.logo_url` |
| 376 | `navigate('/')` - Visitante sem slug | `navigate(\`/${slug}/menu\`)` |

## Solução Técnica

### Account.tsx
Adicionar o hook `useParams` e usar o slug nas navegações:

```typescript
import { useNavigate, useParams } from 'react-router-dom';

export default function Account() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  
  // Navegações corrigidas:
  // Botão voltar: navigate(`/${slug}/menu`)
  // Botão entrar: navigate(`/${slug}/auth`)
  // Acompanhar pedido: navigate(`/${slug}/order/${order.id}`)
}
```

### Auth.tsx
A página Auth precisa acessar o `RestaurantContext` para obter o slug e branding. Porém, como ela está **dentro** do `RestaurantLayout`, pode usar `useRestaurantContext`:

```typescript
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { useParams } from 'react-router-dom';

export default function Auth() {
  const { slug } = useParams<{ slug: string }>();
  const { restaurant } = useRestaurantContext();
  
  // Navegações corrigidas:
  // Pós-login: navigate(`/${slug}/account`)
  // Voltar ao cardápio: `/${slug}/menu`
  // Continuar visitante: navigate(`/${slug}/menu`)
  
  // Branding dinâmico:
  // Logo: restaurant?.logo_url || '/placeholder.svg'
  // Alt: restaurant?.name || 'Restaurante'
}
```

## Mudanças Detalhadas

### Account.tsx (4 alterações)

1. **Importar useParams** (linha 2):
```typescript
import { useNavigate, useParams } from 'react-router-dom';
```

2. **Extrair slug** (após linha 29):
```typescript
const { slug } = useParams<{ slug: string }>();
```

3. **Botão Voltar** (linha 130):
```typescript
onClick={() => navigate(`/${slug}/menu`)}
```

4. **Botão Entrar** (linha 218):
```typescript
onClick={() => navigate(`/${slug}/auth`)}
```

5. **Acompanhar Pedido** (linha 374):
```typescript
onClick={() => navigate(`/${slug}/order/${order.id}`)}
```

### Auth.tsx (6 alterações)

1. **Importar hooks** (linhas 2 e 5):
```typescript
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
```

2. **Extrair slug e restaurant** (após linha 42):
```typescript
const { slug } = useParams<{ slug: string }>();
const { restaurant } = useRestaurantContext();
```

3. **Redirect pós-login** (linha 64):
```typescript
navigate(`/${slug}/account`);
```

4. **Link Voltar ao Cardápio** (linhas 162-168):
```typescript
<Link 
  to={`/${slug}/menu`}
  className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
>
```

5. **Logo dinâmico** (linhas 175-179):
```typescript
<img 
  src={restaurant?.logo_url || '/placeholder.svg'} 
  alt={restaurant?.name || 'Restaurante'} 
  className="h-16 mx-auto mb-2"
/>
```

6. **Botão Visitante** (linha 376):
```typescript
onClick={() => navigate(`/${slug}/menu`)}
```

## Fluxo Corrigido

```text
Usuario em /astral/account
         |
         v
    Clica "Entrar"
         |
         v
   Navega para /astral/auth  <-- CORRIGIDO
         |
         v
     Faz login
         |
         v
  Redireciona /astral/account  <-- CORRIGIDO
```

## Validação Pós-Implementação

| Cenário | Teste | Resultado Esperado |
|---------|-------|-------------------|
| Entrar (Astral) | `/astral/account` > Entrar | Navega para `/astral/auth` |
| Entrar (Pizzaria) | `/pizzaria-teste/account` > Entrar | Navega para `/pizzaria-teste/auth` |
| Voltar ao cardápio | `/astral/auth` > Voltar | Navega para `/astral/menu` |
| Pós-login | Login em `/astral/auth` | Redireciona para `/astral/account` |
| Visitante | `/astral/auth` > Continuar visitante | Navega para `/astral/menu` |
| Acompanhar pedido | `/astral/account` > Acompanhar | Navega para `/astral/order/{id}` |
| Logo dinâmico | `/astral/auth` | Mostra logo do Astral |
| Logo dinâmico | `/pizzaria-teste/auth` | Mostra logo da Pizzaria |

## Estimativa

| Tarefa | Tempo |
|--------|-------|
| Corrigir Account.tsx | 3 min |
| Corrigir Auth.tsx | 5 min |
| Testar fluxos | 5 min |
| **Total** | **~13 min** |

## Arquivos a Modificar

1. `src/pages/Account.tsx` - 4 alterações
2. `src/pages/Auth.tsx` - 6 alterações

## Risco

**Baixo** - São apenas ajustes de navegação que seguem o padrão já estabelecido em outros componentes (como BottomNav).
