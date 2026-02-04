

# Análise: Fluxo de Endereço Sem Dependência Obrigatória de GPS

## 1. Situação Atual do Checkout

### **Fluxo Existente (Step 2 - Endereço):**

```text
┌─────────────────────────────────────────────────────────────┐
│  Endereço de Entrega                                        │
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────┐           │
│  │ Rua                     │  │ Número          │           │
│  └─────────────────────────┘  └─────────────────┘           │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Bairro                                          │        │
│  └─────────────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Complemento                                     │        │
│  └─────────────────────────────────────────────────┘        │
│  ┌─────────────────────────────────────────────────┐        │
│  │ Ponto de Referência *                           │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  [ Continuar ]                                              │
└─────────────────────────────────────────────────────────────┘
```

**Problemas identificados:**
- Sem coordenadas (lat/lng) → impossível validar zonas geográficas
- Input 100% manual → propenso a erros de digitação
- Sem validação de área de entrega → aceita qualquer endereço

---

## 2. Princípio Fundamental: GPS Nunca Deve Bloquear o Pedido

### **Filosofia Recomendada:**

| Cenário | Ação | Resultado |
|---------|------|-----------|
| Cliente **autoriza GPS** | Centraliza mapa na localização, facilita seleção | Experiência premium |
| Cliente **recusa GPS** | Mostra mapa na cidade do restaurante, cliente pode buscar/clicar | Experiência funcional |
| Cliente **ignora mapa** | Pode preencher manualmente como backup | Checkout garantido |

**Regra de Ouro:** Coordenadas devem vir de **qualquer interação com o mapa** (clique, arrastar pin, autocomplete), não exclusivamente do GPS.

---

## 3. Análise de Pontos de Bloqueio Potenciais

### **Onde o usuário PODERIA ficar bloqueado (se mal implementado):**

| Ponto | Risco | Solução Proposta |
|-------|-------|------------------|
| Permissão GPS negada | ❌ Mapa não funciona | ✅ Mapa funciona sem GPS, centraliza na cidade |
| Autocomplete não retorna resultado | ❌ Campo vazio | ✅ Permitir digitação manual + clique no mapa |
| Endereço fora de zona | ❌ Pedido bloqueado | ✅ Opção A: bloquear / Opção B: aceitar com taxa extra (decisão do lojista) |
| API Google offline | ❌ Tela quebrada | ✅ Fallback para formulário manual atual |

### **Fluxo Proposto - Nunca Bloqueado:**

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  🔍 Busque seu endereço ou toque no mapa                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │                    [       MAPA      ]                               │  │
│  │                         📍                                           │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  [📍 Usar minha localização]  ← opcional, não obrigatório                  │
│                                                                            │
│  📍 Rua das Flores, 123 - Mucugê                                          │
│  Arraial d'Ajuda, BA                                                       │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Complemento (apto, bloco)                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Ponto de Referência                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ─────────────────────────────────────────────────────────────────────     │
│  [✏️ Prefiro digitar manualmente] ← fallback sempre disponível             │
│                                                                            │
│  [ Confirmar Endereço ]                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Métodos de Obtenção de Coordenadas (Hierarquia de Prioridade)

### **Todas as formas de coletar lat/lng SEM depender do GPS:**

| Método | GPS Necessário? | Precisão | Complexidade |
|--------|-----------------|----------|--------------|
| 1. Clique/toque no mapa | ❌ Não | Alta | Baixa |
| 2. Arrastar pin | ❌ Não | Alta | Baixa |
| 3. Autocomplete do Google | ❌ Não | Alta | Média |
| 4. GPS do dispositivo | ✅ Sim | Muito alta | Baixa |
| 5. Geocoding do endereço manual | ❌ Não | Média | Média |

**Implementação prática:**
- GPS é um **atalho de conveniência**, não um requisito
- Qualquer interação com mapa gera coordenadas válidas
- Fallback para geocoding se cliente digitar manualmente

---

## 5. Simplificação para Usuários Menos Familiarizados

### **Princípios de UX para público não-técnico:**

1. **Mapa como primeira opção, não única**
   - Mapa visível mas não intimidador
   - Botão claro "Usar minha localização"
   - Link "Prefiro digitar manualmente" sempre visível

2. **Feedback visual imediato**
   - Ao tocar no mapa: pin aparece + endereço preenche automaticamente
   - Ao buscar: sugestões aparecem sem delay perceptível
   - Ao confirmar: resumo claro do endereço selecionado

3. **Linguagem simples**
   - ❌ "Permitir acesso à geolocalização"
   - ✅ "Usar minha localização atual"
   - ❌ "Geocodificação reversa falhou"
   - ✅ "Não conseguimos encontrar o endereço. Toque no mapa para marcar."

4. **Recuperação de erros graciosa**
   - Se autocomplete não achar: "Tente tocar no mapa onde você está"
   - Se fora da zona: "Entregamos até 5km do restaurante. Verifique a localização."

---

## 6. Arquitetura Técnica Proposta

### **6.1. Novo Fluxo do Step 2 (Endereço)**

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                         AddressStep.tsx                                 │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  AddressInput (modo: mapa)                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ SearchBox (Google Places Autocomplete)                      │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                             │  │  │
│  │  │              MapWithPin (clique/arraste)                    │  │  │
│  │  │                       📍                                    │  │  │
│  │  │                                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │  [📍 Usar localização] [✏️ Digitar manual]                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                  AddressInput (modo: manual)                      │  │
│  │  Rua | Número | Bairro | Complemento | Referência                 │  │
│  │  [Buscar no mapa] ← tenta geocoding do que digitou               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │               DeliveryZoneValidator                               │  │
│  │  ✅ Entregamos nesse endereço! Taxa: R$ 8,00                      │  │
│  │  ❌ Fora da área de entrega (se aplicável)                        │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### **6.2. Estado do Endereço**

```typescript
interface AddressState {
  // Campos textuais (sempre salvos)
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
  
  // Coordenadas (obtidas de qualquer fonte)
  latitude: number | null;
  longitude: number | null;
  
  // Metadados
  formatted_address: string | null;   // Endereço formatado pelo Google
  place_id: string | null;            // ID do Google Places
  source: 'gps' | 'map_click' | 'autocomplete' | 'geocoding' | 'manual';
  
  // Validação de zona
  delivery_zone_id: string | null;
  delivery_fee: number;
  is_valid_zone: boolean;
}
```

### **6.3. Lógica de Obtenção de Coordenadas**

```typescript
// Prioridade de coleta de coordenadas
async function getCoordinates(input: AddressInput): Promise<Coordinates | null> {
  
  // 1. Se usuário clicou no mapa → já temos as coordenadas
  if (input.mapClickCoords) {
    return input.mapClickCoords;
  }
  
  // 2. Se usou autocomplete → Google já retornou as coordenadas
  if (input.placeDetails?.geometry) {
    return {
      lat: input.placeDetails.geometry.location.lat(),
      lng: input.placeDetails.geometry.location.lng(),
    };
  }
  
  // 3. Se usou GPS → coordenadas do navegador
  if (input.gpsCoords) {
    return input.gpsCoords;
  }
  
  // 4. Fallback: Geocoding do endereço digitado manualmente
  if (input.manualAddress) {
    try {
      return await geocodeAddress(input.manualAddress);
    } catch {
      return null; // Aceita pedido mesmo sem coordenadas
    }
  }
  
  return null;
}
```

---

## 7. Tratamento de Cenários Edge Cases

### **Cenário 1: GPS recusado**
```text
Usuário recusa permissão → Mapa centraliza na cidade do restaurante
Usuário pode: buscar endereço OU clicar no mapa OU digitar manual
```

### **Cenário 2: Endereço não encontrado no autocomplete**
```text
Usuário digita endereço → Nenhuma sugestão aparece
Sistema mostra: "Não encontramos. Toque no mapa para marcar sua localização"
Usuário clica no mapa → Coordenadas obtidas → Prossegue
```

### **Cenário 3: Fora da zona de entrega**
```text
Duas opções configuráveis pelo lojista:

Opção A (Restritivo):
- Bloquear pedido
- Mostrar: "Infelizmente não entregamos nessa região ainda"
- Logar tentativa para análise de demanda

Opção B (Flexível):
- Aceitar com taxa extra ou sem taxa definida
- Mostrar: "Essa região tem taxa de entrega especial: R$ XX"
- Permitir checkout com aviso
```

### **Cenário 4: API Google offline**
```text
Sistema detecta falha na API → Ativa modo fallback
Mostra formulário manual tradicional (como hoje)
Pedido prossegue sem coordenadas
Admin recebe alerta sobre endereço sem geolocalização
```

### **Cenário 5: Usuário insiste em digitar manual**
```text
Link "Prefiro digitar manualmente" → Abre formulário tradicional
Sistema tenta geocoding em background ao clicar "Continuar"
Se geocoding sucede → Valida zona → Mostra taxa
Se geocoding falha → Aceita pedido → Marca como "coordenadas pendentes"
```

---

## 8. Ajustes no Frontend

### **Novos Componentes:**

| Componente | Função |
|------------|--------|
| `AddressMapPicker.tsx` | Mapa interativo com pin arrastável |
| `AddressSearchBox.tsx` | Autocomplete Google Places |
| `AddressManualForm.tsx` | Formulário tradicional (fallback) |
| `DeliveryZoneIndicator.tsx` | Mostra taxa e validação de zona |
| `UseLocationButton.tsx` | Botão GPS com estados (loading, denied, success) |

### **Hooks:**

| Hook | Função |
|------|--------|
| `useGoogleMaps.ts` | Carrega API do Google Maps |
| `useGeolocation.ts` | Wrapper do navigator.geolocation com tratamento de erros |
| `useReverseGeocode.ts` | Converte lat/lng em endereço |
| `useForwardGeocode.ts` | Converte endereço em lat/lng |
| `useDeliveryZoneCheck.ts` | Verifica se coordenadas estão em zona ativa |

---

## 9. Ajustes no Backend

### **9.1. Migrations Necessárias:**

**Tabela `addresses`:**
```sql
ALTER TABLE addresses ADD COLUMN latitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN longitude NUMERIC(10, 7);
ALTER TABLE addresses ADD COLUMN formatted_address TEXT;
ALTER TABLE addresses ADD COLUMN place_id TEXT;
ALTER TABLE addresses ADD COLUMN address_source TEXT DEFAULT 'manual';
ALTER TABLE addresses ADD COLUMN delivery_zone_id UUID REFERENCES delivery_zones(id);
```

**Tabela `delivery_zones`:**
```sql
ALTER TABLE delivery_zones ADD COLUMN polygon_coords JSONB;
ALTER TABLE delivery_zones ADD COLUMN is_polygon BOOLEAN DEFAULT false;
ALTER TABLE delivery_zones ADD COLUMN estimated_delivery_time INTEGER;
ALTER TABLE delivery_zones ADD COLUMN center_lat NUMERIC(10, 7);
ALTER TABLE delivery_zones ADD COLUMN center_lng NUMERIC(10, 7);
ALTER TABLE delivery_zones ADD COLUMN radius_km NUMERIC(5, 2);
```

**Nova tabela `delivery_attempts_log`:**
```sql
CREATE TABLE delivery_attempts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  customer_phone TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  requested_address TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **9.2. Lógica de Validação:**

```typescript
// Função point-in-polygon (frontend ou edge function)
function validateDeliveryZone(
  lat: number, 
  lng: number, 
  zones: DeliveryZone[]
): DeliveryZone | null {
  
  // Primeiro: verificar zonas com polígono
  for (const zone of zones.filter(z => z.is_polygon && z.polygon_coords)) {
    if (isPointInPolygon({ lat, lng }, zone.polygon_coords)) {
      return zone;
    }
  }
  
  // Fallback: verificar zonas com raio
  for (const zone of zones.filter(z => z.center_lat && z.radius_km)) {
    const distance = haversineDistance(
      { lat, lng },
      { lat: zone.center_lat, lng: zone.center_lng }
    );
    if (distance <= zone.radius_km) {
      return zone;
    }
  }
  
  return null; // Fora de todas as zonas
}
```

---

## 10. Recomendação: Melhor Padrão de Experiência

### **Abordagem Recomendada: "Mapa Primeiro, Manual Sempre Disponível"**

| Aspecto | Decisão | Justificativa |
|---------|---------|---------------|
| **Interface padrão** | Mapa com autocomplete | Maior conversão, menos erros |
| **GPS** | Opcional, botão visível | Conveniência sem obrigatoriedade |
| **Fallback manual** | Sempre acessível | Garante que ninguém fica bloqueado |
| **Validação de zona** | No frontend, antes de prosseguir | Feedback imediato |
| **Endereço sem coordenadas** | Aceitar com flag | Não bloquear venda por falha técnica |

### **Métricas para Acompanhar:**

| Métrica | Objetivo |
|---------|----------|
| % pedidos com coordenadas válidas | > 90% |
| % uso do GPS | Monitorar (não é meta) |
| % fallback para manual | < 15% (indicador de boa UX) |
| Tempo no step de endereço | Reduzir 40% vs atual |
| Taxa de abandono no step 2 | Reduzir 50% |

---

## 11. Fases de Implementação (Revisadas)

### **Fase 1: Fundação + Mapa Básico (3-4 dias)**
- Migrations de banco de dados
- Componente de mapa com clique para selecionar
- Centralização na cidade do restaurante (sem depender de GPS)
- Botão "Usar minha localização" (opcional)

### **Fase 2: Autocomplete + Reverse Geocoding (2-3 dias)**
- Integração Google Places Autocomplete
- Reverse geocoding ao clicar no mapa
- Preenchimento automático dos campos

### **Fase 3: Validação de Zonas (2-3 dias)**
- Editor de zonas no Admin (círculo ou polígono)
- Validação em tempo real no checkout
- Taxa dinâmica por zona
- Logging de tentativas fora da área

### **Fase 4: Fallbacks e Robustez (1-2 dias)**
- Modo offline/fallback para formulário manual
- Geocoding de endereços manuais
- Tratamento de todos os edge cases
- Testes de usabilidade

---

## 12. Próximo Passo

Para iniciar, é necessário:

1. **Configurar Google Maps API Key** no projeto
2. **Aprovar este plano** para começar pela Fase 1

Deseja prosseguir com a implementação seguindo esta abordagem?

