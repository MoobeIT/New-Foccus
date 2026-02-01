<template>
  <div class="product-types-management">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>Gestão de Produtos</h1>
        <p>Crie e gerencie os produtos disponíveis no sistema</p>
      </div>

      <button class="btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '❌ Cancelar' : '✨ Criar Novo Produto' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="productTypesStore.isLoading" class="loading">
      ⏳ Carregando produtos...
    </div>

    <!-- Error -->
    <div v-if="productTypesStore.error" class="error-message">
      ❌ {{ productTypesStore.error }}
    </div>

    <!-- Formulário de Criação/Edição -->
    <div v-if="showCreateForm" class="create-form">
      <h2>{{ editingTypeId ? '✏️ Editar Produto' : '✨ Criar Novo Produto' }}</h2>

      <form @submit.prevent="handleCreate">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome do Produto *</label>
            <input v-model="newType.name" type="text" placeholder="Ex: Fotolivro Profissional" required />
          </div>

          <div class="form-group">
            <label>Tipo *</label>
            <select v-model="newType.type" required>
              <option value="">Selecione...</option>
              <option value="photobook">Fotolivro</option>
              <option value="calendar">Calendário</option>
              <option value="card">Cartão</option>
              <option value="poster">Poster</option>
            </select>
          </div>

          <div class="form-group">
            <label>Preço Base (R$) *</label>
            <input v-model.number="newType.basePrice" type="number" step="0.01" min="0" placeholder="50.00" required />
          </div>

          <div class="form-group full-width">
            <label>Descrição</label>
            <textarea v-model="newType.description" rows="3" placeholder="Descreva o produto..."></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newType.isActive" />
              <strong>Produto Ativo</strong>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="resetForm">Limpar</button>
          <button type="submit" class="btn-primary" :disabled="isCreating">
            {{ isCreating ? '⏳ Salvando...' : editingTypeId ? '✅ Atualizar' : '✅ Criar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Produtos -->
    <div class="types-section">
      <div class="section-header">
        <h2>Produtos Cadastrados ({{ productTypes.length }})</h2>
      </div>

      <div v-if="productTypes.length > 0" class="types-grid">
        <div v-for="product in productTypes" :key="product.id" class="type-card">
          <div class="type-header">
            <span class="type-icon">{{ getTypeIcon(product.type) }}</span>
            <div class="type-title">
              <h3>{{ product.name }}</h3>
              <span :class="['status-badge', product.isActive ? 'active' : 'inactive']">
                {{ product.isActive ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
          </div>

          <p class="type-description">{{ product.description || 'Sem descrição' }}</p>

          <div class="type-stats">
            <div class="stat-item">
              <strong>R$ {{ product.basePrice?.toFixed(2) || '0.00' }}</strong>
              <span>Preço Base</span>
            </div>
            <div class="stat-item">
              <strong>{{ product.type }}</strong>
              <span>Tipo</span>
            </div>
          </div>

          <div class="type-actions">
            <button class="btn-action" @click="editType(product)">✏️ Editar</button>
            <button class="btn-action danger" @click="deleteType(product)">🗑️ Excluir</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>Nenhum produto encontrado</h3>
        <p>Crie seu primeiro produto clicando no botão acima</p>
      </div>
    </div>

    <!-- Notificação -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useProductTypesStore, type ProductType } from '@/stores/productTypes'

const productTypesStore = useProductTypesStore()

// Carregar dados ao montar
onMounted(async () => {
  console.log('🔄 Carregando produtos...')
  await productTypesStore.fetchProductTypes()
})

// Estado
const showCreateForm = ref(false)
const isCreating = ref(false)
const editingTypeId = ref<string | null>(null)
const notification = ref<{ type: string; message: string } | null>(null)

const newType = reactive({
  name: '',
  type: 'photobook',
  description: '',
  basePrice: 50,
  isActive: true,
})

// Computed
const productTypes = computed(() => productTypesStore.productTypes)

// Métodos
const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    photobook: '📖',
    calendar: '📅',
    card: '💌',
    poster: '🖼️',
  }
  return icons[type] || '📦'
}

const handleCreate = async () => {
  if (!newType.name || !newType.type) {
    showNotification('error', 'Preencha todos os campos obrigatórios')
    return
  }

  isCreating.value = true

  try {
    if (editingTypeId.value) {
      await productTypesStore.updateProductType(editingTypeId.value, { ...newType })
      showNotification('success', `Produto "${newType.name}" atualizado!`)
    } else {
      await productTypesStore.addProductType({ ...newType })
      showNotification('success', `Produto "${newType.name}" criado!`)
    }
    resetForm()
    showCreateForm.value = false
    await productTypesStore.fetchProductTypes()
  } catch (error) {
    showNotification('error', 'Erro ao salvar produto')
  } finally {
    isCreating.value = false
  }
}

const editType = (product: ProductType) => {
  newType.name = product.name
  newType.type = product.type
  newType.description = product.description || ''
  newType.basePrice = product.basePrice
  newType.isActive = product.isActive
  editingTypeId.value = product.id
  showCreateForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteType = async (product: ProductType) => {
  if (!confirm(`Excluir "${product.name}"?`)) return
  await productTypesStore.deleteProductType(product.id)
  showNotification('success', 'Produto excluído')
  await productTypesStore.fetchProductTypes()
}

const resetForm = () => {
  newType.name = ''
  newType.type = 'photobook'
  newType.description = ''
  newType.basePrice = 50
  newType.isActive = true
  editingTypeId.value = null
}

const showNotification = (type: string, message: string) => {
  notification.value = { type, message }
  setTimeout(() => (notification.value = null), 4000)
}
</script>

<style scoped>
.product-types-management {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header h1 {
  margin: 0 0 0.5rem 0;
  color: #111827;
}

.header p {
  color: #6b7280;
  margin: 0;
}

.loading,
.error-message {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  text-align: center;
}

.loading {
  background: #eff6ff;
  color: #1e40af;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
}

.create-form {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
}

.create-form h2 {
  margin: 0 0 1.5rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.types-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.section-header h2 {
  margin: 0 0 1.5rem 0;
}

.types-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.type-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.type-card:hover {
  border-color: #3b82f6;
}

.type-header {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.type-icon {
  font-size: 2.5rem;
}

.type-title h3 {
  margin: 0 0 0.5rem 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.active {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.type-description {
  color: #6b7280;
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
}

.type-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-item strong {
  display: block;
  font-size: 1.25rem;
  color: #1e40af;
}

.stat-item span {
  font-size: 0.75rem;
  color: #6b7280;
}

.type-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary,
.btn-secondary,
.btn-action {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-action {
  flex: 1;
  padding: 0.5rem;
  background: #f3f4f6;
  color: #374151;
}

.btn-action.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  z-index: 1000;
}

.notification.success {
  background: #10b981;
  color: white;
}

.notification.error {
  background: #ef4444;
  color: white;
}
</style>
