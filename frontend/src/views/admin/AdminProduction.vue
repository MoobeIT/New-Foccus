<template>
  <div class="admin-production">
    <header class="page-header">
      <div class="header-content">
        <h1>🏭 Gestão de Produção</h1>
        <p class="subtitle">Controle de projetos em produção e pagamentos</p>
      </div>
      <div class="header-actions">
        <button class="btn-refresh" @click="loadProjects">🔄 Atualizar</button>
      </div>
    </header>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card pending">
        <div class="stat-icon">⏳</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pendingPayment }}</span>
          <span class="stat-label">Aguardando Pagamento</span>
        </div>
      </div>
      <div class="stat-card paid">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.paidReady }}</span>
          <span class="stat-label">Pagos - Prontos p/ Produzir</span>
        </div>
      </div>
      <div class="stat-card producing">
        <div class="stat-icon">🏭</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.inProduction }}</span>
          <span class="stat-label">Em Produção</span>
        </div>
      </div>
      <div class="stat-card completed">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">Concluídos</span>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
        ⏳ Aguardando Pagamento ({{ pendingProjects.length }})
      </button>
      <button :class="{ active: activeTab === 'ready' }" @click="activeTab = 'ready'">
        ✅ Prontos p/ Produzir ({{ readyProjects.length }})
      </button>
      <button :class="{ active: activeTab === 'producing' }" @click="activeTab = 'producing'">
        🏭 Em Produção ({{ producingProjects.length }})
      </button>
      <button :class="{ active: activeTab === 'completed' }" @click="activeTab = 'completed'">
        📦 Concluídos ({{ completedProjects.length }})
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando projetos...</p>
    </div>

    <!-- Projects Table -->
    <div v-else class="projects-table">
      <table>
        <thead>
          <tr>
            <th>Projeto</th>
            <th>Cliente</th>
            <th>Produto</th>
            <th>Páginas</th>
            <th>Valor</th>
            <th>Status Pagamento</th>
            <th>Arquivos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="project in currentProjects" :key="project.id">
            <td class="project-cell">
              <div class="project-thumb">
                <img v-if="project.thumbnail" :src="project.thumbnail" />
                <span v-else>📷</span>
              </div>
              <div class="project-info">
                <strong>{{ project.name }}</strong>
                <span class="project-id">#{{ project.id.slice(0, 8) }}</span>
              </div>
            </td>
            <td>
              <div class="client-info">
                <strong>{{ project.userName || 'Cliente' }}</strong>
                <span>{{ project.userEmail }}</span>
              </div>
            </td>
            <td>{{ project.productName || 'Fotolivro' }}</td>
            <td>{{ project.pageCount || 20 }}</td>
            <td class="price">R$ {{ formatPrice(project.totalPrice || 299) }}</td>
            <td>
              <span class="payment-status" :class="project.paymentStatus || 'pending'">
                {{ getPaymentStatusLabel(project.paymentStatus) }}
              </span>
            </td>
            <td>
              <button 
                v-if="project.paymentStatus === 'paid'" 
                class="btn-download"
                @click="downloadFiles(project)"
              >
                📥 Download
              </button>
              <span v-else class="files-locked">🔒 Bloqueado</span>
            </td>
            <td class="actions-cell">
              <button 
                v-if="project.paymentStatus !== 'paid'" 
                class="btn-action confirm-payment"
                @click="confirmPayment(project)"
                title="Confirmar Pagamento"
              >
                💰 Confirmar Pagamento
              </button>
              <button 
                v-if="project.paymentStatus === 'paid' && project.productionStatus !== 'producing'" 
                class="btn-action start-production"
                @click="startProduction(project)"
                title="Iniciar Produção"
              >
                🏭 Iniciar Produção
              </button>
              <button 
                v-if="project.productionStatus === 'producing'" 
                class="btn-action complete-production"
                @click="completeProduction(project)"
                title="Concluir Produção"
              >
                ✅ Concluir
              </button>
              <button 
                class="btn-action view"
                @click="viewProject(project)"
                title="Ver Detalhes"
              >
                👁️
              </button>
            </td>
          </tr>
          <tr v-if="currentProjects.length === 0">
            <td colspan="8" class="empty-row">
              <span>📭</span>
              <p>Nenhum projeto nesta categoria</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Payment Confirmation Modal -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal">
        <div class="modal-header">
          <h3>💰 Confirmar Pagamento</h3>
          <button class="close-btn" @click="closePaymentModal">✕</button>
        </div>
        <div class="modal-body">
          <p>Confirmar pagamento do projeto:</p>
          <div class="project-summary">
            <strong>{{ selectedProject?.name }}</strong>
            <span>Cliente: {{ selectedProject?.userName }}</span>
            <span class="price">Valor: R$ {{ formatPrice(selectedProject?.totalPrice || 299) }}</span>
          </div>
          <div class="form-group">
            <label>Método de Pagamento</label>
            <select v-model="paymentMethod">
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>
          <div class="form-group">
            <label>Observações (opcional)</label>
            <textarea v-model="paymentNotes" placeholder="Notas sobre o pagamento..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closePaymentModal">Cancelar</button>
          <button class="btn-primary" @click="processPayment" :disabled="processing">
            {{ processing ? 'Processando...' : '✅ Confirmar Pagamento' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Project {
  id: string
  name: string
  userName?: string
  userEmail?: string
  productName?: string
  pageCount?: number
  totalPrice?: number
  paymentStatus?: 'pending' | 'paid' | 'refunded'
  productionStatus?: 'waiting' | 'producing' | 'completed'
  thumbnail?: string
  status?: string
}

const loading = ref(true)
const processing = ref(false)
const activeTab = ref('pending')
const projects = ref<Project[]>([])
const showPaymentModal = ref(false)
const selectedProject = ref<Project | null>(null)
const paymentMethod = ref('pix')
const paymentNotes = ref('')

const stats = computed(() => ({
  pendingPayment: pendingProjects.value.length,
  paidReady: readyProjects.value.length,
  inProduction: producingProjects.value.length,
  completed: completedProjects.value.length,
}))

const pendingProjects = computed(() => 
  projects.value.filter(p => p.status === 'production' && p.paymentStatus !== 'paid')
)

const readyProjects = computed(() => 
  projects.value.filter(p => p.status === 'production' && p.paymentStatus === 'paid' && p.productionStatus !== 'producing' && p.productionStatus !== 'completed')
)

const producingProjects = computed(() => 
  projects.value.filter(p => p.productionStatus === 'producing')
)

const completedProjects = computed(() => 
  projects.value.filter(p => p.status === 'completed' || p.productionStatus === 'completed')
)

const currentProjects = computed(() => {
  switch (activeTab.value) {
    case 'pending': return pendingProjects.value
    case 'ready': return readyProjects.value
    case 'producing': return producingProjects.value
    case 'completed': return completedProjects.value
    default: return []
  }
})

const loadProjects = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('accessToken')
    const response = await fetch('/api/v1/admin/production/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const result = await response.json()
      projects.value = result.data || result || []
    }
  } catch (error) {
    console.error('Erro ao carregar projetos:', error)
  } finally {
    loading.value = false
  }
}

const formatPrice = (value: number) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const getPaymentStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    pending: '⏳ Aguardando',
    paid: '✅ Pago',
    refunded: '↩️ Reembolsado'
  }
  return labels[status || 'pending'] || '⏳ Aguardando'
}

const confirmPayment = (project: Project) => {
  selectedProject.value = project
  paymentMethod.value = 'pix'
  paymentNotes.value = ''
  showPaymentModal.value = true
}

const closePaymentModal = () => {
  showPaymentModal.value = false
  selectedProject.value = null
}

const processPayment = async () => {
  if (!selectedProject.value) return
  
  processing.value = true
  try {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(`/api/v1/admin/production/projects/${selectedProject.value.id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        paymentMethod: paymentMethod.value,
        notes: paymentNotes.value
      })
    })
    
    if (response.ok) {
      // Atualizar projeto local
      const idx = projects.value.findIndex(p => p.id === selectedProject.value?.id)
      if (idx !== -1) {
        projects.value[idx].paymentStatus = 'paid'
      }
      closePaymentModal()
      alert('✅ Pagamento confirmado com sucesso!')
    } else {
      alert('Erro ao confirmar pagamento')
    }
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao confirmar pagamento')
  } finally {
    processing.value = false
  }
}

const startProduction = async (project: Project) => {
  if (!confirm(`Iniciar produção do projeto "${project.name}"?`)) return
  
  try {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(`/api/v1/admin/production/projects/${project.id}/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const idx = projects.value.findIndex(p => p.id === project.id)
      if (idx !== -1) {
        projects.value[idx].productionStatus = 'producing'
      }
      alert('✅ Produção iniciada!')
    }
  } catch (error) {
    console.error('Erro:', error)
  }
}

const completeProduction = async (project: Project) => {
  if (!confirm(`Marcar produção do projeto "${project.name}" como concluída?`)) return
  
  try {
    const token = localStorage.getItem('accessToken')
    const response = await fetch(`/api/v1/admin/production/projects/${project.id}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (response.ok) {
      const idx = projects.value.findIndex(p => p.id === project.id)
      if (idx !== -1) {
        projects.value[idx].productionStatus = 'completed'
        projects.value[idx].status = 'completed'
      }
      alert('✅ Produção concluída!')
    }
  } catch (error) {
    console.error('Erro:', error)
  }
}

const downloadFiles = async (project: Project) => {
  try {
    const token = localStorage.getItem('accessToken')
    window.open(`/api/v1/admin/production/projects/${project.id}/download?token=${token}`, '_blank')
  } catch (error) {
    console.error('Erro:', error)
  }
}

const viewProject = (project: Project) => {
  window.open(`/editor/${project.id}`, '_blank')
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.admin-production {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0 0 4px 0;
  font-size: 1.5rem;
}

.subtitle {
  margin: 0;
  color: #6B6560;
}

.btn-refresh {
  padding: 10px 16px;
  background: #F7F4EE;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-refresh:hover {
  background: #EBE7E0;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.stat-card.pending { border-left: 4px solid #F59E0B; }
.stat-card.paid { border-left: 4px solid #10B981; }
.stat-card.producing { border-left: 4px solid #8B5CF6; }
.stat-card.completed { border-left: 4px solid #22C55E; }

.stat-icon {
  font-size: 2rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2D2A26;
}

.stat-label {
  font-size: 0.85rem;
  color: #6B6560;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #EBE7E0;
  padding-bottom: 12px;
}

.tabs button {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6B6560;
  transition: all 0.2s;
}

.tabs button:hover {
  background: #F7F4EE;
}

.tabs button.active {
  background: #D4775C;
  color: white;
}

/* Table */
.projects-table {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #F0EDE8;
}

th {
  background: #F7F4EE;
  font-weight: 600;
  font-size: 0.85rem;
  color: #6B6560;
}

.project-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: rgba(255,255,255,0.6);
}

.project-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-info {
  display: flex;
  flex-direction: column;
}

.project-info strong {
  font-size: 0.95rem;
}

.project-id {
  font-size: 0.75rem;
  color: #9CA3AF;
}

.client-info {
  display: flex;
  flex-direction: column;
}

.client-info span {
  font-size: 0.8rem;
  color: #6B6560;
}

.price {
  font-weight: 600;
  color: #2D2A26;
}

.payment-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.payment-status.pending {
  background: #FEF3C7;
  color: #B45309;
}

.payment-status.paid {
  background: #D1FAE5;
  color: #047857;
}

.payment-status.refunded {
  background: #FEE2E2;
  color: #DC2626;
}

.btn-download {
  padding: 6px 12px;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
}

.btn-download:hover {
  background: #2563EB;
}

.files-locked {
  color: #9CA3AF;
  font-size: 0.85rem;
}

.actions-cell {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-action {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-action.confirm-payment {
  background: #FEF3C7;
  color: #B45309;
}

.btn-action.confirm-payment:hover {
  background: #FDE68A;
}

.btn-action.start-production {
  background: #EDE9FE;
  color: #7C3AED;
}

.btn-action.start-production:hover {
  background: #DDD6FE;
}

.btn-action.complete-production {
  background: #D1FAE5;
  color: #047857;
}

.btn-action.complete-production:hover {
  background: #A7F3D0;
}

.btn-action.view {
  background: #F3F4F6;
  color: #6B7280;
}

.btn-action.view:hover {
  background: #E5E7EB;
}

.empty-row {
  text-align: center;
  padding: 40px !important;
  color: #9CA3AF;
}

.empty-row span {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 60px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #EBE7E0;
  border-top-color: #D4775C;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #EBE7E0;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #9CA3AF;
}

.modal-body {
  padding: 24px;
}

.project-summary {
  background: #F7F4EE;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.project-summary strong {
  font-size: 1.1rem;
}

.project-summary .price {
  color: #D4775C;
  font-weight: 600;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.9rem;
}

.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 0.95rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #EBE7E0;
  justify-content: flex-end;
}

.btn-secondary {
  padding: 10px 20px;
  background: #F3F4F6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 20px;
  background: #D4775C;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .tabs {
    flex-wrap: wrap;
  }
  
  .projects-table {
    overflow-x: auto;
  }
  
  table {
    min-width: 900px;
  }
}
</style>
