<template>
  <div class="papers-management">
    <!-- Header -->
    <div class="section-header">
      <div class="header-content">
        <div class="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
            <polyline points="14,2 14,8 20,8"/>
          </svg>
        </div>
        <div class="header-info">
          <h1 class="section-title">Gerenciamento de Papéis</h1>
          <p class="section-description">Configure os tipos de papel disponíveis para os produtos</p>
        </div>
      </div>
      <button @click="openCreateModal" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
        </svg>
        Novo Papel
      </button>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-container">
        <svg class="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd"/>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar papéis..."
          class="input search-input"
        >
      </div>
      <select v-model="filterType" class="select filter-select">
        <option value="">Todos os tipos</option>
        <option value="photo">Fotográfico</option>
        <option value="coated">Couchê</option>
        <option value="matte">Fosco</option>
        <option value="recycled">Reciclado</option>
      </select>
    </div>

    <!-- Content -->
    <div class="content-section">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">Carregando papéis...</p>
      </div>

      <!-- Papers Grid -->
      <div v-else-if="filteredPapers.length > 0" class="papers-grid">
        <div 
          v-for="paper in filteredPapers" 
          :key="paper.id"
          class="paper-card card"
          :class="{ 'card-inactive': !paper.isActive }"
        >
          <div class="card-header">
            <div class="paper-header">
              <h3 class="paper-name">{{ paper.name }}</h3>
              <span class="badge" :class="paper.isActive ? 'badge-success' : 'badge-gray'">
                {{ paper.isActive ? 'Ativo' : 'Inativo' }}
              </span>
            </div>
          </div>

          <div class="card-body">
            <div class="paper-specs">
              <div class="spec-item">
                <span class="spec-label">Gramatura</span>
                <span class="spec-value">{{ paper.weight }}g/m²</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Acabamento</span>
                <span class="spec-value">{{ getFinishLabel(paper.finish) }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Tipo</span>
                <span class="spec-value">{{ getTypeLabel(paper.type) }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Laminação</span>
                <span class="spec-value">{{ getLaminationLabel(paper.lamination) }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Espessura</span>
                <span class="spec-value">{{ paper.thickness }}mm</span>
              </div>
            </div>

            <div class="paper-pricing">
              <div class="pricing-content">
                <span class="pricing-label">Preço por página</span>
                <span class="pricing-value">R$ {{ formatPrice(paper.pricePerPage) }}</span>
              </div>
            </div>

            <p v-if="paper.description" class="paper-description">{{ paper.description }}</p>
          </div>

          <div class="card-footer">
            <div class="paper-actions">
              <button @click="editPaper(paper)" class="btn btn-sm btn-secondary">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M11 2a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1h8zM3 3v8h8V3H3z"/>
                  <path d="M5 5h4v1H5V5zM5 7h4v1H5V7zM5 9h2v1H5V9z"/>
                </svg>
                Editar
              </button>
              <button @click="toggleActive(paper)" class="btn btn-sm" :class="paper.isActive ? 'btn-warning' : 'btn-success'">
                <svg v-if="paper.isActive" width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M7 0a7 7 0 100 14A7 7 0 007 0zM5.5 4.5L7 6l1.5-1.5L10 6l-1.5 1.5L10 9l-1.5-1.5L7 9 5.5 7.5 4 9l1.5-1.5L4 6l1.5 1.5z"/>
                </svg>
                <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M7 0a7 7 0 100 14A7 7 0 007 0zm3.5 5L6 9.5 3.5 7 5 5.5l1 1 3-3L10.5 5z"/>
                </svg>
                {{ paper.isActive ? 'Desativar' : 'Ativar' }}
              </button>
              <button @click="deletePaper(paper)" class="btn btn-sm btn-danger">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M5.5 1a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1h3a.5.5 0 010 1h-.5v8a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 013 11V3h-.5a.5.5 0 010-1h3V1z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="12" fill="var(--gray-100)"/>
            <path d="M20 24h24v16H20z" fill="var(--gray-300)"/>
            <path d="M22 26h20v12H22z" fill="var(--gray-200)"/>
          </svg>
        </div>
        <h3 class="empty-title">Nenhum papel cadastrado</h3>
        <p class="empty-description">Comece criando seu primeiro tipo de papel para usar nos produtos</p>
        <button class="btn btn-primary" @click="openCreateModal">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2a.5.5 0 01.5.5v5h5a.5.5 0 010 1h-5v5a.5.5 0 01-1 0v-5h-5a.5.5 0 010-1h5v-5A.5.5 0 018 2z"/>
          </svg>
          Criar Primeiro Papel
        </button>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingPaper ? 'Editar Papel' : 'Novo Papel' }}</h3>
          <button @click="closeModal" class="modal-close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>

        <form @submit.prevent="savePaper" class="modal-body">
          <div class="form-grid">
            <div class="form-group full-width">
              <label class="form-label">Nome do Papel *</label>
              <input v-model="formData.name" type="text" required placeholder="Ex: Fotográfico Brilhante 230g" class="input">
            </div>

            <div class="form-group">
              <label class="form-label">Tipo *</label>
              <select v-model="formData.type" required class="select">
                <option value="photo">Fotográfico</option>
                <option value="coated">Couchê</option>
                <option value="matte">Fosco</option>
                <option value="recycled">Reciclado</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Gramatura (g/m²) *</label>
              <input v-model.number="formData.weight" type="number" min="1" required class="input">
            </div>

            <div class="form-group">
              <label class="form-label">Acabamento *</label>
              <select v-model="formData.finish" required class="select">
                <option value="glossy">Brilhante</option>
                <option value="matte">Fosco</option>
                <option value="satin">Acetinado</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Laminação</label>
              <select v-model="formData.lamination" class="select">
                <option value="none">Sem laminação</option>
                <option value="matte">Fosca</option>
                <option value="glossy">Brilhante</option>
                <option value="soft_touch">Soft-touch</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Espessura (mm) *</label>
              <input v-model.number="formData.thickness" type="number" step="0.01" min="0" required class="input">
            </div>

            <div class="form-group">
              <label class="form-label">Preço por Página (R$) *</label>
              <input v-model.number="formData.pricePerPage" type="number" step="0.01" min="0" required class="input">
            </div>

            <div class="form-group full-width">
              <label class="form-label">Descrição</label>
              <textarea v-model="formData.description" rows="3" placeholder="Descrição do papel..." class="textarea"></textarea>
            </div>

            <div class="form-group full-width">
              <label class="checkbox-label">
                <input type="checkbox" v-model="formData.isActive" class="checkbox">
                <span class="checkbox-text">Papel ativo</span>
              </label>
            </div>
          </div>
        </form>

        <div class="modal-footer">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancelar</button>
          <button type="submit" @click="savePaper" class="btn btn-primary" :disabled="saving">
            <div v-if="saving" class="spinner spinner-sm"></div>
            {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface Paper {
  id: string
  name: string
  type: string
  weight: number
  thickness: number
  finish: string
  lamination: string
  pricePerPage: number
  description: string
  isActive: boolean
}

const authStore = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const papers = ref<Paper[]>([])
const searchQuery = ref('')
const filterType = ref('')
const showModal = ref(false)
const editingPaper = ref<Paper | null>(null)

const formData = ref({
  name: '',
  type: 'photo',
  weight: 230,
  thickness: 0.25,
  finish: 'glossy',
  lamination: 'none',
  pricePerPage: 0.80,
  description: '',
  isActive: true
})

const filteredPapers = computed(() => {
  let result = papers.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  if (filterType.value) {
    result = result.filter(p => p.type === filterType.value)
  }

  return result
})

const formatPrice = (price: number) => {
  return price?.toFixed(2).replace('.', ',') || '0,00'
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    photo: 'Fotográfico',
    coated: 'Couchê',
    matte: 'Fosco',
    recycled: 'Reciclado'
  }
  return labels[type] || type
}

const getFinishLabel = (finish: string) => {
  const labels: Record<string, string> = {
    glossy: 'Brilhante',
    matte: 'Fosco',
    satin: 'Acetinado'
  }
  return labels[finish] || finish
}

const getLaminationLabel = (lamination: string) => {
  const labels: Record<string, string> = {
    none: 'Sem laminação',
    matte: 'Fosca',
    glossy: 'Brilhante',
    soft_touch: 'Soft-touch'
  }
  return labels[lamination] || lamination
}

const loadPapers = async () => {
  loading.value = true
  try {
    const token = authStore.token
    const response = await fetch('/api/v1/papers', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (response.ok) {
      const responseData = await response.json()
      // A API retorna: { success, data: { papers: [...] } }
      const data = responseData.data || responseData
      papers.value = data.papers || data || []
      console.log('✅ Papéis carregados:', papers.value.length)
    }
  } catch (error) {
    console.error('Erro ao carregar papéis:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  editingPaper.value = null
  resetForm()
  showModal.value = true
}

const editPaper = (paper: Paper) => {
  editingPaper.value = paper
  formData.value = { ...paper }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPaper.value = null
  resetForm()
}

const resetForm = () => {
  formData.value = {
    name: '',
    type: 'photo',
    weight: 230,
    thickness: 0.25,
    finish: 'glossy',
    lamination: 'none',
    pricePerPage: 0.80,
    description: '',
    isActive: true
  }
}

const savePaper = async () => {
  saving.value = true
  try {
    const token = authStore.token
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // Garantir que os valores numéricos são números
    const payload = {
      ...formData.value,
      weight: Number(formData.value.weight),
      thickness: Number(formData.value.thickness),
      pricePerPage: Number(formData.value.pricePerPage)
    }

    console.log('📤 Enviando papel:', payload)

    let response
    if (editingPaper.value) {
      response = await fetch(`/api/v1/papers/${editingPaper.value.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload)
      })
    } else {
      response = await fetch('/api/v1/papers', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
    }

    const responseData = await response.json()
    console.log('📥 Resposta:', response.status, responseData)

    if (response.ok) {
      closeModal()
      await loadPapers()
      alert(editingPaper.value ? 'Papel atualizado!' : 'Papel criado!')
    } else {
      const errorMsg = responseData.error?.message || responseData.message || 'Falha ao salvar'
      console.error('❌ Erro:', responseData)
      alert(`Erro: ${errorMsg}`)
    }
  } catch (error) {
    console.error('Erro ao salvar:', error)
    alert('Erro ao salvar papel')
  } finally {
    saving.value = false
  }
}

const toggleActive = async (paper: Paper) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/papers/${paper.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isActive: !paper.isActive })
    })

    if (response.ok) {
      await loadPapers()
    }
  } catch (error) {
    console.error('Erro ao alterar status:', error)
  }
}

const deletePaper = async (paper: Paper) => {
  if (!confirm(`Excluir papel "${paper.name}"?`)) return

  try {
    const token = authStore.token
    const response = await fetch(`/api/v1/papers/${paper.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (response.ok) {
      await loadPapers()
      alert('Papel excluído!')
    }
  } catch (error) {
    console.error('Erro ao excluir:', error)
  }
}

onMounted(() => {
  loadPapers()
})
</script>

<style scoped>
.papers-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-6);
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-2xl);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.header-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-100);
  color: var(--primary-600);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.section-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin: 0;
}

.section-description {
  font-size: var(--text-base);
  color: var(--gray-600);
  margin: 0;
}

/* Filters */
.filters-section {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6);
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-2xl);
}

.search-container {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--gray-400);
  pointer-events: none;
}

.search-input {
  padding-left: var(--space-10);
}

.filter-select {
  min-width: 200px;
}

/* Content */
.content-section {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  gap: var(--space-4);
}

.loading-text {
  font-size: var(--text-base);
  color: var(--gray-600);
  margin: 0;
}

/* Papers Grid */
.papers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--space-6);
  padding: var(--space-6);
}

.paper-card {
  transition: all var(--transition-fast);
}

.paper-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.card-inactive {
  opacity: 0.6;
}

.paper-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}

.paper-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin: 0;
  line-height: 1.3;
}

/* Specs */
.paper-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--gray-50);
  border-radius: var(--radius-lg);
}

.spec-label {
  font-size: var(--text-sm);
  color: var(--gray-600);
  font-weight: var(--font-medium);
}

.spec-value {
  font-size: var(--text-sm);
  color: var(--gray-900);
  font-weight: var(--font-semibold);
}

/* Pricing */
.paper-pricing {
  margin-bottom: var(--space-4);
}

.pricing-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--success-50) 0%, var(--success-100) 100%);
  border: 1px solid var(--success-200);
  border-radius: var(--radius-xl);
}

.pricing-label {
  font-size: var(--text-sm);
  color: var(--success-700);
  font-weight: var(--font-medium);
}

.pricing-value {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  color: var(--success-800);
}

/* Description */
.paper-description {
  font-size: var(--text-sm);
  color: var(--gray-600);
  line-height: 1.5;
  margin: 0 0 var(--space-4) 0;
  padding: var(--space-3);
  background: var(--gray-50);
  border-radius: var(--radius-lg);
  border-left: 3px solid var(--primary-200);
}

/* Actions */
.paper-actions {
  display: flex;
  gap: var(--space-2);
}

.paper-actions .btn {
  flex: 1;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  text-align: center;
  gap: var(--space-4);
}

.empty-icon {
  margin-bottom: var(--space-4);
}

.empty-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin: 0;
}

.empty-description {
  font-size: var(--text-base);
  color: var(--gray-600);
  margin: 0;
  max-width: 400px;
}

/* Modal */
.modal-content {
  width: 100%;
  max-width: 600px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--gray-700);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--gray-700);
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--primary-600);
}

.checkbox-text {
  font-weight: var(--font-medium);
}

.spinner-sm {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

/* Responsive */
@media (max-width: 1024px) {
  .papers-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  }
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    gap: var(--space-4);
    align-items: stretch;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .papers-grid {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
  
  .paper-specs {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
  
  .paper-actions {
    flex-direction: column;
  }
  
  .pricing-content {
    flex-direction: column;
    gap: var(--space-2);
    text-align: center;
  }
}
</style>
