<template>
  <div class="products-management">
    <!-- Header -->
    <div class="management-header">
      <div class="header-content">
        <h1>Gestão de Produtos</h1>
        <p>Gerencie produtos e variantes do catálogo</p>
      </div>
      
      <div class="header-actions">
        <SearchInput
          v-model="searchQuery"
          placeholder="Buscar produtos..."
          @search="handleSearch"
        />
        
        <FilterDropdown
          v-model="activeFilters"
          :options="filterOptions"
          @change="handleFilterChange"
        />
        
        <button 
          class="btn-primary"
          @click="openCreateModal"
        >
          <PlusIcon class="w-5 h-5" />
          Novo Produto
        </button>
      </div>
    </div>
    
    <!-- Products Grid -->
    <div class="products-grid">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
        @edit="openEditModal"
        @delete="confirmDelete"
        @duplicate="duplicateProduct"
        @toggle-status="toggleProductStatus"
        @manage-variants="openVariantsModal"
      />
      
      <!-- Empty State -->
      <div v-if="filteredProducts.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Nenhum produto encontrado</h3>
        <p>{{ searchQuery ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro produto' }}</p>
        <button 
          v-if="!searchQuery"
          class="btn-primary"
          @click="openCreateModal"
        >
          Criar Primeiro Produto
        </button>
      </div>
    </div>
    
    <!-- Pagination -->
    <Pagination
      v-if="totalPages > 1"
      :current-page="currentPage"
      :total-pages="totalPages"
      :total-items="totalProducts"
      @page-change="handlePageChange"
    />
    
    <!-- Create/Edit Modal -->
    <ProductModal
      v-if="showProductModal"
      :product="selectedProduct"
      :mode="modalMode"
      @save="handleProductSave"
      @close="closeProductModal"
    />
    
    <!-- Variants Modal -->
    <VariantsModal
      v-if="showVariantsModal"
      :product="selectedProduct"
      @save="handleVariantsSave"
      @close="closeVariantsModal"
    />
    
    <!-- Delete Confirmation -->
    <ConfirmDialog
      v-if="showDeleteDialog"
      title="Excluir Produto"
      :message="`Tem certeza que deseja excluir '${selectedProduct?.name}'? Esta ação não pode ser desfeita.`"
      confirm-text="Excluir"
      confirm-variant="danger"
      @confirm="handleDelete"
      @cancel="closeDeleteDialog"
    />
    
    <!-- Bulk Actions -->
    <BulkActionsBar
      v-if="selectedProductIds.length > 0"
      :selected-count="selectedProductIds.length"
      :actions="bulkActions"
      @action="handleBulkAction"
      @clear="clearSelection"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProductsStore } from '@/stores/products';
import { useNotificationStore } from '@/stores/notifications';

// Components
import SearchInput from '@/components/common/SearchInput.vue';
import FilterDropdown from '@/components/common/FilterDropdown.vue';
import ProductCard from '@/components/admin/ProductCard.vue';
import Pagination from '@/components/common/Pagination.vue';
import ProductModal from '@/components/admin/ProductModal.vue';
import VariantsModal from '@/components/admin/VariantsModal.vue';
import ConfirmDialog from '@/components/common/ConfirmDialog.vue';
import BulkActionsBar from '@/components/admin/BulkActionsBar.vue';

// Emits
const emit = defineEmits<{
  'product-created': [product: any];
  'product-updated': [product: any];
  'product-deleted': [product: any];
}>();

// Stores
const productsStore = useProductsStore();
const notificationStore = useNotificationStore();

// Estado
const searchQuery = ref('');
const activeFilters = ref<string[]>([]);
const currentPage = ref(1);
const selectedProductIds = ref<string[]>([]);

// Modals
const showProductModal = ref(false);
const showVariantsModal = ref(false);
const showDeleteDialog = ref(false);
const selectedProduct = ref<any>(null);
const modalMode = ref<'create' | 'edit'>('create');

// Computed
const products = computed(() => productsStore.products);
const totalProducts = computed(() => productsStore.totalProducts);
const totalPages = computed(() => Math.ceil(totalProducts.value / 20));

const filteredProducts = computed(() => {
  let filtered = products.value;
  
  // Aplicar busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(product => 
      product.name.toLowerCase().includes(query) ||
      product.description?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query)
    );
  }
  
  // Aplicar filtros
  if (activeFilters.value.length > 0) {
    filtered = filtered.filter(product => {
      return activeFilters.value.every(filter => {
        switch (filter) {
          case 'active':
            return product.status === 'active';
          case 'inactive':
            return product.status === 'inactive';
          case 'photobook':
            return product.type === 'photobook';
          case 'calendar':
            return product.type === 'calendar';
          case 'card':
            return product.type === 'card';
          default:
            return true;
        }
      });
    });
  }
  
  return filtered;
});

const filterOptions = computed(() => [
  { value: 'active', label: 'Ativos', count: products.value.filter(p => p.status === 'active').length },
  { value: 'inactive', label: 'Inativos', count: products.value.filter(p => p.status === 'inactive').length },
  { value: 'photobook', label: 'Photobooks', count: products.value.filter(p => p.type === 'photobook').length },
  { value: 'calendar', label: 'Calendários', count: products.value.filter(p => p.type === 'calendar').length },
  { value: 'card', label: 'Cartões', count: products.value.filter(p => p.type === 'card').length },
]);

const bulkActions = computed(() => [
  { id: 'activate', label: 'Ativar Selecionados', icon: '✅' },
  { id: 'deactivate', label: 'Desativar Selecionados', icon: '❌' },
  { id: 'delete', label: 'Excluir Selecionados', icon: '🗑️', variant: 'danger' },
  { id: 'export', label: 'Exportar Selecionados', icon: '📤' },
]);

// Métodos
const loadProducts = async (): Promise<void> => {
  try {
    await productsStore.loadProducts({
      page: currentPage.value,
      limit: 20,
      search: searchQuery.value,
      filters: activeFilters.value,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao carregar produtos',
      message: 'Não foi possível carregar a lista de produtos',
    });
  }
};

const handleSearch = (): void => {
  currentPage.value = 1;
  loadProducts();
};

const handleFilterChange = (): void => {
  currentPage.value = 1;
  loadProducts();
};

const handlePageChange = (page: number): void => {
  currentPage.value = page;
  loadProducts();
};

const openCreateModal = (): void => {
  selectedProduct.value = null;
  modalMode.value = 'create';
  showProductModal.value = true;
};

const openEditModal = (product: any): void => {
  selectedProduct.value = product;
  modalMode.value = 'edit';
  showProductModal.value = true;
};

const closeProductModal = (): void => {
  showProductModal.value = false;
  selectedProduct.value = null;
};

const handleProductSave = async (productData: any): Promise<void> => {
  try {
    let product;
    
    if (modalMode.value === 'create') {
      product = await productsStore.createProduct(productData);
      emit('product-created', product);
    } else {
      product = await productsStore.updateProduct(selectedProduct.value.id, productData);
      emit('product-updated', product);
    }
    
    closeProductModal();
    await loadProducts();
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao salvar produto',
      message: 'Não foi possível salvar o produto. Tente novamente.',
    });
  }
};

const confirmDelete = (product: any): void => {
  selectedProduct.value = product;
  showDeleteDialog.value = true;
};

const closeDeleteDialog = (): void => {
  showDeleteDialog.value = false;
  selectedProduct.value = null;
};

const handleDelete = async (): Promise<void> => {
  try {
    await productsStore.deleteProduct(selectedProduct.value.id);
    emit('product-deleted', selectedProduct.value);
    closeDeleteDialog();
    await loadProducts();
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao excluir produto',
      message: 'Não foi possível excluir o produto. Tente novamente.',
    });
  }
};

const duplicateProduct = async (product: any): Promise<void> => {
  try {
    const duplicatedProduct = await productsStore.duplicateProduct(product.id);
    emit('product-created', duplicatedProduct);
    await loadProducts();
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Produto duplicado',
      message: `${duplicatedProduct.name} foi criado com sucesso`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao duplicar produto',
      message: 'Não foi possível duplicar o produto. Tente novamente.',
    });
  }
};

const toggleProductStatus = async (product: any): Promise<void> => {
  try {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    await productsStore.updateProduct(product.id, { status: newStatus });
    emit('product-updated', { ...product, status: newStatus });
    await loadProducts();
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro ao alterar status',
      message: 'Não foi possível alterar o status do produto.',
    });
  }
};

const openVariantsModal = (product: any): void => {
  selectedProduct.value = product;
  showVariantsModal.value = true;
};

const closeVariantsModal = (): void => {
  showVariantsModal.value = false;
  selectedProduct.value = null;
};

const handleVariantsSave = async (): Promise<void> => {
  closeVariantsModal();
  await loadProducts();
};

const handleBulkAction = async (actionId: string): Promise<void> => {
  try {
    switch (actionId) {
      case 'activate':
        await productsStore.bulkUpdateProducts(selectedProductIds.value, { status: 'active' });
        break;
      case 'deactivate':
        await productsStore.bulkUpdateProducts(selectedProductIds.value, { status: 'inactive' });
        break;
      case 'delete':
        await productsStore.bulkDeleteProducts(selectedProductIds.value);
        break;
      case 'export':
        await productsStore.exportProducts(selectedProductIds.value);
        break;
    }
    
    clearSelection();
    await loadProducts();
    
    notificationStore.addNotification({
      type: 'success',
      title: 'Ação executada',
      message: `Ação "${actionId}" executada com sucesso`,
    });
  } catch (error) {
    notificationStore.addNotification({
      type: 'error',
      title: 'Erro na ação em lote',
      message: 'Não foi possível executar a ação selecionada.',
    });
  }
};

const clearSelection = (): void => {
  selectedProductIds.value = [];
};

// Watchers
watch([searchQuery, activeFilters], () => {
  handleSearch();
}, { debounce: 300 });

// Lifecycle
onMounted(() => {
  loadProducts();
});
</script>

<style scoped>
.products-management {
  space-y: 6;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content h1 {
  font-size: 1.875rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.header-content p {
  color: #4a5568;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  border: 2px dashed #e2e8f0;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #4a5568;
  margin-bottom: 1.5rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

/* Responsivo */
@media (max-width: 1024px) {
  .management-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    flex-wrap: wrap;
  }
  
  .products-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .products-grid {
    grid-template-columns: 1fr;
  }
}
</style>