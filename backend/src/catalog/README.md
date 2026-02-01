# Catalog Module - Sistema de Templates

Este módulo implementa um sistema completo de templates para produtos personalizáveis com versionamento, categorização e validação avançada.

## Funcionalidades Implementadas

### 1. Sistema de Templates ✅
- CRUD completo de templates por tenant
- Versionamento automático de templates
- Categorização hierárquica de templates
- Validação avançada de layouts
- Importação/exportação de templates
- Operações em lote
- Analytics e relatórios

### 2. Gestão de Produtos ✅
- CRUD de produtos e variantes
- Especificações técnicas por produto
- Regras de precificação
- Cache otimizado para performance

### 3. Validação de Templates ✅
- Validação estrutural de layouts JSON
- Verificação de elementos e propriedades
- Validação específica por tipo de produto
- Score de qualidade automático
- Detecção de sobreposições

### 4. Versionamento ✅
- Histórico completo de versões
- Comparação entre versões
- Reversão para versões anteriores
- Changelog automático

### 5. Categorização ✅
- Hierarquia de categorias
- Organização por tipo de produto
- Slugs únicos por tenant
- Contagem de templates por categoria
- Ativação/desativação de templates

### 2. Versionamento de Templates ✅
- Controle de versões automático
- Histórico completo de mudanças
- Comparação entre versões
- Reversão para versões anteriores
- Changelog detalhado

### 3. Categorização Hierárquica ✅
- Categorias e subcategorias
- Organização por slug único
- Contagem de templates por categoria
- Movimentação de categorias

### 4. Validação Avançada ✅
- Validação de estrutura de layout
- Verificações específicas por produto
- Score de qualidade (0-100)
- Detecção de sobreposições
- Validação de guias e constraints

### 5. Cache Inteligente ✅
- Cache por tenant e filtros
- Invalidação automática
- TTL configurável
- Performance otimizada

## Estrutura de Templates

### Layout JSON
```json
{
  "type": "single_photo",
  "elements": [
    {
      "id": "photo1",
      "type": "photo",
      "frame": {
        "x": 15,
        "y": 15,
        "width": 170,
        "height": 170,
        "rotation": 0
      },
      "properties": {
        "fit": "cover",
        "borderRadius": 0
      },
      "constraints": {
        "minWidth": 50,
        "maxWidth": 200,
        "aspectRatio": 1.0,
        "lockAspectRatio": true
      }
    }
  ],
  "guides": {
    "bleed": 3,
    "safeArea": 5,
    "grid": {
      "enabled": true,
      "size": 5,
      "snap": true
    }
  },
  "metadata": {
    "version": "1.0",
    "created": "2024-01-01T00:00:00Z",
    "author": "Designer Name",
    "description": "Template clássico para fotolivro"
  }
}
```

### Tipos de Elementos

#### Elemento de Foto
```json
{
  "type": "photo",
  "frame": { "x": 10, "y": 10, "width": 100, "height": 100 },
  "properties": {
    "fit": "cover|contain|fill|scale-down",
    "borderRadius": 0,
    "border": {
      "width": 1,
      "color": "#000000",
      "style": "solid"
    },
    "shadow": {
      "enabled": true,
      "blur": 5,
      "offset": { "x": 2, "y": 2 },
      "color": "rgba(0,0,0,0.3)"
    }
  }
}
```

#### Elemento de Texto
```json
{
  "type": "text",
  "frame": { "x": 10, "y": 120, "width": 180, "height": 30 },
  "properties": {
    "text": "Texto padrão",
    "fontSize": 12,
    "fontFamily": "Arial",
    "fontWeight": "normal",
    "fontStyle": "normal",
    "color": "#000000",
    "textAlign": "left|center|right|justify",
    "lineHeight": 1.2,
    "letterSpacing": 0
  }
}
```

#### Elemento de Forma
```json
{
  "type": "shape",
  "frame": { "x": 50, "y": 50, "width": 100, "height": 100 },
  "properties": {
    "shapeType": "rectangle|circle|ellipse|polygon",
    "fillColor": "#FF0000",
    "strokeColor": "#000000",
    "strokeWidth": 1,
    "cornerRadius": 0
  }
}
```

## Endpoints da API

### Templates

#### GET /templates
Listar templates com filtros.

**Query Parameters:**
- `productType`: Filtrar por tipo de produto
- `active`: Filtrar por status ativo
- `search`: Buscar por nome ou descrição

#### POST /templates
Criar novo template.

```json
{
  "productType": "photobook",
  "name": "Template Clássico",
  "description": "Layout simples com uma foto por página",
  "layoutJson": { ... },
  "previewUrl": "/previews/classic.jpg"
}
```

#### GET /templates/:id
Buscar template por ID.

#### PATCH /templates/:id
Atualizar template.

#### DELETE /templates/:id
Deletar template.

#### POST /templates/:id/duplicate
Duplicar template.

```json
{
  "name": "Novo Nome (Opcional)"
}
```

#### POST /templates/:id/validate
Validar layout do template.

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "code": "FONT_TOO_SMALL",
      "message": "Fonte muito pequena pode ser difícil de ler",
      "path": "elements[0].properties.fontSize",
      "suggestion": "Use fonte de pelo menos 8pt"
    }
  ],
  "score": 85
}
```

### Versionamento

#### GET /templates/:templateId/versions
Listar versões do template.

#### POST /templates/:templateId/versions
Criar nova versão.

```json
{
  "layoutJson": { ... },
  "changelog": "Adicionado novo elemento de texto"
}
```

#### GET /templates/:templateId/versions/:version
Obter versão específica.

#### POST /templates/:templateId/versions/:version/revert
Reverter para versão específica.

#### GET /templates/:templateId/versions/compare/:oldVersion/:newVersion
Comparar duas versões.

### Categorias

#### GET /template-categories
Listar categorias (hierárquicas).

#### POST /template-categories
Criar categoria.

```json
{
  "name": "Fotolivros",
  "description": "Templates para fotolivros",
  "parentId": null,
  "sortOrder": 0
}
```

#### GET /template-categories/:id
Buscar categoria por ID.

#### PATCH /template-categories/:id
Atualizar categoria.

#### DELETE /template-categories/:id
Deletar categoria.

#### POST /template-categories/:categoryId/templates/:templateId
Associar template à categoria.

#### DELETE /template-categories/templates/:templateId
Remover template da categoria.

## Validações de Template

### Validações Básicas
- Estrutura JSON válida
- Elementos obrigatórios presentes
- Tipos de dados corretos
- Coordenadas dentro dos limites

### Validações por Produto

#### Fotolivro
- Número par de páginas
- Sangria mínima de 3mm
- Área segura de 5mm
- Elementos de foto adequados

#### Calendário
- 13 páginas (capa + 12 meses)
- Elementos de data presentes
- Layout mensal adequado

#### Quadro
- Página única
- Elemento de foto principal
- Proporções adequadas

### Score de Qualidade

O score é calculado baseado em:
- **Erros críticos**: -20 pontos cada
- **Avisos**: -10 pontos cada
- **Warnings**: -5 pontos cada
- **Boas práticas**: +3 a +5 pontos cada

**Critérios de Boas Práticas:**
- Sangria adequada (≥3mm): +5 pontos
- Área segura adequada (≥5mm): +5 pontos
- Metadados completos: +5 pontos
- Descrição presente: +3 pontos

## Cache e Performance

### Estratégia de Cache
- Templates por tenant: 10 minutos
- Categorias: 15 minutos
- Versões: 5 minutos
- Validações: 2 minutos

### Invalidação
- Automática ao criar/atualizar
- Por tenant e filtros específicos
- Limpeza de versões antigas

## Versionamento

### Controle de Versões
- Numeração automática sequencial
- Changelog obrigatório
- Histórico completo preservado
- Comparação visual de mudanças

### Limpeza Automática
- Manter últimas 10 versões por padrão
- Configurável por tenant
- Limpeza manual disponível

## Categorização

### Hierarquia
- Categorias e subcategorias ilimitadas
- Prevenção de ciclos
- Ordenação customizável
- Contagem automática de templates

### Organização
- Slugs únicos por tenant
- Movimentação entre categorias
- Associação múltipla (futuro)

## Estrutura de Arquivos

```
catalog/
├── controllers/
│   ├── templates.controller.ts           # CRUD de templates
│   ├── template-version.controller.ts    # Versionamento
│   └── template-category.controller.ts   # Categorização
├── services/
│   ├── templates.service.ts              # Lógica principal
│   ├── template-version.service.ts       # Controle de versões
│   ├── template-category.service.ts      # Gestão de categorias
│   └── template-validation.service.ts    # Validação avançada
├── entities/
│   └── template.entity.ts                # Entidade principal
├── dto/
│   ├── create-template.dto.ts
│   └── update-template.dto.ts
├── catalog.module.ts                     # Configuração do módulo
├── index.ts                              # Exports
└── README.md                             # Esta documentação
```

## Próximos Passos

- [ ] Implementar preview automático de templates
- [ ] Adicionar suporte a templates responsivos
- [ ] Implementar marketplace de templates
- [ ] Adicionar analytics de uso de templates
- [ ] Implementar templates colaborativos
## Arqu
itetura do Sistema

### Modelos de Dados

#### Template
```typescript
interface Template {
  id: string;
  tenantId: string;
  productType: string;
  categoryId?: string;
  name: string;
  description?: string;
  layoutJson: LayoutStructure;
  previewUrl?: string;
  version: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### TemplateCategory
```typescript
interface TemplateCategory {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder: number;
  active: boolean;
  children?: TemplateCategory[];
}
```

#### TemplateVersion
```typescript
interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  layoutJson: LayoutStructure;
  changelog?: string;
  createdBy: string;
  createdAt: Date;
}
```

### Estrutura de Layout

```typescript
interface LayoutStructure {
  type: string;
  elements: LayoutElement[];
  guides?: LayoutGuides;
  pages?: PageLayout[];
  metadata?: LayoutMetadata;
}

interface LayoutElement {
  id?: string;
  type: 'photo' | 'text' | 'shape' | 'background';
  frame: ElementFrame;
  properties?: Record<string, any>;
  constraints?: ElementConstraints;
}

interface ElementFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}
```

## Endpoints da API

### Templates Básicos

#### POST /templates
Criar novo template.

```json
{
  "productType": "photobook",
  "categoryId": "uuid",
  "name": "Template Moderno",
  "description": "Layout moderno com múltiplas fotos",
  "layoutJson": {
    "type": "multi_photo",
    "elements": [
      {
        "type": "photo",
        "frame": { "x": 10, "y": 10, "width": 80, "height": 80 }
      }
    ],
    "guides": { "bleed": 3, "safeArea": 5 }
  }
}
```

#### GET /templates
Listar templates com filtros.

Query Parameters:
- `productType`: Filtrar por tipo de produto
- `active`: Filtrar por status ativo
- `search`: Buscar por nome/descrição

#### GET /templates/:id
Obter template específico.

#### PATCH /templates/:id
Atualizar template.

#### DELETE /templates/:id
Deletar template.

### Operações Avançadas

#### GET /template-manager/search
Busca avançada com múltiplos filtros.

Query Parameters:
- `productType`: Tipo de produto
- `categoryId`: ID da categoria
- `search`: Termo de busca
- `active`: Status ativo
- `minVersion`: Versão mínima
- `maxVersion`: Versão máxima
- `createdAfter`: Data de criação após
- `createdBefore`: Data de criação antes

#### POST /template-manager/import
Importar template de JSON.

```json
{
  "name": "Template Importado",
  "productType": "calendar",
  "layoutJson": { ... },
  "metadata": {
    "source": "external",
    "difficulty": "medium"
  }
}
```

#### GET /templates/:id/export
Exportar template para JSON.

#### POST /template-manager/bulk-operation
Operações em lote.

```json
{
  "templateIds": ["uuid1", "uuid2"],
  "operation": "activate",
  "params": {}
}
```

### Categorias

#### POST /template-categories
Criar categoria.

```json
{
  "name": "Casamentos",
  "description": "Templates para casamentos",
  "parentId": "uuid",
  "sortOrder": 10
}
```

#### GET /template-categories
Listar categorias (com hierarquia).

#### PATCH /template-categories/:id
Atualizar categoria.

### Versões

#### POST /templates/:templateId/versions
Criar nova versão.

```json
{
  "layoutJson": { ... },
  "changelog": "Adicionado novo elemento de texto"
}
```

#### GET /templates/:templateId/versions
Listar versões do template.

#### GET /templates/:templateId/versions/:version
Obter versão específica.

## Validação de Templates

### Tipos de Validação

1. **Estrutural**: Verifica se o JSON tem estrutura válida
2. **Elementos**: Valida propriedades de cada elemento
3. **Produto-específica**: Regras específicas por tipo de produto
4. **Qualidade**: Score de 0-100 baseado em boas práticas

### Exemplo de Validação

```typescript
const validation = await templateValidationService.validateLayout(
  layoutJson,
  'photobook'
);

// Resultado
{
  valid: true,
  errors: [],
  warnings: [
    {
      code: 'FONT_TOO_SMALL',
      message: 'Fonte muito pequena pode ser difícil de ler',
      path: 'elements[0].properties.fontSize'
    }
  ],
  score: 85
}
```

### Regras por Produto

#### Fotolivro
- Deve ter páginas definidas
- Número par de páginas (recomendado)
- Sangria mínima de 3mm
- Área segura de 5mm

#### Calendário
- 13 páginas (capa + 12 meses)
- Elementos de data obrigatórios
- Layout específico para cada mês

#### Quadro
- Apenas uma página
- Elemento de foto obrigatório
- Foco em foto principal

## Cache e Performance

### Estratégia de Cache

1. **Templates**: Cache de 10 minutos
2. **Categorias**: Cache de 30 minutos
3. **Analytics**: Cache de 1 hora
4. **Validações**: Cache de 5 minutos

### Otimizações

- Lazy loading de versões
- Paginação em listagens
- Índices otimizados no banco
- Compressão de layouts JSON

## Analytics

### Métricas Disponíveis

```typescript
interface TemplateAnalytics {
  totalTemplates: number;
  activeTemplates: number;
  templatesByType: Record<string, number>;
  templatesByCategory: Record<string, number>;
  averageVersion: number;
  mostUsedTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
  }>;
  recentlyCreated: TemplateEntity[];
  recentlyUpdated: TemplateEntity[];
}
```

### Endpoint de Analytics

```http
GET /template-manager/analytics
```

## Importação/Exportação

### Formato de Exportação

```json
{
  "template": {
    "id": "uuid",
    "name": "Template Exemplo",
    "productType": "photobook",
    "layoutJson": { ... },
    "version": 3
  },
  "versions": [
    {
      "version": 1,
      "layoutJson": { ... },
      "changelog": "Versão inicial"
    }
  ],
  "exportedAt": "2024-01-01T00:00:00Z"
}
```

### Importação

- Validação automática do layout
- Verificação de dependências
- Criação de primeira versão
- Associação à categoria (se especificada)

## Operações em Lote

### Operações Suportadas

1. **activate**: Ativar templates
2. **deactivate**: Desativar templates
3. **delete**: Deletar templates
4. **move_category**: Mover para categoria

### Exemplo

```json
{
  "templateIds": ["uuid1", "uuid2", "uuid3"],
  "operation": "move_category",
  "params": {
    "categoryId": "new-category-uuid"
  }
}
```

## Estrutura de Arquivos

```
catalog/
├── controllers/
│   ├── templates.controller.ts           # CRUD básico
│   ├── template-manager.controller.ts    # Operações avançadas
│   ├── template-category.controller.ts   # Gestão de categorias
│   └── template-version.controller.ts    # Versionamento
├── services/
│   ├── templates.service.ts              # Lógica principal
│   ├── template-manager.service.ts       # Operações avançadas
│   ├── template-category.service.ts      # Categorias
│   ├── template-version.service.ts       # Versionamento
│   └── template-validation.service.ts    # Validação
├── entities/
│   └── template.entity.ts                # Entidade principal
├── dto/
│   ├── create-template.dto.ts
│   └── update-template.dto.ts
├── catalog.module.ts                     # Configuração do módulo
└── README.md                             # Esta documentação
```

## Próximos Passos

- [ ] Implementar sistema de tags
- [ ] Adicionar templates globais compartilhados
- [ ] Implementar preview automático
- [ ] Adicionar métricas de uso
- [ ] Implementar backup automático
- [ ] Adicionar suporte a temas