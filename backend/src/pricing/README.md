# Módulo de Precificação e Frete

Este módulo implementa um sistema completo de cálculo de preços e frete para produtos personalizáveis.

## Funcionalidades

### Precificação
- ✅ **Engine de precificação dinâmica** com regras configuráveis
- ✅ **Sistema de tiers** para descontos por quantidade
- ✅ **Preços por páginas adicionais** para produtos personalizáveis
- ✅ **Descontos por tipo de cliente** (individual, business, reseller)
- ✅ **Sistema de regras flexível** com condições e ações
- ✅ **Cache inteligente** para performance (5 min TTL)
- ✅ **Cálculo de impostos** brasileiro (18%)
- ✅ **Breakdown detalhado** de preços

### Frete
- ✅ **Cálculo de frete por CEP** integrado aos Correios
- ✅ **Múltiplas transportadoras** (Correios, transportadoras privadas)
- ✅ **Frete grátis configurável** por valor mínimo
- ✅ **Cache de consultas** CEP e frete (1h TTL)
- ✅ **Estimativa de entrega** baseada no serviço
- ✅ **Validação de CEP** com consulta à base dos Correios
- ✅ **Suporte a mock** para desenvolvimento

## Endpoints

### Precificação

#### POST /pricing/calculate
Calcula preço completo incluindo frete opcional.

**Body:**
```json
{
  "productId": "uuid",
  "variantId": "uuid",
  "quantity": 2,
  "pages": 25,
  "customerType": "business",
  "promoCode": "DESCONTO10",
  "shipping": {
    "destinationCep": "01310-100",
    "calculateShipping": true
  }
}
```

**Response:**
```json
{
  "basePrice": 100.00,
  "additionalPagesPrice": 12.50,
  "customizationsPrice": 0,
  "discounts": [
    {
      "id": "business-discount",
      "name": "Desconto Empresarial",
      "type": "percentage",
      "value": 15,
      "amount": 16.88
    }
  ],
  "subtotal": 112.50,
  "taxes": [
    {
      "id": "br-tax",
      "name": "Impostos Brasileiros",
      "rate": 0.18,
      "amount": 17.21
    }
  ],
  "shipping": {
    "options": [
      {
        "service": "04510",
        "serviceName": "PAC",
        "price": 15.50,
        "deliveryTime": 5,
        "currency": "BRL",
        "provider": "correios"
      }
    ],
    "freeShippingThreshold": 150
  },
  "total": 129.21,
  "currency": "BRL",
  "breakdown": [...]
}
```

#### POST /pricing/calculate/bulk
Cálculo em lote (até 100 itens).

#### GET /pricing/estimate/:productId
Estimativa rápida de preço.

### Frete

#### POST /pricing/shipping/calculate
Calcula apenas o frete para um produto.

**Body:**
```json
{
  "productId": "uuid",
  "quantity": 1,
  "destinationCep": "04567-890"
}
```

**Response:**
```json
{
  "options": [
    {
      "service": "04014",
      "serviceName": "SEDEX",
      "price": 25.50,
      "deliveryTime": 2,
      "deliveryTimeMax": 3,
      "currency": "BRL",
      "provider": "correios"
    },
    {
      "service": "04510", 
      "serviceName": "PAC",
      "price": 15.50,
      "deliveryTime": 5,
      "deliveryTimeMax": 7,
      "currency": "BRL",
      "provider": "correios"
    }
  ],
  "freeShippingThreshold": 150,
  "estimatedDelivery": {
    "min": "2024-01-15T00:00:00Z",
    "max": "2024-01-20T00:00:00Z"
  }
}
```

#### GET /pricing/shipping/cep/:cep
Consulta informações do CEP.

**Response:**
```json
{
  "cep": "01310100",
  "logradouro": "Avenida Paulista",
  "bairro": "Bela Vista",
  "localidade": "São Paulo",
  "uf": "SP",
  "ddd": "11"
}
```

#### POST /pricing/shipping/free-shipping-check
Verifica elegibilidade para frete grátis.

**Body:**
```json
{
  "orderValue": 120.00,
  "destinationCep": "01310-100"
}
```

**Response:**
```json
{
  "eligible": false,
  "threshold": 150.00,
  "remaining": 30.00
}
```

### Regras de Preço

#### POST /pricing/rules
Criar regra de precificação.

#### GET /pricing/rules
Listar regras do tenant.

#### PUT /pricing/rules/:id
Atualizar regra.

#### DELETE /pricing/rules/:id
Excluir regra.

#### POST /pricing/rules/:id/simulate
Simular aplicação de regra.

## Configuração

### Variáveis de Ambiente

```env
# Frete grátis
FREE_SHIPPING_THRESHOLD=150

# APIs externas
CORREIOS_API_URL=https://ws.correios.com.br
VIACEP_API_URL=https://viacep.com.br/ws

# Mock para desenvolvimento
MOCK_EXTERNAL_SERVICES=true

# Cache
CACHE_TTL_PRICING=300
CACHE_TTL_SHIPPING=3600
CACHE_TTL_CEP=86400
```

### Regras de Precificação

As regras seguem o padrão condição → ação:

```typescript
{
  "conditions": [
    {
      "type": "quantity",
      "operator": "gte", 
      "value": 5
    }
  ],
  "actions": [
    {
      "type": "percentage_discount",
      "value": 10,
      "currency": "BRL"
    }
  ]
}
```

**Tipos de Condição:**
- `quantity` - Quantidade do produto
- `pages` - Número de páginas
- `customer_type` - Tipo de cliente
- `date_range` - Período de validade
- `product_type` - Tipo do produto

**Operadores:**
- `eq` - Igual
- `gt` - Maior que
- `gte` - Maior ou igual
- `lt` - Menor que
- `lte` - Menor ou igual
- `in` - Contido em array
- `between` - Entre dois valores

**Tipos de Ação:**
- `base_price` - Definir preço base
- `percentage_discount` - Desconto percentual
- `fixed_discount` - Desconto fixo
- `markup` - Acréscimo percentual
- `tier_price` - Preço por tier

### Configuração de Produtos

```json
{
  "basePrice": 50.00,
  "basePages": 20,
  "additionalPagePrice": 2.50,
  "quantityTiers": [
    { "minQuantity": 5, "discountPercentage": 10 },
    { "minQuantity": 10, "discountPercentage": 15 }
  ],
  "customerDiscounts": {
    "business": { "percentage": 15, "description": "Desconto empresarial" },
    "reseller": { "percentage": 25, "description": "Desconto revenda" }
  },
  "shipping": {
    "weight": 500,
    "dimensions": { "length": 30, "width": 20, "height": 5 },
    "originCep": "01310-100",
    "services": ["04014", "04510"]
  }
}
```

## Performance

### Cache Strategy
- **Preços:** 5 minutos (alta volatilidade)
- **Frete:** 1 hora (média volatilidade) 
- **CEP:** 24 horas (baixa volatilidade)

### Otimizações
- Processamento em lote com limite de concorrência
- Cache baseado em hash dos parâmetros
- Invalidação seletiva de cache
- Fallback para mock em caso de falha de API

### SLA Targets
- **Cálculo de preço:** < 500ms
- **Cálculo de frete:** < 2s
- **Consulta CEP:** < 1s (com cache)

## Desenvolvimento

### Modo Mock
Para desenvolvimento sem APIs externas:

```env
MOCK_EXTERNAL_SERVICES=true
```

### Testes
```bash
npm test pricing.service.spec.ts
npm test shipping.service.spec.ts
```

### Estrutura de Arquivos

```
pricing/
├── controllers/
│   └── pricing.controller.ts
├── services/
│   ├── pricing.service.ts
│   ├── pricing-rules.service.ts
│   └── shipping.service.ts
├── entities/
│   └── pricing-rule.entity.ts
├── tests/
│   ├── pricing.service.spec.ts
│   └── shipping.service.spec.ts
└── pricing.module.ts
```

## Integrações

### APIs Externas
- **Correios:** Cálculo de frete PAC/SEDEX
- **ViaCEP:** Consulta de informações de CEP
- **Transportadoras:** APIs customizadas

### Módulos Internos
- **Catalog:** Busca de produtos e variantes
- **Auth:** Isolamento por tenant
- **Cache:** Performance e otimização

## Próximos Passos

- [ ] Integração real com API dos Correios
- [ ] Suporte a mais transportadoras
- [ ] Regras de frete por região
- [ ] Cálculo de impostos por estado
- [ ] Cupons de desconto avançados
- [ ] A/B testing para preços