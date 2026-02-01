<template>
  <div class="product-config-management">
    <div class="header">
      <div class="header-info">
        <h2>🔗 Configuração de Produtos</h2>
        <p>Vincule formatos, papéis e tipos de capa aos produtos</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando configurações...</p>
    </div>

    <!-- Products List -->
    <div v-else class="products-list">
      <div 
        v-for="product in products" 
        :key="product.id"
        class="product-card"
      >
        <div class="product-header">
          <h3>{{ product.name }}</h3>
          <span class="product-type">{{ product.type }}</span>
        </div>

        <div class="product-config">
          <!-- Formatos -->
          <div class="config-section">
            <h4>📐 Formatos ({{ product.formats?.length || 0 }})</h4>
            <div class="config-items">
              <div 
                v-for="format in product.formats" 
                :key="format.id"
                class="config-item"
              >
                <span>{{ format.name }} ({{ format.width }}×{{ format.height }}mm)</span>
                <button @click="removeFormatFromProduct(product.id, format.id)" class="btn-remove">×</button>
              </div>
              <button @click="showAddFormatModal(product)" class="btn-add">+ Adicionar Formato</button>
            </div>
          </div>

          <!-- Papéis -->
          <div class="config-section">
            <h4>📜 Papéis ({{ product.productPapers?.length || 0 }})</h4>
            <div class="config-items">
              <div 
                v-for="pp in product.productPapers" 
                :key="pp.id"
                class="config-item"
              >
                <span>{{ pp.paper.name }} ({{ pp.paper.weight }}g/m²)</span>
                <span class="price-adjustment">{{ formatPrice(pp.priceAdjustment) }}</span>
                <button @click="removePaperFromProduct(product.id, pp.paperId)" class="btn-remove">×</button>
              </div>
              <button @click="showAddPaperModal(product)" class="btn-add">+ Adicionar Papel</button>
            </div>
          </div>

          <!-- Tipos de Capa -->
          <div class="config-section">
            <h4>📕 Tipos de Capa ({{ product.productCoverTypes?.length || 0 }})</h4>
            <div class="config-items">
              <div 
                v-for="pct in product.productCoverTypes" 
                :key="pct.id"
                class="config-item"
              >
                <span>{{ pct.coverType.name }} ({{ pct.coverType.type }})</span>
                <span class="price-adjustment">{{ formatPrice(pct.priceAdjustment) }}</span>
                <button @click="removeCoverTypeFromProduct(product.id, pct.coverTypeId)" class="btn-remove">×</button>
              </div>
              <button @click="showAddCoverTypeModal(product)" class="btn-add">+ Adicionar Tipo de Capa</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Adicionar Formato -->
    <div v-if="showFormatModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Adicionar Formato ao Produto</h3>
          <button @click="closeModals" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Produto:</strong> {{ selectedProduct?.name }}</p>
          <div class="form-group">
            <label>Selecione os formatos:</label>
            <div class="checkbox-list">
              <label v-for="format in availableFormats" :key="format.id" class="checkbox-item">
                <input 
                  type="checkbox" 
                  :value="format.id" 
                  v-model="selectedFormats"
                >
                <span>{{ format.name }} ({{ format.width }}×{{ format.height }}mm)</span>
              </label>
            </div>
          </div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-cancel">Cancelar</button>
            <button @click="addFormatsToProduct" class="btn-save" :disabled="selectedFormats.length === 0">
              Adicionar {{ selectedFormats.length }} formato(s)
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Adicionar Papel -->
    <div v-if="showPaperModal" class="modal-overlay" @click.self="closePaperModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Adicionar Papel ao Produto</h3>
          <button @click="closePaperModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Produto:</strong> {{ selectedProduct?.name }}</p>
          <div class="form-group">
            <label>Papel:</label>
            <select v-model="selectedPaperId" required>
              <option value="">Selecione um papel...</option>
              <option v-for="paper in availablePapers" :key="paper.id" :value="paper.id">
                {{ paper.name }} ({{ paper.weight }}g/m²)
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Ajuste de Preço (R$):</label>
            <input v-model.number="paperPriceAdjustment" type="number" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="checkbox-item">
              <input type="checkbox" v-model="paperIsDefault">
              <span>Papel padrão para este produto</span>
            </label>
          </div>
          <div class="modal-actions">
            <button @click="closePaperModal" class="btn-cancel">Cancelar</button>
            <button @click="addPaperToProduct" class="btn-save" :disabled="!selectedPaperId">
              Adicionar Papel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para Adicionar Tipo de Capa -->
    <div v-if="showCoverTypeModal" class="modal-overlay" @click.self="closeCoverTypeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Adicionar Tipo de Capa ao Produto</h3>
          <button @click="closeCoverTypeModal" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Produto:</strong> {{ selectedProduct?.name }}</p>
          <div class="form-group">
            <label>Tipo de Capa:</label>
            <select v-model="selectedCoverTypeId" required>
              <option value="">Selecione um tipo de capa...</option>
              <option v-for="coverType in availableCoverTypes" :key="coverType.id" :value="coverType.id">
                {{ coverType.name }} ({{ coverType.type }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Ajuste de Preço (R$):</label>
            <input v-model.number="coverTypePriceAdjustment" type="number" step="0.01" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="checkbox-item">
              <input type="checkbox" v-model="coverTypeIsDefault">
              <span>Tipo de capa padrão para este produto</span>
            </label>
          </div>
          <div class="modal-actions">
            <button @click="closeCoverTypeModal" class="btn-cancel">Cancelar</button>
            <button @click="addCoverTypeToProduct" class="btn-save" :disabled="!selectedCoverTypeId">
              Adicionar Tipo de Capa
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface Product {
  id: string
  name: string
  type: string
  formats?: any[]
  productPapers?: any[]
  productCoverTypes?: any[]
}

const authStore = useAuthStore()
const loading = ref(true)
const products = ref<Product[]>([])
const formats = ref<any[]>([])
const papers = ref<any[]>([])
const coverTypes = ref<any[]>([])

// Modal states
const showFormatModal = ref(false)
const showPaperModal = ref(false)
const showCoverTypeModal = ref(false)
const selectedProduct = ref<Product | null>(null)
const selectedFormats = ref<string[]>([])
const selectedPaperId = ref('')
const selectedCoverTypeId = ref('')
const paperPriceAdjustment = ref(0)
const coverTypePriceAdjustment = ref(0)
const paperIsDefault = ref(false)
const coverTypeIsDefault = ref(false)

const availableFormats = ref<any[]>([])
const availablePapers = ref<any[]>([])
const availableCoverTypes = ref<any[]>([])

const formatPrice = (price: number) => {
  return price?.toFixed(2).replace('.', ',') || '0,00'
}

const loadData = async () => {
  loading.value = true
  try {
    const token = authStore.token
    const headers = { 'Authorization': `Bearer ${token}` }

    const [productsRes, formatsRes, papersRes, coverTypesRes] = await Promise.all([
      fetch('/api/v1/products', { headers }),
      fetch('/api/v1/formats', { headers }),
      fetch('/api/v1/papers', { headers }),
      fetch('/api/v1/cover-types', { headers })
    ])

    if (productsRes.ok) {
      const responseData = await productsRes.json()
      // API retorna: { success, data: { products: [...] } }
      const data = responseData.data || responseData
      products.value = data.products || data || []
      console.log('✅ Produtos carregados:', products.value.length)
    }

    if (formatsRes.ok) {
      const responseData = await formatsRes.json()
      const data = responseData.data || responseData
      formats.value = data.formats || data || []
      console.log('✅ Formatos carregados:', formats.value.length)
    }

    if (papersRes.ok) {
      const responseData = await papersRes.json()
      const data = responseData.data || responseData
      papers.value = data.papers || data || []
      console.log('✅ Papéis carregados:', papers.value.length)
    }

    if (coverTypesRes.ok) {
      const responseData = await coverTypesRes.json()
      const data = responseData.data || responseData
      coverTypes.value = data.coverTypes || data || []
      console.log('✅ Tipos de capa carregados:', coverTypes.value.length)
    }

  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
}

const showAddFormatModal = (product: Product) => {
  selectedProduct.value = product
  // Filtrar formatos que ainda não estão vinculados ao produto
  const productFormatIds = product.formats?.map(f => f.id) || []
  availableFormats.value = formats.value.filter(f => !productFormatIds.includes(f.id))
  selectedFormats.value = []
  showFormatModal.value = true
}

const showAddPaperModal = (product: Product) => {
  selectedProduct.value = product
  // Filtrar papéis que ainda não estão vinculados ao produto
  const productPaperIds = product.productPapers?.map(pp => pp.paperId) || []
  availablePapers.value = papers.value.filter(p => !productPaperIds.includes(p.id))
  selectedPaperId.value = ''
  paperPriceAdjustment.value = 0
  paperIsDefault.value = false
  showPaperModal.value = true
}

const showAddCoverTypeModal = (product: Product) => {
  selectedProduct.value = product
  // Filtrar tipos de capa que ainda não estão vinculados ao produto
  const productCoverTypeIds = product.productCoverTypes?.map(pct => pct.coverTypeId) || []
  availableCoverTypes.value = coverTypes.value.filter(ct => !productCoverTypeIds.includes(ct.id))
  selectedCoverTypeId.value = ''
  coverTypePriceAdjustment.value = 0
  coverTypeIsDefault.value = false
  showCoverTypeModal.value = true
}

const closeModals = () => {
  showFormatModal.value = false
  showPaperModal.value = false
  showCoverTypeModal.value = false
  selectedProduct.value = null
}

const closePaperModal = () => {
  showPaperModal.value = false
  selectedProduct.value = null
}

const closeCoverTypeModal = () => {
  showCoverTypeModal.value = false
  selectedProduct.value = null
}

const addFormatsToProduct = async () => {
  if (!selectedProduct.value || selectedFormats.value.length === 0) return

  try {
    const token = authStore.token
    for (const formatId of selectedFormats.value) {
      await fetch(`/api/v1/products/${selectedProduct.value.id}/formats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formatId })
      })
    }
    
    closeModals()
    await loadData()
    alert(`${selectedFormats.value.length} formato(s) adicionado(s) com sucesso!`)
  } catch (error) {
    console.error('Erro ao adicionar formatos:', error)
    alert('Erro ao adicionar formatos')
  }
}

const addPaperToProduct = async () => {
  if (!selectedProduct.value || !selectedPaperId.value) return

  try {
    const token = authStore.token
    await fetch(`/api/v1/products/${selectedProduct.value.id}/papers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paperId: selectedPaperId.value,
        priceAdjustment: paperPriceAdjustment.value,
        isDefault: paperIsDefault.value
      })
    })
    
    closePaperModal()
    await loadData()
    alert('Papel adicionado com sucesso!')
  } catch (error) {
    console.error('Erro ao adicionar papel:', error)
    alert('Erro ao adicionar papel')
  }
}

const addCoverTypeToProduct = async () => {
  if (!selectedProduct.value || !selectedCoverTypeId.value) return

  try {
    const token = authStore.token
    await fetch(`/api/v1/products/${selectedProduct.value.id}/cover-types`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coverTypeId: selectedCoverTypeId.value,
        priceAdjustment: coverTypePriceAdjustment.value,
        isDefault: coverTypeIsDefault.value
      })
    })
    
    closeCoverTypeModal()
    await loadData()
    alert('Tipo de capa adicionado com sucesso!')
  } catch (error) {
    console.error('Erro ao adicionar tipo de capa:', error)
    alert('Erro ao adicionar tipo de capa')
  }
}

const removeFormatFromProduct = async (productId: string, formatId: string) => {
  if (!confirm('Remover este formato do produto?')) return

  try {
    const token = authStore.token
    await fetch(`/api/v1/products/${productId}/formats/${formatId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    await loadData()
    alert('Formato removido com sucesso!')
  } catch (error) {
    console.error('Erro ao remover formato:', error)
    alert('Erro ao remover formato')
  }
}

const removePaperFromProduct = async (productId: string, paperId: string) => {
  if (!confirm('Remover este papel do produto?')) return

  try {
    const token = authStore.token
    await fetch(`/api/v1/products/${productId}/papers/${paperId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    await loadData()
    alert('Papel removido com sucesso!')
  } catch (error) {
    console.error('Erro ao remover papel:', error)
    alert('Erro ao remover papel')
  }
}

const removeCoverTypeFromProduct = async (productId: string, coverTypeId: string) => {
  if (!confirm('Remover este tipo de capa do produto?')) return

  try {
    const token = authStore.token
    await fetch(`/api/v1/products/${productId}/cover-types/${coverTypeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    await loadData()
    alert('Tipo de capa removido com sucesso!')
  } catch (error) {
    console.error('Erro ao remover tipo de capa:', error)
    alert('Erro ao remover tipo de capa')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.product-config-management {
  padding: 0;
}

.header {
  margin-bottom: 24px;
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

.products-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.product-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}

.product-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.product-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.product-type {
  padding: 4px 12px;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.product-config {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.config-section h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #374151;
}

.config-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.price-adjustment {
  color: #059669;
  font-weight: 600;
}

.btn-remove {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  font-size: 0.75rem;
}

.btn-add {
  padding: 8px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-add:hover {
  background: #1d4ed8;
}

/* Modal */
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

.modal-content {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
}

.checkbox-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
}

.checkbox-item input {
  width: 16px;
  height: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #f3f4f6;
}

.btn-save {
  background: #2563eb;
  color: white;
  border: none;
}

.btn-save:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>