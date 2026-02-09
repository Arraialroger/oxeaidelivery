

# Painel Unificado de Zonas de Entrega com Mapa Unico

## Problema Atual

A implementacao atual funciona no modelo "uma zona por vez":
- Clicar em "Nova Zona" substitui toda a tela pela `DeliveryZoneForm`, que carrega seu proprio mapa isolado.
- Para criar outra zona, voce precisa salvar, voltar a lista e clicar "Nova Zona" novamente, o que abre um novo mapa do zero.
- Nao e possivel visualizar todas as zonas simultaneamente no mapa.

```text
Fluxo Atual (fragmentado):
[Lista de Zonas] --clica "Nova Zona"--> [Form + Mapa isolado (zona 1)]
     salva e volta
[Lista de Zonas] --clica "Nova Zona"--> [Form + Mapa isolado (zona 2)]
```

## Solucao Proposta

Substituir o fluxo por uma interface unificada com um unico mapa permanente que exibe todas as zonas, e um painel lateral/inferior para configurar a zona selecionada.

```text
Novo Fluxo (unificado):
+-----------------------------------------------+
|  [Mapa unico com TODAS as zonas visiveis]     |
|   - Zonas existentes renderizadas (cinza)     |
|   - Zona selecionada (destaque colorido)      |
|   - Botao "Desenhar nova zona" no mapa        |
+-----------------------------------------------+
|  [Painel de configuracao da zona selecionada]  |
|   Nome | Taxa | Tempo | Pedido min | Salvar   |
+-----------------------------------------------+
|  [Lista compacta de todas as zonas]            |
|   Zona 1 [editar] | Zona 2 [editar] | ...     |
+-----------------------------------------------+
```

## Plano de Implementacao

### Passo 1 - Reescrever `DeliveryZoneMap.tsx` para modo multi-zona

O mapa passa a receber a lista completa de zonas ja salvas e renderiza todas simultaneamente (circulos e poligonos).

- Cada zona salva aparece com cor neutra (cinza/transparente).
- A zona atualmente selecionada aparece com cor primaria e destaque.
- Clicar em uma zona no mapa dispara um evento `onZoneSelect(zone)`.
- Um botao "Desenhar nova zona" ativa o DrawingManager para raio ou poligono.
- Ao completar o desenho, dispara `onNewZoneDrawn(coords, type)`.

Props do novo componente:
```text
zones: DeliveryZone[]           -- todas as zonas existentes
selectedZoneId: string | null   -- zona selecionada
onZoneSelect(id): void          -- ao clicar em zona existente
onNewZoneDrawn(data): void      -- ao completar desenho
onZoneGeometryUpdate(data): void -- ao arrastar/editar geometria
```

### Passo 2 - Criar painel de configuracao inline

Substituir o `DeliveryZoneForm` por um formulario compacto que aparece abaixo do mapa (nao em tela cheia).

- Quando nenhuma zona esta selecionada: exibe mensagem "Selecione uma zona ou desenhe uma nova".
- Quando uma zona e selecionada ou recem-desenhada: exibe os campos (Nome, Taxa, Tempo estimado, Pedido minimo, Frete gratis acima de) com botao Salvar.
- Botao "Cancelar" desmarca a zona e limpa o formulario.

### Passo 3 - Reescrever `DeliveryZonesManager.tsx` como orquestrador

Este componente passa a ser o centro de controle:

1. Carrega todas as zonas via `useDeliveryZones({ includeInactive: true })`.
2. Gerencia o estado: `selectedZoneId`, `newZoneData` (geometria recem-desenhada), `drawingMode`.
3. Renderiza em ordem:
   - Simulador (mantido como esta)
   - Mapa unificado (todas as zonas + controles de desenho)
   - Formulario inline (da zona selecionada ou nova)
   - Lista compacta de zonas (com acoes de ativar/desativar e excluir)

### Passo 4 - Atualizar `DeliveryZoneList.tsx`

Adicionar prop `selectedZoneId` para destacar visualmente a zona selecionada na lista. Clicar em uma zona na lista tambem seleciona no mapa (scroll to + zoom).

### Passo 5 - Adicionar cores distintas por zona

Atribuir cores diferentes para cada zona no mapa usando um array de cores predefinido, facilitando a distincao visual quando varias zonas se sobrepoe.

```text
Cores: azul, verde, laranja, roxo, vermelho, ciano...
Zona selecionada: cor cheia + borda grossa
Zonas inativas: padrao tracejado
```

## Arquivos Impactados

| Arquivo | Acao |
|---------|------|
| `src/components/admin/DeliveryZoneMap.tsx` | Reescrever para modo multi-zona |
| `src/components/admin/DeliveryZoneForm.tsx` | Simplificar para painel inline (sem Card/tela cheia) |
| `src/components/admin/DeliveryZonesManager.tsx` | Reescrever como orquestrador unificado |
| `src/components/admin/DeliveryZoneList.tsx` | Adicionar destaque de zona selecionada |

## Resultado Esperado

- Um unico mapa permanente mostra todas as zonas configuradas.
- O lojista desenha uma zona (raio ou poligono), preenche taxa/tempo/minimo, salva e imediatamente pode desenhar a proxima.
- Clicar em qualquer zona (no mapa ou na lista) abre seus dados para edicao.
- Fluxo continuo sem recarregar o mapa.

