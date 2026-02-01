<template>
  <div class="formats-management">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>Gestão de Formatos</h1>
        <p>Crie e gerencie formatos de produtos</p>
      </div>

      <button class="btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '❌ Cancelar' : '✨ Criar Novo Formato' }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="formatsStore.isLoading" class="loading">⏳ Carregando formatos...</div>

    <!-- Error -->
    <div v-if="formatsStore.error" class="error-message">❌ {{ formatsStore.error }}</div>

    <!-- Formulário de Criação/Edição -->
    <div v-if="showCreateForm" class="create-form">
      <h2>{{ editingFormatId ? '✏️ Editar Formato' : '✨ Criar Novo Formato' }}</h2>

      <form @submit.prevent="handleCreate">
        <div class="form-grid">
          <div class="form-group">
            <label>Produto *</label>
            <select v-model="newFormat.productId" required>
              <option value="">Selecione...</option>
              <option v-for="p in productTypes" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Nome do Formato *</label>
            <input v-model="newFormat.name" type="text" placeholder="Ex: Quadrado 20x20cm" required />
          </div>

          <div class="form-group">
            <label>Largura (mm) *</label>
            <input v-model.number="newFormat.width" type="number" min="50" max="1000" required />
          </div>

          <div class="form-group">
            <label>Altura (mm) *</label>
            <input v-model.number="newFormat.height" type="number" min="50" max="1000" required />
          </div>

          <div class="form-group">
            <label>Orientação</label>
            <select v-model="newFormat.orientation">
              <option value="square">Quadrado</option>
              <option value="portrait">Retrato</option>
              <option value="landscape">Paisagem</option>
            </select>
          </div>

          <div class="form-group">
            <label>Páginas Mínimas</label>
            <input v-model.number="newFormat.minPages" type="number" min="1" />
          </div>

          <div class="form-group">
            <label>Páginas Máximas</label>
            <input v-model.number="newFormat.maxPages" type="number" min="1" />
          </div>

          <div class="form-group">
            <label>Incremento de Páginas</label>
            <input v-model.number="newFormat.pageIncrement" type="number" min="1" />
          </div>

          <div class="form-group">
            <label>Sangria (mm)</label>
            <input v-model.number="newFormat.bleed" type="number" min="0" step="0.5" />
          </div>

          <div class="form-group">
            <label>Margem Segura (mm)</label>
            <input v-model.number="newFormat.safeMargin" type="number" min="0" step="0.5" />
          </div>

          <div class="form-group">
            <label>💰 Preço Base (R$) *</label>
            <input 
              v-model.number="newFormat.basePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="299.90"
            />
            <small>Preço do formato com {{ newFormat.minPages }} páginas incluídas</small>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="newFormat.isActive" />
              <strong>Formato Ativo</strong>
            </label>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="resetForm">Limpar</button>
          <button type="submit" class="btn-primary" :disabled="isCreating">
            {{ isCreating ? '⏳ Salvando...' : editingFormatId ? '✅ Atualizar' : '✅ Criar' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Formatos -->
    <div class="formats-section">
      <div class="section-header">
        <h2>Formatos Cadastrados ({{ formats.length }})</h2>
      </div>

      <div v-if="formats.length > 0" class="formats-grid">
        <div v-for="format in formats" :key="format.id" class="format-card">
          <div class="format-header">
            <h3>{{ format.name }}</h3>
            <span :class="['status-badge', format.isActive ? 'active' : 'inactive']">
              {{ format.isActive ? 'Ativo' : 'Inativo' }}
            </span>
          </div>

          <div class="format-preview">
            <div
              class="format-shape"
              :style="{
                width: Math.min(format.width / 2, 150) + 'px',
                height: Math.min(format.height / 2, 150) + 'px',
              }"
            >
              {{ format.width }}×{{ format.height }}mm
            </div>
          </div>

          <div class="format-details">
            <div class="detail-row highlight">
              <span>💰 Preço:</span>
              <strong>R$ {{ (format.basePrice || 0).toFixed(2).replace('.', ',') }}</strong>
            </div>
            <div class="detail-row">
              <span>Páginas:</span>
              <strong>{{ format.minPages }} - {{ format.maxPages }}</strong>
            </div>
            <div class="detail-row">
              <span>Incremento:</span>
              <strong>{{ format.pageIncrement }} págs (lâminas)</strong>
            </div>
            <div class="detail-row">
              <span>Orientação:</span>
              <strong>{{ format.orientation }}</strong>
            </div>
          </div>

          <div class="format-actions">
            <button class="btn-action" @click="editFormat(format)">✏️ Editar</button>
            <button class="btn-action danger" @click="deleteFormat(format)">🗑️ Excluir</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📐</div>
        <h3>Nenhum formato encontrado</h3>
        <p>Crie seu primeiro formato clicando no botão acima</p>
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
import { useFormatsStore, type AlbumFormat } from '@/stores/formats'
import { useProductTypesStore } from '@/stores/productTypes'

const formatsStore = useFormatsStore()
const productTypesStore = useProductTypesStore()

// Carregar dados ao montar
onMounted(async () => {
  console.log('🔄 Carregando formatos e produtos...')
  await Promise.all([formatsStore.fetchFormats(), productTypesStore.fetchProductTypes()])
})

// Estado
const showCreateForm = ref(false)
const isCreating = ref(false)
const editingFormatId = ref<string | null>(null)
const notification = ref<{ type: string; message: string } | null>(null)

const newFormat = reactive({
  productId: '',
  name: '',
  width: 200,
  height: 200,
  orientation: 'square',
  minPages: 20,
  maxPages: 100,
  pageIncrement: 2,
  bleed: 3,
  safeMargin: 5,
  gutterMargin: 10,
  basePrice: 0,
  priceMultiplier: 1.0,
  isActive: true,
})

// Computed
const formats = computed(() => formatsStore.formats)
const productTypes = computed(() => productTypesStore.productTypes)

// Métodos
const handleCreate = async () => {
  if (!newFormat.name || !newFormat.productId) {
    showNotification('error', 'Preencha todos os campos obrigatórios')
    return
  }

  isCreating.value = true

  try {
    if (editingFormatId.value) {
      await formatsStore.updateFormat(editingFormatId.value, { ...newFormat })
      showNotification('success', `Formato "${newFormat.name}" atualizado!`)
    } else {
      const result = await formatsStore.addFormat({ ...newFormat })
      if (result) {
        showNotification('success', `Formato "${newFormat.name}" criado!`)
      } else {
        showNotification('error', 'Erro ao criar formato - verifique o console')
        return
      }
    }
    resetForm()
    showCreateForm.value = false
    await formatsStore.fetchFormats()
  } catch (error: any) {
    console.error('Erro ao salvar formato:', error)
    showNotification('error', error.message || 'Erro ao salvar formato')
  } finally {
    isCreating.value = false
  }
}

const editFormat = (format: AlbumFormat) => {
  newFormat.productId = format.productId
  newFormat.name = format.name
  newFormat.width = format.width
  newFormat.height = format.height
  newFormat.orientation = format.orientation
  newFormat.minPages = format.minPages
  newFormat.maxPages = format.maxPages
  newFormat.pageIncrement = format.pageIncrement
  newFormat.bleed = format.bleed
  newFormat.safeMargin = format.safeMargin
  newFormat.basePrice = format.basePrice || 0
  newFormat.priceMultiplier = format.priceMultiplier
  newFormat.isActive = format.isActive
  editingFormatId.value = format.id
  showCreateForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const deleteFormat = async (format: AlbumFormat) => {
  if (!confirm(`Excluir "${format.name}"?`)) return
  await formatsStore.deleteFormat(format.id)
  showNotification('success', 'Formato excluído')
  await formatsStore.fetchFormats()
}

const resetForm = () => {
  newFormat.productId = ''
  newFormat.name = ''
  newFormat.width = 200
  newFormat.height = 200
  newFormat.orientation = 'square'
  newFormat.minPages = 20
  newFormat.maxPages = 100
  newFormat.pageIncrement = 2
  newFormat.bleed = 3
  newFormat.safeMargin = 5
  newFormat.basePrice = 0
  newFormat.priceMultiplier = 1.0
  newFormat.isActive = true
  editingFormatId.value = null
}

const showNotification = (type: string, message: string) => {
  notification.value = { type, message }
  setTimeout(() => (notification.value = null), 4000)
}
</script>

<style scoped>
.formats-management {
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.form-group input:focus,
.form-group select:focus {
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

.formats-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
}

.section-header h2 {
  margin: 0 0 1.5rem 0;
}

.formats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.format-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s;
}

.format-card:hover {
  border-color: #3b82f6;
}

.format-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.format-header h3 {
  margin: 0;
  font-size: 1.125rem;
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

.format-preview {
  display: flex;
  justify-content: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.format-shape {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
}

.format-details {
  margin-bottom: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.875rem;
}

.detail-row span {
  color: #6b7280;
}

.detail-row.highlight {
  background: #fef3c7;
  margin: -0.5rem -0.5rem 0.5rem -0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  border-bottom: none;
}

.detail-row.highlight strong {
  color: #d97706;
  font-size: 1rem;
}

.format-actions {
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
