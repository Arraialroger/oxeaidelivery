

# Corrigir Tabs do Admin que Somem no Deploy

## Diagnostico

A classe `sm:grid-cols-13` usada no `TabsList` do Admin nao e uma classe padrao do Tailwind CSS (que suporta apenas ate `grid-cols-12`). No modo de desenvolvimento (Vite HMR), o Tailwind pode gerar a classe sob demanda, mas no build de producao ela e descartada por nao existir na configuracao. Resultado: os tabs ficam limitados a `grid-cols-6` e as abas excedentes (Entrega, Cupons, Upsell, Monitor, Saude, Pagamento) ficam ocultas.

## Solucao

Substituir o layout de grid fixo por um layout com scroll horizontal, que e mais adequado para 13 abas e funciona bem em qualquer tamanho de tela.

### Arquivo: `src/pages/Admin.tsx`

Alterar a `TabsList` de:
```tsx
<TabsList className="grid w-full grid-cols-6 sm:grid-cols-13">
```

Para:
```tsx
<TabsList className="flex w-full overflow-x-auto">
```

Isso garante que:
- Todas as 13 abas ficam visiveis e acessiveis
- Em telas pequenas, o usuario pode rolar horizontalmente
- Nao depende de classes custom do Tailwind
- Funciona identicamente em dev e producao

### Arquivos modificados
- `src/pages/Admin.tsx` -- uma unica linha alterada na `TabsList`

