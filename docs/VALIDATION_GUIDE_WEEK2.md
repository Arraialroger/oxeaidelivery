# Guia de Validação Multi-Tenant - Semana 2

## ✅ Validação Rápida

### 1. Teste de Roteamento
```
✔ URL raiz (/) → Redireciona para /astral/menu
✔ URL válida (/astral/menu) → Exibe cardápio do Astral
✔ URL inválida (/xyz/menu) → Exibe página "Restaurante não encontrado"
```

### 2. Verificar no Navegador
- Acesse: `https://[seu-preview]/astral/menu`
- Deve exibir: Header com "Astral Gastro Bar" + categorias + produtos

---

## 📋 Checklist para Simular Múltiplos Restaurantes

### Passo 1: Criar novo restaurante no banco
```sql
INSERT INTO public.restaurants (name, slug, status, settings)
VALUES (
  'Pizzaria Teste',
  'pizzaria-teste',
  'active',
  '{
    "is_open": true,
    "kds_enabled": true,
    "delivery_fee": 8,
    "local_ddd": "73",
    "loyalty_enabled": false,
    "loyalty_stamps_goal": 10,
    "loyalty_min_order": 40,
    "loyalty_reward_value": 40
  }'::jsonb
);
```

### Passo 2: Criar categoria para o novo restaurante
```sql
INSERT INTO public.categories (name, order_index, restaurant_id)
VALUES (
  'Pizzas',
  1,
  (SELECT id FROM restaurants WHERE slug = 'pizzaria-teste')
);
```

### Passo 3: Criar produto para o novo restaurante
```sql
INSERT INTO public.products (name, price, category_id, restaurant_id, is_active)
VALUES (
  'Pizza Margherita',
  45.00,
  (SELECT id FROM categories WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'pizzaria-teste') LIMIT 1),
  (SELECT id FROM restaurants WHERE slug = 'pizzaria-teste'),
  true
);
```

### Passo 4: Validar isolamento
```
1. Acesse /astral/menu → Deve mostrar APENAS produtos do Astral
2. Acesse /pizzaria-teste/menu → Deve mostrar APENAS Pizza Margherita
3. Adicione itens ao carrinho em cada restaurante
4. Verifique que os carrinhos são ISOLADOS (localStorage separado por slug)
```

---

## 🚨 Testes de Erro

### Cenário 1: Slug inválido
- **URL:** `/restaurante-que-nao-existe/menu`
- **Esperado:** Página "Restaurante não encontrado" com botão "Voltar ao início"

### Cenário 2: Restaurante inativo
```sql
UPDATE restaurants SET status = 'inactive' WHERE slug = 'pizzaria-teste';
```
- **URL:** `/pizzaria-teste/menu`
- **Esperado:** Página "Restaurante não encontrado" (RLS filtra por status='active')

### Cenário 3: Slug vazio
- **URL:** `/`
- **Esperado:** Redireciona automaticamente para o primeiro restaurante ativo

### Cenário 4: Caracteres especiais no slug
- **URL:** `/café-123/menu`
- **Esperado:** Busca o restaurante normalmente ou exibe 404

---

## 🔍 Queries de Diagnóstico

### Listar todos os restaurantes
```sql
SELECT slug, name, status, settings->>'is_open' as is_open
FROM restaurants
ORDER BY created_at;
```

### Verificar produtos por restaurante
```sql
SELECT r.slug, r.name as restaurant, COUNT(p.id) as total_products
FROM restaurants r
LEFT JOIN products p ON p.restaurant_id = r.id
GROUP BY r.id, r.slug, r.name;
```

### Verificar isolamento de dados
```sql
-- Produtos do Astral
SELECT name, price FROM products
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'astral');

-- Produtos de outro restaurante (deve retornar vazio ou diferente)
SELECT name, price FROM products
WHERE restaurant_id = (SELECT id FROM restaurants WHERE slug = 'pizzaria-teste');
```

---

## ✅ Critérios de Sucesso

| Critério | Status |
|----------|--------|
| Rota `/:slug/menu` funciona | ✅ |
| Rota `/:slug/checkout` funciona | ✅ |
| Página 404 para slug inválido | ✅ |
| Header exibe nome do restaurante | ✅ |
| Produtos filtrados por restaurant_id | ✅ |
| Categorias filtradas por restaurant_id | ✅ |
| Carrinho isolado por slug | ✅ |
| Settings vêm do restaurants.settings | ✅ |

---

## 📝 Próximos Passos (Semana 3)
1. RLS policies com restaurant_id
2. Admin filtrado por restaurante do usuário
3. Checkout salvando restaurant_id nos pedidos
