<template>
  <div class="products-catalog">
    <!-- Header -->
    <div class="catalog-header">
      <div class="header-info">
        <h2>🛍️ Catálogo de Produtos</h2>
        <p>Gerencie os produtos que aparecem no site</p>
      </div>
      <div class="header-actions">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="🔍 Buscar produtos..." 
          class="search-input"
        />
        <select v-model="filterType" class="filter-select">
          <option value="">Todos os tipos</option>
          <option value="photobook">📖 Álbuns</option>
          <option value="case">🎁 Estojos</option>
          <option value="calendar">📅 Calendários</option>
        </select>
        <select v-model="filterStatus" class="filter-select">
          <option value="">Todos os status</option>
          <option value="published">🌐 Publicados</option>
          <option value="draft">📝 Rascunhos</option>
        </select>
        <button class="btn-primary" @click="openCreateModal">
          ➕ Novo Produto
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando produtos...</p>
    </div>

    <!-- Products Grid -->
    <div v-else-if="filteredProducts.length > 0" class="products-grid">
      <div 
        v-for="product in filteredProducts" 
        :key="product.id" 
        class="product-card"
        :class="{ 'is-published': product.isPublished }"
      >
        <!-- Product Image -->
        <div class="product-image" :style="getImageStyle(product)">
          <div class="product-badges">
            <span v-if="product.badge" class="badge badge-promo">{{ product.badge }}</span>
            <span v-if="product.isPublished" class="badge badge-published">🌐 Publicado</span>
            <span v-else class="badge badge-draft">📝 Rascunho</span>
          </div>
        </div>

        <!-- Product Info -->
        <div class="product-info">
          <div class="product-header">
            <h3>{{ product.name }}</h3>
            <span class="product-type">{{ getTypeLabel(product.type) }}</span>
          </div>
          
          <p class="product-description">{{ product.shortDescription || product.description }}</p>
          
          <div class="product-pricing">
            <div class="price-main">
              <span class="price-label">Preço base</span>
              <span class="price-value">R$ {{ formatPrice(product.basePrice) }}</span>
            </div>
            <div v-if="product.basePagesIncluded > 0" class="price-detail">
              {{ product.basePagesIncluded }} páginas incluídas
            </div>
            <div v-if="product.pricePerExtraPage > 0" class="price-detail">
              +R$ {{ formatPrice(product.pricePerExtraPage) }}/página extra
            </div>
          </div>

          <div class="product-meta">
            <span v-if="product.hasCase" class="meta-item">🎁 Estojo disponível</span>
            <span v-if="product.formats?.length" class="meta-item">📐 {{ product.formats.length }} formatos</span>
            <span v-if="product.papers?.length" class="meta-item">📜 {{ product.papers.length }} papéis</span>
          </div>
        </div>

        <!-- Product Actions -->
        <div class="product-actions">
          <button class="btn-action" @click="editProduct(product)" title="Editar">
            ✏️ Editar
          </button>
          <button 
            class="btn-action" 
            :class="product.isPublished ? 'btn-unpublish' : 'btn-publish'"
            @click="togglePublish(product)"
            :title="product.isPublished ? 'Despublicar' : 'Publicar'"
          >
            {{ product.isPublished ? '📝 Despublicar' : '🌐 Publicar' }}
          </button>
          <button class="btn-action" @click="duplicateProduct(product)" title="Duplicar">
            📋 Duplicar
          </button>
          <button class="btn-action btn-danger" @click="confirmDelete(product)" title="Excluir">
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>Nenhum produto encontrado</h3>
      <p>{{ searchQuery ? 'Tente ajustar os filtros de busca' : 'Comece criando seu primeiro produto' }}</p>
      <button v-if="!searchQuery" class="btn-primary" @click="openCreateModal">
        Criar Primeiro Produto
      </button>
    </div>

    <!-- Product Form Modal -->
    <ProductFormModal
      v-if="showModal"
      :product="selectedProduct"
      :mode="modalMode"
      @save="handleSave"
      @close="closeModal"
    />

    <!-- Delete Confirmation -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
      <div class="confirm-dialog">
        <h3>⚠️ Confirmar Exclusão</h3>
        <p>Tem certeza que deseja excluir o produto "{{ productToDelete?.name }}"?</p>
        <p class="warning">Esta ação não pode ser desfeita.</p>
        <div class="confirm-actions">
          <button class="btn-secondary" @click="showDeleteConfirm = false">Cancelar</button>
          <button class="btn-danger" @click="deleteProduct">Excluir</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ProductFormModal from './ProductFormModal.vue'

interface Product {
  id: string
  name: string
  slug: string
  type: string
  category: string
  description: string
  shortDescription: string
  basePrice: number
  basePagesIncluded: number
  pricePerExtraPage: number
  pricePerExtraSpread: number
  minPages: number
  maxPages: number
  pageIncrement: number
  features: string[]
  specs: any[]
  hasCase: boolean
  casePrice: number
  caseDescription: string
  imageUrl: string
  thumbnailUrl: string
  galleryImages: string[]
  badge: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  sortOrder: number
  isActive: boolean
  isPublished: boolean
  formats: any[]
  papers: any[]
  coverTypes: any[]
}

const authStore = useAuthStore()
const loading = ref(true)
const products = ref<Product[]>([])
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedProduct = ref<Product | null>(null)
const showDeleteConfirm = ref(false)
const productToDelete = ref<Product | null>(null)

// Computed
const filteredProducts = computed(() => {
  let result = products.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query) ||
      p.shortDescription?.toLowerCase().includes(query)
    )
  }

  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value)
  }

  if (filterStatus.value === 'published') {
    result = result.filter(p => p.isPublished)
  } else if (filterStatus.value === 'draft') {
    result = result.filter(p => !p.isPublished)
  }

  return result
})

// Methods
const formatPrice = (price: number) => {
  return price?.toFixed(2).replace('.', ',') || '0,00'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    photobook: '📖 Álbum',
    calendar: '📅 Calendário',
    card: '💌 Cartão',
    poster: '🖼️ Poster',
    case: '🎁 Estojo',
  }
  return labels[type] || type
}

const getImageStyle = (product: Product) => {
  if (product.imageUrl || product.thumbnailUrl) {
    return {
      backgroundImage: `url(${product.thumbnailUrl || product.imageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }
  }
  const gradients: Record<string, string> = {
    casamento: 'linear-gradient(135deg, #D4775C, #E8956F)',
    ensaio: 'linear-gradient(135deg, #7C9A92, #9BB5AE)',
    newborn: 'linear-gradient(135deg, #B8A398, #D4C4B5)',
    estojo: 'linear-gradient(135deg, #8B7355, #A68B5B)',
  }
  return { background: gradients[product.category] || 'linear-gradient(135deg, #6B6560, #9A958E)' }
}

const loadProducts = async () => {
  loading.value = true
  try {
    const token = authStore.token
    const response = await fetch('/api/v1/products', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (response.ok) {
      const responseData = await response.json()
      // API retorna: { success, data: { products: [...] } } ou { products: [...] }
      const data = responseData.data || responseData
      products.value = data.products || data || []
      console.log('✅ Produtos carregados:', products.value.length)
    }
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  selectedProduct.value = null
  modalMode.value = 'create'
  showModal.value = true
}

const editProduct = (product: Product) => {
  selectedProduct.value = product
  modalMode.value = 'edit'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedProduct.value = null
}

const handleSave = async (productData: any) => {
  try {
    const token = authStore.token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    console.log('Enviando dados do produto:', productData)

    let response
    if (modalMode.value === 'create') {
      response = await fetch('/api/v1/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
      })
    } else {
      response = await fetch(`/api/v1/products/${selectedProduct.value?.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(productData)
      })
    }

    if (response.ok) {
      closeModal()
      await loadProducts()
      alert(modalMode.value === 'create' ? 'Produto criado com sucesso!' : 'Produto atualizado com sucesso!')
    } else {
      const error = await response.json()
      console.error('Erro da API:', error)
      const errorMessage = Array.isArray(error.message) 
        ? error.message.join(', ') 
        : (error.message || 'Falha ao salvar produto')
      alert(`Erro: ${errorMessage}`)
    }
  } catch (error) {
    console.error('Erro ao salvar produto:', error)
    alert('Erro ao salvar produto: ' + (error as Error).message)
  }
}

const togglePublish = async (product: Product) => {
  try {
    const token = authStore.token
    const endpoint = product.isPublished ? 'unpublish' : 'publish'
    const response = await fetch(`/api/v1/products/${product.id}/${endpoint}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      await loadProducts()
      alert(product.isPublished ? 'Produto despublicado!' : 'Produto publicado!')
    }
  } catch (error) {
    console.error('Erro ao alterar publicação:', error)
  }
}

const duplicateProduct = async (product: Product) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/products/${product.id}/duplicate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      await loadProducts()
      alert('Produto duplicado com sucesso!')
    }
  } catch (error) {
    console.error('Erro ao duplicar produto:', error)
  }
}

const confirmDelete = (product: Product) => {
  productToDelete.value = product
  showDeleteConfirm.value = true
}

const deleteProduct = async () => {
  if (!productToDelete.value) return

  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/products/${productToDelete.value.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      showDeleteConfirm.value = false
      productToDelete.value = null
      await loadProducts()
      alert('Produto excluído com sucesso!')
    }
  } catch (error) {
    console.error('Erro ao excluir produto:', error)
  }
}

onMounted(() => {
  loadProducts()
})
</script>

<style scoped>
.products-catalog {
  padding: 0;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  gap: 24px;
  flex-wrap: wrap;
}

.header-info h2 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.header-info p {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-input {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 200px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
}

.btn-primary {
  padding: 10px 20px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.product-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.2s;
}

.product-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.product-card.is-published {
  border-color: #22c55e;
}

.product-image {
  height: 160px;
  position: relative;
}

.product-badges {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 11px;
  font-weight: 600;
}

.badge-promo {
  background: #fef3c7;
  color: #92400e;
}

.badge-published {
  background: #dcfce7;
  color: #166534;
}

.badge-draft {
  background: #f3f4f6;
  color: #6b7280;
}

.product-info {
  padding: 16px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.product-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.product-type {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 4px;
}

.product-description {
  margin: 0 0 12px 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-pricing {
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.price-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.price-label {
  font-size: 0.75rem;
  color: #6b7280;
}

.price-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #059669;
}

.price-detail {
  font-size: 0.75rem;
  color: #9ca3af;
}

.product-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 0.75rem;
  color: #6b7280;
}

.product-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-action {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f3f4f6;
}

.btn-publish {
  border-color: #22c55e;
  color: #166534;
}

.btn-publish:hover {
  background: #dcfce7;
}

.btn-unpublish {
  border-color: #f59e0b;
  color: #92400e;
}

.btn-unpublish:hover {
  background: #fef3c7;
}

.btn-danger {
  border-color: #ef4444;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fee2e2;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: #f9fafb;
  border-radius: 12px;
  border: 2px dashed #e5e7eb;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #6b7280;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.confirm-dialog {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
}

.confirm-dialog h3 {
  margin: 0 0 12px 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.confirm-dialog p {
  margin: 0 0 8px 0;
  color: #6b7280;
}

.confirm-dialog .warning {
  color: #dc2626;
  font-size: 0.875rem;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.btn-secondary {
  flex: 1;
  padding: 10px 20px;
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

.confirm-actions .btn-danger {
  flex: 1;
  padding: 10px 20px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
}

.confirm-actions .btn-danger:hover {
  background: #b91c1c;
}

/* Responsive */
@media (max-width: 768px) {
  .catalog-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }

  .products-grid {
    grid-template-columns: 1fr;
  }

  .product-actions {
    flex-wrap: wrap;
  }
}
</style>
