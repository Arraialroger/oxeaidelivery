

# Correção do erro "column stats.total_customers does not exist"

## Diagnóstico

A RPC `get_platform_restaurants_overview` tem 3 `LEFT JOIN LATERAL` separados:
- `stats` -- pedidos e faturamento
- `cust` -- total de clientes
- `prod` -- total de produtos

Porém, o SELECT final referencia incorretamente:
- `stats.total_customers` (deveria ser `cust.total_customers`)
- `stats.total_products` (deveria ser `prod.total_products`)

## Plano de Correção

### 1. Nova migration SQL

Recriar a função `get_platform_restaurants_overview` corrigindo as duas referências:

```sql
-- Trocar:
COALESCE(stats.total_customers, 0) AS total_customers,
COALESCE(stats.total_products, 0) AS total_products

-- Para:
COALESCE(cust.total_customers, 0) AS total_customers,
COALESCE(prod.total_products, 0) AS total_products
```

Nenhuma alteração no frontend e necessaria -- o componente `PlatformRestaurantsPanel` e o hook `usePlatformRestaurants` ja estao corretos. O problema e exclusivamente no SQL da RPC.

