# Tenants Module

Este módulo implementa um sistema completo de multi-tenancy para isolamento de dados e configurações por tenant.

## Funcionalidades Implementadas

### 1. Gestão de Tenants ✅
- CRUD completo de tenants
- Ativação/desativação de tenants
- Validação de slugs únicos
- Configurações personalizáveis por tenant

### 2. Isolamento de Dados ✅
- Middleware automático para filtrar dados por tenant
- Interceptor de isolamento de dados
- Guards de segurança por tenant
- Verificação de acesso automática

### 3. Configurações de Tema ✅
- Personalização completa de cores e branding
- Upload de logo e favicon
- Configurações de layout e tipografia
- CSS customizado por tenant

### 4. Configurações Gerais ✅
- Limites e cotas por tenant
- Configurações de funcionalidades
- Configurações de pagamento e frete
- Configurações de LGPD e analytics

### 5. Gestão de Dados ✅
- Estatísticas de uso por tenant
- Verificação de cotas e limites
- Migração de dados entre tenants
- Exclusão completa de dados

## Arquitetura

### Guards
- **TenantGuard**: Verifica acesso do usuário ao tenant
- Integrado globalmente no AppModule
- Suporte a super admin com acesso total

### Interceptors
- **TenantIsolationInterceptor**: Filtra dados automaticamente
- Bloqueia acesso a dados de outros tenants
- Logs de segurança para tentativas de acesso

### Middleware
- **TenantContextMiddleware**: Extrai tenant ID do header
- **TenantPrismaMiddleware**: Configura contexto do Prisma
- Filtros automáticos em queries do banco

### Decorators
- **@SkipTenantIsolation()**: Pula isolamento em rotas específicas
- **@TenantContext()**: Injeta contexto do tenant
- **@CurrentTenant()**: Injeta tenant ID atual

## Endpoints da API

### Gestão de Tenants

#### POST /tenants
Criar novo tenant.

```json
{
  "name": "Minha Loja",
  "slug": "minha-loja",
  "themeConfig": {
    "primaryColor": "#3B82F6",
    "logo": "/logo.png"
  },
  "settings": {
    "allowRegistration": true,
    "maxProjectsPerUser": 50
  }
}
```

#### GET /tenants
Listar todos os tenants (com filtro por status).

#### GET /tenants/:id
Buscar tenant por ID.

#### GET /tenants/slug/:slug
Buscar tenant por slug.

#### PATCH /tenants/:id
Atualizar tenant.

#### DELETE /tenants/:id
Deletar tenant.

### Configurações de Tema

#### GET /tenants/:tenantId/theme/config
Obter configurações de tema.

#### PUT /tenants/:tenantId/theme/config
Atualizar configurações de tema.

```json
{
  "primaryColor": "#FF6B6B",
  "secondaryColor": "#4ECDC4",
  "logo": "/new-logo.png",
  "brandName": "Nova Marca",
  "headerStyle": "minimal",
  "showPrices": true,
  "enableWishlist": false
}
```

#### POST /tenants/:tenantId/theme/config/reset
Resetar tema para padrão.

#### GET /tenants/:tenantId/theme/settings
Obter configurações gerais.

#### PUT /tenants/:tenantId/theme/settings
Atualizar configurações gerais.

```json
{
  "allowRegistration": false,
  "maxProjectsPerUser": 100,
  "enablePIX": true,
  "enableCreditCard": true,
  "freeShippingThreshold": 150,
  "enableAnalytics": true,
  "googleAnalyticsId": "GA-XXXXXXX"
}
```

### Gestão de Dados

#### GET /tenants/:tenantId/data/stats
Obter estatísticas de uso.

```json
{
  "users": 45,
  "products": 120,
  "projects": 890,
  "assets": 2340,
  "orders": 156,
  "storageUsed": 2147483648,
  "apiCalls": 8750
}
```

#### GET /tenants/:tenantId/data/quotas
Obter cotas do tenant.

```json
{
  "maxUsers": 100,
  "maxProducts": 1000,
  "maxProjects": 5000,
  "maxAssets": 10000,
  "maxStorageGB": 10,
  "maxApiCallsPerMonth": 10000
}
```

#### GET /tenants/:tenantId/data/quota-check
Verificar status das cotas.

```json
{
  "withinLimits": false,
  "violations": [
    "Limite de usuários excedido: 105/100",
    "Limite de armazenamento excedido: 12.5GB/10GB"
  ],
  "stats": { ... },
  "quotas": { ... }
}
```

## Configurações de Tema

### Cores e Branding
```typescript
interface ThemeConfig {
  primaryColor?: string;        // Cor primária
  secondaryColor?: string;      // Cor secundária
  accentColor?: string;         // Cor de destaque
  backgroundColor?: string;     // Cor de fundo
  textColor?: string;          // Cor do texto
  logo?: string;               // URL do logo
  favicon?: string;            // URL do favicon
  brandName?: string;          // Nome da marca
}
```

### Layout e Tipografia
```typescript
interface LayoutConfig {
  headerStyle?: 'default' | 'minimal' | 'centered';
  footerStyle?: 'default' | 'minimal' | 'extended';
  sidebarPosition?: 'left' | 'right' | 'none';
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  customCSS?: string;
}
```

### Configurações de Produto
```typescript
interface ProductConfig {
  showPrices?: boolean;
  showDiscounts?: boolean;
  enableWishlist?: boolean;
  enableProductReviews?: boolean;
  autoApproveReviews?: boolean;
}
```

## Configurações Gerais

### Limites de Usuário
```typescript
interface UserLimits {
  allowRegistration?: boolean;
  requireEmailVerification?: boolean;
  maxProjectsPerUser?: number;
  maxAssetsPerProject?: number;
}
```

### Configurações de Upload
```typescript
interface UploadConfig {
  maxFileSize?: number;
  allowedFileTypes?: string[];
  enableImageOptimization?: boolean;
}
```

### Configurações de Pagamento
```typescript
interface PaymentConfig {
  enablePIX?: boolean;
  enableCreditCard?: boolean;
  enableBankSlip?: boolean;
  enableShipping?: boolean;
  freeShippingThreshold?: number;
}
```

## Isolamento de Dados

### Automático
O sistema automaticamente filtra dados por tenant em:
- Todas as queries do Prisma
- Respostas de API
- Logs de auditoria
- Uploads de arquivos

### Manual
Para casos especiais, use os decorators:

```typescript
@SkipTenantIsolation()
@Get('global-stats')
async getGlobalStats() {
  // Esta rota não filtra por tenant
  return this.service.getGlobalStats();
}

@Get('tenant-data')
async getTenantData(@TenantContext() context: TenantContext) {
  // Acesso ao contexto completo do tenant
  return this.service.getData(context.tenantId);
}
```

## Segurança

### Verificação de Acesso
- Usuários só acessam dados do próprio tenant
- Super admins têm acesso total
- Logs de tentativas de acesso negado

### Validação de Dados
- Slugs únicos e válidos
- Configurações validadas
- Limites de cotas respeitados

### Auditoria
- Todas as ações são logadas
- Rastreamento de mudanças de configuração
- Alertas de violação de cotas

## Uso nos Controllers

### Rotas Protegidas por Tenant
```typescript
@Controller('products')
@UseGuards(TenantGuard)
export class ProductsController {
  @Get()
  async findAll(@TenantContext() context: TenantContext) {
    // Dados automaticamente filtrados por tenant
    return this.productsService.findAll(context.tenantId);
  }
}
```

### Rotas de Super Admin
```typescript
@Controller('admin/tenants')
@UseGuards(SuperAdminGuard)
export class AdminTenantsController {
  @Get()
  @SkipTenantIsolation()
  async findAll() {
    // Acesso a todos os tenants
    return this.tenantsService.findAll();
  }
}
```

## Migração e Backup

### Migração de Dados
```typescript
// Migrar dados entre tenants (Super Admin apenas)
await tenantDataService.migrateTenantData(
  'source-tenant-id',
  'target-tenant-id',
  'admin-user-id'
);
```

### Exclusão de Dados
```typescript
// Deletar todos os dados de um tenant (Super Admin apenas)
await tenantDataService.deleteTenantData(
  'tenant-id',
  'admin-user-id'
);
```

## Monitoramento

### Métricas por Tenant
- Número de usuários ativos
- Uso de armazenamento
- Chamadas de API
- Performance de queries

### Alertas
- Violação de cotas
- Tentativas de acesso negado
- Falhas de migração
- Uso excessivo de recursos

## Estrutura de Arquivos

```
tenants/
├── controllers/
│   ├── tenant-theme.controller.ts    # Gestão de temas
│   └── tenant-data.controller.ts     # Gestão de dados
├── services/
│   ├── tenant-theme.service.ts       # Configurações de tema
│   └── tenant-data.service.ts        # Estatísticas e dados
├── guards/
│   └── tenant.guard.ts               # Verificação de acesso
├── interceptors/
│   └── tenant-isolation.interceptor.ts # Isolamento automático
├── middleware/
│   └── tenant-prisma.middleware.ts   # Contexto do Prisma
├── decorators/
│   ├── skip-tenant-isolation.decorator.ts
│   └── tenant-context.decorator.ts
├── dto/
│   ├── create-tenant.dto.ts
│   └── update-tenant.dto.ts
├── entities/
│   └── tenant.entity.ts
├── tenants.controller.ts             # CRUD de tenants
├── tenants.service.ts                # Lógica principal
├── tenants.module.ts                 # Configuração do módulo
├── index.ts                          # Exports
└── README.md                         # Esta documentação
```

## Próximos Passos

- [ ] Implementar cache de configurações por tenant
- [ ] Adicionar suporte a domínios customizados
- [ ] Implementar backup automático por tenant
- [ ] Adicionar métricas de performance por tenant
- [ ] Implementar rate limiting por tenant