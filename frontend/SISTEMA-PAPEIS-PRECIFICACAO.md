# 📄💰 Sistema de Papéis e Precificação

## 🎯 Objetivo

Criar um sistema completo de gerenciamento de tipos de papel com variações e um motor de precificação dinâmica para produtos gráficos profissionais.

---

## 📄 1. TIPOS DE PAPEL

### Estrutura de Dados

```typescript
PaperType = {
  id: number
  name: string // "Fotográfico Premium"
  
  // Especificações Técnicas
  weight: number // Gramatura (g/m²): 170, 230, 300
  finish: string // Acabamento: brilhante, fosco, acetinado, mate
  type: string // Tipo: fotografico, couche, offset, reciclado
  lamination: string // Laminação: sem, fosca, brilhante, soft-touch, holografica
  
  // Preços
  pricePerPage: number // Preço por página interna
  pricePerCover: number // Preço por capa (se diferente)
  pricePerSheet: number // Preço por folha (para cálculo)
  
  // Informações
  description: string
  manufacturer: string // Fabricante
  availability: boolean // Disponível em estoque
  
  // Aplicações
  suitableFor: string[] // ["fotolivro", "calendario"]
  
  // Status
  active: boolean
}
```

### Exemplos de Papéis

**1. Fotográfico Brilhante 230g**
```
weight: 230
finish: "brilhante"
type: "fotografico"
lamination: "sem"
pricePerPage: 0.80
pricePerCover: 2.50
```

**2. Fotográfico Fosco 230g**
```
weight: 230
finish: "fosco"
type: "fotografico"
lamination: "sem"
pricePerPage: 0.85
pricePerCover: 2.60
```

**3. Fotográfico Brilhante 230g + Laminação Fosca**
```
weight: 230
finish: "brilhante"
type: "fotografico"
lamination: "fosca"
pricePerPage: 1.20
pricePerCover: 3.50
```

---

## 💰 2. SISTEMA DE PRECIFICAÇÃO

### Fórmula de Cálculo

```typescript
PriceCalculation = {
  // 1. Preço Base (por formato)
  basePrice: number // Ex: 15.00 para 20x20cm
  
  // 2. Custo do Papel (páginas internas)
  paperCost = (numberOfPages * paperType.pricePerPage)
  
  // 3. Custo da Capa
  coverCost = {
    type: "dura" | "mole" // Capa dura +10.00, mole +5.00
    paper: paperType.pricePerCover
    lamination: paperType.lamination // Adicional se tiver
  }
  
  // 4. Multiplicador de Formato
  formatMultiplier = {
    "20x20cm": 1.0,
    "21x28cm": 1.3,
    "28x21cm": 1.2,
    "30x30cm": 1.5
  }
  
  // 5. Desconto por Quantidade
  quantityDiscount = {
    1: 0%,
    2-5: 5%,
    6-10: 10%,
    11+: 15%
  }
  
  // CÁLCULO FINAL
  subtotal = (basePrice * formatMultiplier) + paperCost + coverCost
  discount = subtotal * quantityDiscount
  total = subtotal - discount
}
```

### Exemplo de Cálculo

**Fotolivro 20x20cm, 40 páginas, Capa Dura**

```
Base: R$ 15,00
Formato 20x20: × 1.0 = R$ 15,00

Papel (Fotográfico Brilhante 230g):
- 40 páginas × R$ 0,80 = R$ 32,00

Capa Dura:
- Tipo: +R$ 10,00
- Papel capa: R$ 2,50
- Total capa: R$ 12,50

Subtotal: R$ 15,00 + R$ 32,00 + R$ 12,50 = R$ 59,50

Quantidade: 1 (sem desconto)

TOTAL: R$ 59,50
```

---

## 🏗️ 3. ESTRUTURA DE IMPLEMENTAÇÃO

### Stores

**1. `papers.ts`**
```typescript
- paperTypes: PaperType[]
- addPaperType()
- updatePaperType()
- deletePaperType()
- getPapersByType()
- getAvailablePapers()
```

**2. `pricing.ts`**
```typescript
- pricingRules: PricingRule[]
- calculatePrice(config)
- getBasePrice(formatId)
- getCoverPrice(type, paperId)
- getQuantityDiscount(qty)
```

### Componentes

**1. `PapersManagement.vue`**
- CRUD de tipos de papel
- Formulário com todas as variações
- Preview de papel
- Filtros por tipo/acabamento
- Tabela de preços

**2. `PricingRules.vue`**
- Configuração de preços base
- Multiplicadores de formato
- Preços de capa
- Descontos por quantidade
- Simulador de preço

**3. `PriceCalculator.vue`** (componente reutilizável)
- Entrada: formato, páginas, papel, capa, quantidade
- Saída: preço calculado em tempo real
- Breakdown detalhado dos custos

### Composables

**`usePriceCalculator.ts`**
```typescript
export function usePriceCalculator() {
  const calculatePrice = (config: PriceConfig) => {
    // Lógica de cálculo
    return {
      basePrice,
      paperCost,
      coverCost,
      subtotal,
      discount,
      total
    }
  }
  
  return { calculatePrice }
}
```

---

## 📊 4. INTERFACE DO ADMIN

### Menu Lateral
```
📊 Admin
├─ 📦 Tipos de Produto
├─ 📐 Formatos
├─ 📄 Papéis ← NOVO
├─ 💰 Precificação ← NOVO
├─ 🎨 Layouts
└─ ✨ Templates
```

### Tela de Papéis

**Header:**
- Título: "Gestão de Tipos de Papel"
- Botão: "✨ Criar Novo Papel"

**Formulário:**
```
Nome: [Fotográfico Premium]
Tipo: [Fotográfico ▼]
Gramatura: [230] g/m²
Acabamento: [Brilhante ▼]
Laminação: [Sem ▼]

Preços:
- Por página: R$ [0,80]
- Por capa: R$ [2,50]

Descrição: [...]
Fabricante: [...]

☑ Disponível em estoque
☑ Papel ativo
```

**Lista:**
- Cards com preview visual
- Especificações técnicas
- Preços destacados
- Filtros por tipo/acabamento
- Status (disponível/indisponível)

### Tela de Precificação

**Seções:**

1. **Preços Base por Formato**
```
20x20cm: R$ 15,00
21x28cm: R$ 20,00
28x21cm: R$ 18,00
30x30cm: R$ 25,00
```

2. **Preços de Capa**
```
Capa Mole: +R$ 5,00
Capa Dura: +R$ 10,00
Capa Premium: +R$ 15,00
```

3. **Descontos por Quantidade**
```
1 unidade: 0%
2-5 unidades: 5%
6-10 unidades: 10%
11+ unidades: 15%
```

4. **Simulador de Preço**
```
Formato: [20x20cm ▼]
Páginas: [40]
Papel: [Fotográfico Brilhante 230g ▼]
Capa: [Dura ▼]
Quantidade: [1]

[Calcular Preço]

Resultado:
Base: R$ 15,00
Papel: R$ 32,00
Capa: R$ 12,50
Subtotal: R$ 59,50
Desconto: R$ 0,00
TOTAL: R$ 59,50
```

---

## 🔗 5. INTEGRAÇÃO COM SISTEMA EXISTENTE

### Formatos
```typescript
AlbumFormat = {
  ...existing fields
  availablePapers: number[] // IDs dos papéis disponíveis
  defaultPaperId: number // Papel padrão
}
```

### Templates
```typescript
Template = {
  ...existing fields
  defaultPaperId: number // Papel padrão do template
  allowPaperSelection: boolean // Usuário pode escolher?
  price: number // Preço calculado
}
```

### Loja (Frontend)
```typescript
ProductSelection = {
  templateId: number
  formatId: number
  paperId: number // Usuário escolhe
  pages: number
  coverType: string
  quantity: number
  
  // Calculado em tempo real
  price: number
}
```

---

## 📋 6. FLUXO COMPLETO

### Admin configura:
1. Cria tipos de papel com variações
2. Define preços por papel
3. Configura regras de precificação
4. Vincula papéis aos formatos
5. Define papel padrão nos templates

### Usuário na loja:
1. Escolhe template (ex: "Fotolivro Casamento")
2. Vê formato pré-definido (20x20cm)
3. Escolhe papel:
   - Fotográfico Brilhante 230g (R$ 59,50)
   - Fotográfico Fosco 230g (R$ 62,00)
   - Fotográfico + Laminação (R$ 75,00)
4. Escolhe quantidade de páginas (20, 22, 24...)
5. Vê preço atualizar em tempo real
6. Adiciona ao carrinho

---

## 🎯 7. PRÓXIMOS PASSOS

### Fase 1: Papéis
- [ ] Criar store de papéis
- [ ] Criar PapersManagement.vue
- [ ] Integrar com formatos
- [ ] Testes

### Fase 2: Precificação
- [ ] Criar store de pricing
- [ ] Criar PricingRules.vue
- [ ] Criar usePriceCalculator
- [ ] Simulador de preço

### Fase 3: Integração
- [ ] Atualizar formatos
- [ ] Atualizar templates
- [ ] Integrar com loja
- [ ] Testes end-to-end

---

## ✅ RESULTADO FINAL

Um sistema profissional onde:
- ✅ Admin gerencia papéis e variações
- ✅ Preços calculados automaticamente
- ✅ Usuário vê preço em tempo real
- ✅ Sistema escalável e flexível
- ✅ Pronto para produção

---

**Data de Criação**: 30 de Outubro de 2025
**Status**: Especificação Completa - Pronto para Implementação
