<template>
  <div class="covers-management">
    <div class="header">
      <div class="header-info">
        <h2>📕 Tipos de Capa</h2>
        <p>Gerencie os tipos de capa disponíveis para os produtos</p>
      </div>
      <button @click="openCreateModal" class="btn-primary">
        ➕ Nova Capa
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando tipos de capa...</p>
    </div>

    <!-- Covers Grid -->
    <div v-else-if="coverTypes.length > 0" class="covers-grid">
      <div 
        v-for="cover in coverTypes" 
        :key="cover.id"
        class="cover-card"
        :class="{ inactive: !cover.isActive }"
      >
        <div class="cover-header">
          <h3>{{ cover.name }}</h3>
          <span class="badge" :class="cover.isActive ? 'active' : 'inactive'">
            {{ cover.isActive ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <div class="cover-details">
          <div class="detail-row">
            <span class="label">Tipo:</span>
            <span class="value">{{ getTypeLabel(cover.type) }}</span>
          </div>
          <div v-if="cover.material" class="detail-row">
            <span class="label">Material:</span>
            <span class="value">{{ cover.material }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Tolerância Lombada:</span>
            <span class="value">{{ cover.bindingTolerance }}mm</span>
          </div>
        </div>

        <div class="cover-pricing">
          <span class="price-label">Preço</span>
          <span class="price-value">R$ {{ formatPrice(cover.price) }}</span>
        </div>

        <p v-if="cover.description" class="cover-description">{{ cover.description }}</p>

        <div class="cover-actions">
          <button @click="editCover(cover)" class="btn-edit">✏️ Editar</button>
          <button @click="toggleActive(cover)" class="btn-toggle">
            {{ cover.isActive ? '❌ Desativar' : '✅ Ativar' }}
          </button>
          <button @click="deleteCover(cover)" class="btn-delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <div class="empty-icon">📕</div>
      <h3>Nenhum tipo de capa cadastrado</h3>
      <p>Comece criando seu primeiro tipo de capa</p>
      <button class="btn-primary" @click="openCreateModal">Criar Tipo de Capa</button>
    </div>

    <!-- Modal de Criação/Edição -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingCover ? 'Editar Tipo de Capa' : 'Novo Tipo de Capa' }}</h3>
          <button @click="closeModal" class="btn-close">×</button>
        </div>

        <form @submit.prevent="saveCover" class="cover-form">
          <div class="form-group">
            <label>Nome *</label>
            <input v-model="formData.name" type="text" required placeholder="Ex: Capa Dura Premium">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Tipo *</label>
              <select v-model="formData.type" required>
                <option value="soft">Flexível</option>
                <option value="hard">Dura</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div class="form-group">
              <label>Material</label>
              <select v-model="formData.material">
                <option value="">Selecione...</option>
                <option value="papel">Papel</option>
                <option value="couro">Couro Sintético</option>
                <option value="tecido">Tecido</option>
                <option value="madeira">Madeira</option>
                <option value="linho">Linho</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Preço (R$) *</label>
              <input v-model.number="formData.price" type="number" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Tolerância Lombada (mm)</label>
              <input v-model.number="formData.bindingTolerance" type="number" step="0.1" min="0">
            </div>
          </div>

          <div class="form-group">
            <label>Descrição</label>
            <textarea v-model="formData.description" rows="3" placeholder="Descrição do tipo de capa..."></textarea>
          </div>

          <div class="form-group">
            <label>URL da Imagem</label>
            <input v-model="formData.imageUrl" type="url" placeholder="https://...">
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" v-model="formData.isActive">
              Tipo de capa ativo
            </label>
          </div>

          <div class="form-actions">
            <button type="button" @click="closeModal" class="btn-cancel">Cancelar</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface CoverType {
  id: string
  name: string
  type: string
  material: string
  bindingTolerance: number
  price: number
  description: string
  imageUrl: string
  isActive: boolean
}

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const coverTypes = ref<CoverType[]>([])
const showModal = ref(false)
const editingCover = ref<CoverType | null>(null)

const formData = ref({
  name: '',
  type: 'hard',
  material: '',
  bindingTolerance: 0,
  price: 0,
  description: '',
  imageUrl: '',
  isActive: true
})

const formatPrice = (price: number) => {
  return price?.toFixed(2).replace('.', ',') || '0,00'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    soft: 'Flexível',
    hard: 'Dura',
    premium: 'Premium'
  }
  return labels[type] || type
}

const loadCoverTypes = async () => {
  loading.value = true
  try {
    const token = authStore.token
    console.log('🔄 Carregando tipos de capa...')
    const response = await fetch('/api/v1/cover-types', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    console.log('📡 Response status:', response.status)
    if (response.ok) {
      const responseData = await response.json()
      console.log('📦 Dados recebidos:', responseData)
      // API retorna: { success, data: { coverTypes: [...] } } ou { coverTypes: [...] }
      const data = responseData.data || responseData
      coverTypes.value = data.coverTypes || data || []
      console.log('✅ Tipos de capa carregados:', coverTypes.value.length)
    } else {
      console.error('❌ Erro na resposta:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('❌ Erro ao carregar tipos de capa:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingCover.value = null
  resetForm()
  showModal.value = true
}

const editCover = (cover: CoverType) => {
  editingCover.value = cover
  formData.value = { ...cover }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingCover.value = null
  resetForm()
}

const resetForm = () => {
  formData.value = {
    name: '',
    type: 'hard',
    material: '',
    bindingTolerance: 0,
    price: 0,
    description: '',
    imageUrl: '',
    isActive: true
  }
}

const saveCover = async () => {
  saving.value = true
  try {
    const token = authStore.token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // Preparar payload com valores numéricos corretos
    const payload = {
      ...formData.value,
      price: Number(formData.value.price),
      bindingTolerance: Number(formData.value.bindingTolerance || 0)
    }

    // Remover material se estiver vazio
    if (!payload.material) {
      delete payload.material
    }

    console.log('📤 Enviando tipo de capa:', payload)

    let response
    if (editingCover.value) {
      response = await fetch(`/api/v1/cover-types/${editingCover.value.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      })
    } else {
      response = await fetch('/api/v1/cover-types', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
    }

    const responseData = await response.json()
    console.log('📥 Resposta:', response.status, responseData)

    if (response.ok) {
      closeModal()
      await loadCoverTypes()
      alert(editingCover.value ? 'Tipo de capa atualizado!' : 'Tipo de capa criado!')
    } else {
      const errorMsg = responseData.error?.message || responseData.message || 'Falha ao salvar'
      console.error('❌ Erro:', responseData)
      alert(`Erro: ${errorMsg}`)
    }
  } catch (error) {
    console.error('Erro ao salvar:', error)
    alert('Erro ao salvar tipo de capa')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (cover: CoverType) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/cover-types/${cover.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: !cover.isActive })
    })

    if (response.ok) {
      await loadCoverTypes()
    }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
  }
}

const deleteCover = async (cover: CoverType) => {
  if (!confirm(`Excluir tipo de capa "${cover.name}"?`)) return

  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/cover-types/${cover.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      await loadCoverTypes()
      alert('Tipo de capa excluído!')
    }
  } catch (error) {
    console.error('Erro ao excluir:', error)
  }
}

onMounted(() => {
  loadCoverTypes()
})
</script>

<style scoped>
.covers-management {
  padding: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

/* Grid */
.covers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.cover-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s;
}

.cover-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cover-card.inactive {
  opacity: 0.6;
}

.cover-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.cover-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.badge {
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge.active {
  background: #dcfce7;
  color: #166534;
}

.badge.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.cover-details {
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.detail-row .label {
  color: #6b7280;
}

.detail-row .value {
  font-weight: 500;
  color: #1f2937 !important;
}

.cover-pricing {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 12px;
}

.price-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.price-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #059669;
}

.cover-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.cover-actions {
  display: flex;
  gap: 8px;
}

.cover-actions button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit:hover {
  background: #eff6ff;
  border-color: #2563eb;
}

.btn-toggle:hover {
  background: #f3f4f6;
}

.btn-delete {
  border-color: #ef4444 !important;
  color: #dc2626;
}

.btn-delete:hover {
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

.cover-form {
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
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-group input {
  width: 18px;
  height: 18px;
}

.form-actions {
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
