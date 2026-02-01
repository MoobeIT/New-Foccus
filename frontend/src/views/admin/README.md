# Painel Administrativo - Editor PWA

Este diretório contém o painel administrativo completo para gerenciar o sistema do Editor de Produtos Personalizados.

## Funcionalidades Implementadas

### 🏠 Dashboard Principal

#### Visão Geral
- **Estatísticas em Tempo Real**: Produtos, templates, pedidos e receita
- **Métricas de Performance**: Conversão, valor médio do pedido, usuários ativos
- **Ações Rápidas**: Acesso direto às funcionalidades mais usadas
- **Feed de Atividades**: Monitoramento de ações recentes no sistema

#### Componentes do Dashboard
```vue
<AdminDashboard>
  <StatsCard />        <!-- Cartões de estatísticas -->
  <ActionCard />       <!-- Ações rápidas -->
  <ActivityFeed />     <!-- Feed de atividades -->
</AdminDashboard>
```

### 📦 Gestão de Produtos

#### Funcionalidades Principais
- **CRUD Completo**: Criar, editar, visualizar e excluir produtos
- **Gestão de Variantes**: Tamanhos, materiais, acabamentos
- **Configuração de Preços**: Preço base, por página, margens de lucro
- **Upload de Imagens**: Múltiplas imagens por produto
- **SEO e Marketing**: Meta tags, descrições otimizadas

#### Estrutura de Produto
```typescript
interface Product {
  id: string;
  name: string;
  type: 'photobook' | 'calendar' | 'card' | 'poster' | 'canvas';
  category: string;
  status: 'active' | 'inactive' | 'draft';
  description: string;
  images: string[];
  specifications: {
    minPages?: number;
    maxPages?: number;
    formats: string[];
    orientations: string[];
    materials: string[];
  };
  pricing: {
    basePrice: number;
    pricePerPage?: number;
    profitMargin: number;
    maxDiscount: number;
  };
  seo: {
    title: string;
    description: string;
  };
  tags: string[];
}
```

#### Componentes de Produtos
```vue
<ProductsManagement>
  <ProductCard />      <!-- Card de produto -->
  <ProductModal />     <!-- Modal de criação/edição -->
  <VariantsModal />    <!-- Gestão de variantes -->
  <BulkActionsBar />   <!-- Ações em lote -->
</ProductsManagement>
```

### 🎨 Gestão de Templates

#### Funcionalidades Principais
- **Upload de Templates**: Suporte a múltiplos formatos
- **Biblioteca Organizada**: Categorização por tipo de produto
- **Preview Interativo**: Visualização antes da publicação
- **Controle de Acesso**: Templates premium e gratuitos
- **Versionamento**: Histórico de alterações

#### Estrutura de Template
```typescript
interface Template {
  id: string;
  name: string;
  description: string;
  productType: string;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  isPremium: boolean;
  previewImage: string;
  thumbnails: string[];
  files: {
    design: string;    // Arquivo de design (PSD, AI, etc.)
    preview: string;   // Preview em alta resolução
    thumbnail: string; // Miniatura
  };
  metadata: {
    dimensions: { width: number; height: number };
    dpi: number;
    colorMode: 'CMYK' | 'RGB';
    layers: number;
  };
  tags: string[];
  downloadCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Componentes de Templates
```vue
<TemplatesManagement>
  <TemplateCard />           <!-- Card de template -->
  <TemplateUploadModal />    <!-- Upload de template -->
  <TemplateEditModal />      <!-- Edição de template -->
  <TemplatePreviewModal />   <!-- Preview do template -->
</TemplatesManagement>
```

### 💰 Gestão de Precificação

#### Funcionalidades Principais
- **Regras de Preço**: Configuração por produto e variante
- **Descontos Automáticos**: Por volume, sazonais, promocionais
- **Margem de Lucro**: Controle de rentabilidade
- **Preços Regionais**: Diferentes preços por região
- **Histórico de Preços**: Rastreamento de alterações

#### Estrutura de Precificação
```typescript
interface PricingRule {
  id: string;
  name: string;
  type: 'base' | 'volume' | 'seasonal' | 'promotional';
  productIds: string[];
  conditions: {
    minQuantity?: number;
    maxQuantity?: number;
    startDate?: Date;
    endDate?: Date;
    userSegments?: string[];
  };
  pricing: {
    type: 'fixed' | 'percentage' | 'formula';
    value: number;
    formula?: string;
  };
  priority: number;
  isActive: boolean;
}
```

#### Componentes de Precificação
```vue
<PricingManagement>
  <PricingRuleCard />      <!-- Card de regra -->
  <PricingRuleModal />     <!-- Criação/edição de regra -->
  <PriceCalculator />      <!-- Calculadora de preços -->
  <PriceHistory />         <!-- Histórico de preços -->
</PricingManagement>
```

## Arquitetura do Sistema

### 🏗️ Estrutura de Componentes

```
admin/
├── views/
│   ├── AdminDashboard.vue      # Dashboard principal
│   └── README.md               # Esta documentação
├── components/
│   ├── layout/
│   │   ├── AdminHeader.vue     # Cabeçalho administrativo
│   │   ├── AdminSidebar.vue    # Menu lateral
│   │   └── AdminFooter.vue     # Rodapé
│   ├── dashboard/
│   │   ├── StatsCard.vue       # Cartão de estatística
│   │   ├── ActionCard.vue      # Cartão de ação rápida
│   │   └── ActivityFeed.vue    # Feed de atividades
│   ├── products/
│   │   ├── ProductsManagement.vue
│   │   ├── ProductCard.vue
│   │   ├── ProductModal.vue
│   │   └── VariantsModal.vue
│   ├── templates/
│   │   ├── TemplatesManagement.vue
│   │   ├── TemplateCard.vue
│   │   ├── TemplateUploadModal.vue
│   │   └── TemplatePreviewModal.vue
│   └── pricing/
│       ├── PricingManagement.vue
│       ├── PricingRuleCard.vue
│       └── PricingRuleModal.vue
└── stores/
    ├── admin.ts                # Store principal do admin
    ├── products.ts             # Store de produtos
    ├── templates.ts            # Store de templates
    └── pricing.ts              # Store de precificação
```

### 🔐 Controle de Acesso

#### Níveis de Permissão
```typescript
enum AdminRole {
  SUPER_ADMIN = 'super_admin',    // Acesso total
  ADMIN = 'admin',                // Gestão geral
  MANAGER = 'manager',            // Gestão de conteúdo
  EDITOR = 'editor',              // Edição limitada
}

interface Permission {
  resource: string;               // products, templates, users, etc.
  actions: string[];              // create, read, update, delete
  conditions?: {
    own_only?: boolean;           // Apenas próprios recursos
    status_filter?: string[];     // Filtros de status
  };
}
```

#### Middleware de Autenticação
```typescript
// Verificação de permissões
const hasPermission = (user: AdminUser, resource: string, action: string): boolean => {
  return user.permissions.some(permission => 
    permission.resource === resource && 
    permission.actions.includes(action)
  );
};

// Guard de rota
const adminGuard = (to: RouteLocation): boolean => {
  const authStore = useAuthStore();
  const user = authStore.user;
  
  if (!user?.isAdmin) {
    return false;
  }
  
  const requiredPermission = to.meta.permission as string;
  if (requiredPermission && !hasPermission(user, requiredPermission, 'read')) {
    return false;
  }
  
  return true;
};
```

### 📊 Store de Administração

#### Estado Global
```typescript
const adminStore = useAdminStore();

// Estatísticas do dashboard
const stats = adminStore.dashboardStats;
const growth = adminStore.statsGrowth;

// Atividades recentes
const activities = adminStore.recentActivities;
const activitiesByType = adminStore.activitiesByType;

// Usuários administrativos
const adminUsers = adminStore.adminUsers;
const usersByRole = adminStore.adminUsersByRole;
```

#### Ações Principais
```typescript
// Carregar dados do dashboard
await adminStore.loadDashboardStats();
await adminStore.loadRecentActivities();

// Gestão de usuários admin
const newUser = await adminStore.createAdminUser(userData);
await adminStore.updateUserPermissions(userId, permissions);

// Sistema e manutenção
const health = await adminStore.getSystemHealth();
await adminStore.clearCache('all');
await adminStore.backupDatabase();
```

## Funcionalidades Avançadas

### 🔍 Sistema de Busca e Filtros

#### Busca Inteligente
```typescript
const searchProducts = (query: string, products: Product[]) => {
  const searchTerms = query.toLowerCase().split(' ');
  
  return products.filter(product => {
    const searchableText = [
      product.name,
      product.description,
      product.category,
      ...product.tags,
    ].join(' ').toLowerCase();
    
    return searchTerms.every(term => 
      searchableText.includes(term)
    );
  });
};
```

#### Filtros Avançados
```vue
<FilterDropdown
  v-model="activeFilters"
  :options="[
    { value: 'active', label: 'Ativos', count: 45 },
    { value: 'photobook', label: 'Photobooks', count: 23 },
    { value: 'premium', label: 'Premium', count: 12 },
  ]"
  multiple
  @change="applyFilters"
/>
```

### 📈 Analytics e Relatórios

#### Métricas de Performance
```typescript
interface PerformanceMetrics {
  // Produtos
  topSellingProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  
  // Templates
  mostUsedTemplates: Array<{
    id: string;
    name: string;
    usage: number;
    rating: number;
  }>;
  
  // Conversão
  conversionFunnel: {
    visitors: number;
    projectsStarted: number;
    projectsCompleted: number;
    ordersPlaced: number;
  };
  
  // Receita
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    orders: number;
  }>;
}
```

#### Exportação de Dados
```typescript
// Exportar relatórios
const exportReport = async (type: string, filters: any) => {
  const blob = await adminStore.exportData(type, filters);
  
  // Download automático
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
};
```

### 🔄 Ações em Lote

#### Seleção Múltipla
```vue
<BulkActionsBar
  :selected-count="selectedItems.length"
  :actions="[
    { id: 'activate', label: 'Ativar', icon: '✅' },
    { id: 'deactivate', label: 'Desativar', icon: '❌' },
    { id: 'delete', label: 'Excluir', icon: '🗑️', variant: 'danger' },
  ]"
  @action="handleBulkAction"
  @clear="clearSelection"
/>
```

#### Processamento em Lote
```typescript
const handleBulkAction = async (actionId: string) => {
  const selectedIds = selectedItems.value.map(item => item.id);
  
  switch (actionId) {
    case 'activate':
      await productsStore.bulkUpdateProducts(selectedIds, { status: 'active' });
      break;
    case 'delete':
      await productsStore.bulkDeleteProducts(selectedIds);
      break;
  }
  
  // Atualizar lista e limpar seleção
  await loadProducts();
  clearSelection();
};
```

## Otimizações e Performance

### 🚀 Lazy Loading

#### Componentes Assíncronos
```typescript
// Carregamento sob demanda
const ProductsManagement = defineAsyncComponent(() => 
  import('@/components/admin/ProductsManagement.vue')
);

const TemplatesManagement = defineAsyncComponent(() => 
  import('@/components/admin/TemplatesManagement.vue')
);
```

#### Paginação Inteligente
```typescript
const usePagination = (items: Ref<any[]>, pageSize: number = 20) => {
  const currentPage = ref(1);
  
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize;
    const end = start + pageSize;
    return items.value.slice(start, end);
  });
  
  const totalPages = computed(() => 
    Math.ceil(items.value.length / pageSize)
  );
  
  return {
    currentPage,
    paginatedItems,
    totalPages,
  };
};
```

### 💾 Cache Inteligente

#### Cache de Dados
```typescript
// Cache com TTL
const useCache = <T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000) => {
  const cached = ref<T | null>(null);
  const lastFetch = ref<number>(0);
  
  const fetch = async (): Promise<T> => {
    const now = Date.now();
    
    if (cached.value && (now - lastFetch.value) < ttl) {
      return cached.value;
    }
    
    cached.value = await fetcher();
    lastFetch.value = now;
    
    return cached.value;
  };
  
  return { data: cached, fetch };
};
```

#### Invalidação de Cache
```typescript
// Invalidar cache após operações
const invalidateCache = (keys: string[]) => {
  keys.forEach(key => {
    cacheStore.delete(key);
  });
};

// Após criar produto
await createProduct(productData);
invalidateCache(['products', 'dashboard-stats']);
```

## Testes e Qualidade

### 🧪 Testes de Componentes

#### Testes Unitários
```typescript
describe('ProductsManagement', () => {
  it('should load products on mount', async () => {
    const wrapper = mount(ProductsManagement);
    
    await nextTick();
    
    expect(mockProductsStore.loadProducts).toHaveBeenCalled();
  });
  
  it('should filter products by search query', async () => {
    const wrapper = mount(ProductsManagement);
    
    await wrapper.find('[data-testid="search-input"]').setValue('photobook');
    
    expect(wrapper.vm.filteredProducts).toHaveLength(2);
  });
});
```

#### Testes de Integração
```typescript
describe('Admin Dashboard Integration', () => {
  it('should update stats after product creation', async () => {
    const wrapper = mount(AdminDashboard);
    
    // Simular criação de produto
    await wrapper.vm.handleProductCreated(mockProduct);
    
    // Verificar se stats foram atualizadas
    expect(mockAdminStore.refreshStats).toHaveBeenCalled();
  });
});
```

### 📊 Monitoramento

#### Métricas de Performance
```typescript
// Monitorar tempo de carregamento
const measureLoadTime = (operation: string) => {
  const start = performance.now();
  
  return () => {
    const end = performance.now();
    const duration = end - start;
    
    // Enviar métrica
    analytics.track('admin_performance', {
      operation,
      duration,
      timestamp: new Date(),
    });
  };
};

// Uso
const endMeasure = measureLoadTime('load_products');
await loadProducts();
endMeasure();
```

#### Error Tracking
```typescript
// Capturar erros do admin
const handleAdminError = (error: Error, context: string) => {
  // Log estruturado
  console.error(`Admin Error [${context}]:`, error);
  
  // Enviar para serviço de monitoramento
  errorTracker.captureException(error, {
    tags: {
      component: 'admin',
      context,
    },
    user: authStore.user,
  });
  
  // Notificar usuário
  notificationStore.addNotification({
    type: 'error',
    title: 'Erro no painel administrativo',
    message: 'Ocorreu um erro inesperado. Nossa equipe foi notificada.',
  });
};
```

## Segurança

### 🔒 Validação de Dados

#### Sanitização de Inputs
```typescript
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};
```

#### Validação de Permissões
```typescript
const validatePermission = (action: string, resource: string) => {
  const user = authStore.user;
  
  if (!user?.isAdmin) {
    throw new Error('Acesso negado: usuário não é administrador');
  }
  
  if (!hasPermission(user, resource, action)) {
    throw new Error(`Acesso negado: sem permissão para ${action} em ${resource}`);
  }
};
```

### 🛡️ Auditoria

#### Log de Ações
```typescript
const logAdminAction = async (action: string, resource: string, data?: any) => {
  await auditStore.createLog({
    userId: authStore.user.id,
    action,
    resource,
    data: sanitizeLogData(data),
    timestamp: new Date(),
    ip: await getClientIP(),
    userAgent: navigator.userAgent,
  });
};

// Uso
await logAdminAction('create', 'product', productData);
```

## Deploy e Configuração

### 🚀 Build de Produção

#### Otimizações
```javascript
// vite.config.ts - Admin específico
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'admin-core': [
            './src/views/admin/AdminDashboard.vue',
            './src/stores/admin.ts',
          ],
          'admin-products': [
            './src/components/admin/ProductsManagement.vue',
            './src/stores/products.ts',
          ],
          'admin-templates': [
            './src/components/admin/TemplatesManagement.vue',
            './src/stores/templates.ts',
          ],
        },
      },
    },
  },
});
```

#### Variáveis de Ambiente
```bash
# .env.production
VITE_ADMIN_API_URL=https://api.editor.com/admin
VITE_ADMIN_UPLOAD_MAX_SIZE=50MB
VITE_ADMIN_CACHE_TTL=300000
VITE_ADMIN_ANALYTICS_ID=GA-ADMIN-123
```

### 📋 Checklist de Deploy

- [ ] Testes unitários passando
- [ ] Testes de integração passando
- [ ] Build de produção sem erros
- [ ] Variáveis de ambiente configuradas
- [ ] Permissões de usuário validadas
- [ ] Cache configurado
- [ ] Monitoramento ativo
- [ ] Backup de dados realizado

## Troubleshooting

### 🐛 Problemas Comuns

#### Performance Lenta
```typescript
// Verificar queries N+1
const loadProductsWithVariants = async () => {
  // ❌ N+1 queries
  const products = await getProducts();
  for (const product of products) {
    product.variants = await getVariants(product.id);
  }
  
  // ✅ Query única
  const productsWithVariants = await getProductsWithVariants();
};
```

#### Memória Alta
```typescript
// Limpar referências não utilizadas
onUnmounted(() => {
  // Limpar timers
  clearInterval(statsRefreshTimer);
  
  // Limpar event listeners
  window.removeEventListener('resize', handleResize);
  
  // Limpar cache local
  localCache.clear();
});
```

### 📞 Suporte

Para problemas técnicos ou dúvidas sobre o painel administrativo:

1. Verificar logs de erro no console
2. Consultar documentação da API
3. Verificar permissões do usuário
4. Contatar equipe de desenvolvimento

## Roadmap

### 🔮 Próximas Funcionalidades

- [ ] Dashboard customizável com widgets
- [ ] Relatórios avançados com gráficos
- [ ] Automações e workflows
- [ ] Integração com ferramentas externas
- [ ] API pública para integrações
- [ ] Mobile app para administradores