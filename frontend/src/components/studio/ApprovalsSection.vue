<template>
  <div class="approvals-section">
    <div class="section-header">
      <div class="header-left">
        <h2>✅ Aprovações</h2>
        <p>Acompanhe o status das aprovações dos seus clientes</p>
      </div>
      <button class="btn-primary" @click="openNewApprovalModal">
        ➕ Nova Aprovação
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span>⏳</span> Carregando aprovações...
    </div>

    <!-- Stats -->
    <div v-else class="approval-stats">
      <div class="stat-card pending">
        <span class="stat-icon">⏳</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">Aguardando</span>
        </div>
      </div>
      <div class="stat-card viewed">
        <span class="stat-icon">👁️</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.viewed }}</span>
          <span class="stat-label">Visualizados</span>
        </div>
      </div>
      <div class="stat-card approved">
        <span class="stat-icon">✅</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.approved }}</span>
          <span class="stat-label">Aprovados</span>
        </div>
      </div>
      <div class="stat-card revision">
        <span class="stat-icon">🔄</span>
        <div class="stat-info">
          <span class="stat-value">{{ stats.revision }}</span>
          <span class="stat-label">Em Revisão</span>
        </div>
      </div>
    </div>

    <!-- Approvals List -->
    <div v-if="!loading" class="approvals-list">
      <div v-for="approval in approvals" :key="approval.id" class="approval-card">
        <div class="approval-thumb">
          <span>📷</span>
        </div>
        <div class="approval-info">
          <h4>{{ approval.projectName || 'Projeto' }}</h4>
          <p class="client">👤 {{ approval.clientName }}</p>
          <p class="sent">Enviado em {{ formatDate(approval.sentAt) }}</p>
        </div>
        <div class="approval-status-col">
          <span :class="['status-badge', approval.status]">
            {{ getStatusLabel(approval.status) }}
          </span>
          <span v-if="approval.viewedAt" class="viewed-info">
            Visto em {{ formatDate(approval.viewedAt) }}
          </span>
        </div>
        <div class="approval-timeline">
          <div :class="['timeline-step', { active: true }]">
            <span class="step-dot"></span>
            <span class="step-label">Enviado</span>
          </div>
          <div :class="['timeline-step', { active: approval.viewedAt }]">
            <span class="step-dot"></span>
            <span class="step-label">Visualizado</span>
          </div>
          <div :class="['timeline-step', { active: approval.status === 'approved' }]">
            <span class="step-dot"></span>
            <span class="step-label">Aprovado</span>
          </div>
        </div>
        <div class="approval-actions">
          <button @click="viewApproval(approval)" class="btn-view">👁️ Ver</button>
          <button @click="resendLink(approval)" class="btn-resend" :disabled="resending === approval.id">
            {{ resending === approval.id ? '...' : '📤 Reenviar' }}
          </button>
          <button @click="copyLink(approval)" class="btn-copy">🔗 Copiar</button>
        </div>
      </div>
      
      <div v-if="approvals.length === 0" class="empty-state">
        <span>📭</span>
        <p>Nenhuma aprovação encontrada</p>
        <button class="btn-primary" @click="openNewApprovalModal">➕ Criar Primeira Aprovação</button>
      </div>
    </div>

    <!-- New Approval Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>Nova Aprovação</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        <form @submit.prevent="createApproval" class="modal-body">
          <div class="form-group">
            <label>Projeto *</label>
            <select v-model="form.projectId" required>
              <option value="">Selecione um projeto</option>
              <option v-for="project in projects" :key="project.id" :value="project.id">
                {{ project.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Nome do Cliente *</label>
            <input v-model="form.clientName" type="text" required placeholder="Nome do cliente" />
          </div>
          <div class="form-group">
            <label>Email do Cliente *</label>
            <input v-model="form.clientEmail" type="email" required placeholder="email@cliente.com" />
          </div>
          <div class="form-group">
            <label>Validade do Link (opcional)</label>
            <input v-model="form.expiresAt" type="date" :min="minDate" />
          </div>
          <div v-if="formError" class="form-error">{{ formError }}</div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModal">Cancelar</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Criando...' : 'Criar e Enviar Link' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Approval Detail Modal -->
    <div v-if="selectedApproval" class="modal-overlay" @click.self="selectedApproval = null">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>Detalhes da Aprovação</h3>
          <button class="close-btn" @click="selectedApproval = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h4>📋 Informações</h4>
            <div class="detail-row"><span>Projeto:</span><strong>{{ selectedApproval.projectName }}</strong></div>
            <div class="detail-row"><span>Cliente:</span><strong>{{ selectedApproval.clientName }}</strong></div>
            <div class="detail-row"><span>Email:</span><a :href="'mailto:' + selectedApproval.clientEmail">{{ selectedApproval.clientEmail }}</a></div>
            <div class="detail-row"><span>Status:</span><span :class="['status-badge', selectedApproval.status]">{{ getStatusLabel(selectedApproval.status) }}</span></div>
          </div>
          <div class="detail-section">
            <h4>📅 Timeline</h4>
            <div class="detail-row"><span>Enviado:</span><span>{{ formatDate(selectedApproval.sentAt) }}</span></div>
            <div class="detail-row"><span>Visualizado:</span><span>{{ selectedApproval.viewedAt ? formatDate(selectedApproval.viewedAt) : '-' }}</span></div>
            <div class="detail-row"><span>Respondido:</span><span>{{ selectedApproval.respondedAt ? formatDate(selectedApproval.respondedAt) : '-' }}</span></div>
          </div>
          <div v-if="selectedApproval.feedback" class="detail-section">
            <h4>💬 Feedback do Cliente</h4>
            <p class="feedback-text">{{ selectedApproval.feedback }}</p>
          </div>
          <div v-if="selectedApproval.revisionNotes" class="detail-section">
            <h4>📝 Notas de Revisão</h4>
            <p class="feedback-text">{{ selectedApproval.revisionNotes }}</p>
          </div>
          <div class="detail-section">
            <h4>🔗 Link de Aprovação</h4>
            <div class="link-box">
              <input type="text" :value="getApprovalLink(selectedApproval.token)" readonly />
              <button @click="copyLink(selectedApproval)" class="btn-copy">📋 Copiar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { studioService, type Approval, type ApprovalStats, type Project } from '@/services/studio'

const loading = ref(true)
const saving = ref(false)
const resending = ref<string | null>(null)
const showModal = ref(false)
const selectedApproval = ref<Approval | null>(null)
const formError = ref('')

const approvals = ref<Approval[]>([])
const projects = ref<Project[]>([])
const stats = ref<ApprovalStats>({ total: 0, pending: 0, viewed: 0, approved: 0, revision: 0, rejected: 0 })

const form = reactive({
  projectId: '',
  clientName: '',
  clientEmail: '',
  expiresAt: ''
})

const minDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
})

const loadData = async () => {
  loading.value = true
  try {
    const [approvalsData, statsData, projectsData] = await Promise.all([
      studioService.getApprovals(),
      studioService.getApprovalStats(),
      studioService.getProjects()
    ])
    approvals.value = approvalsData
    stats.value = statsData
    projects.value = projectsData
  } catch (error) {
    console.error('Erro ao carregar aprovações:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const formatDate = (date: string | null | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Aguardando',
    'viewed': 'Visualizado',
    'approved': 'Aprovado',
    'revision': 'Em Revisão',
    'rejected': 'Rejeitado'
  }
  return labels[status] || status
}

const getApprovalLink = (token: string) => studioService.getApprovalLink(token)

const openNewApprovalModal = () => {
  form.projectId = ''
  form.clientName = ''
  form.clientEmail = ''
  form.expiresAt = ''
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  formError.value = ''
}

const viewApproval = (approval: Approval) => {
  selectedApproval.value = approval
}

const resendLink = async (approval: Approval) => {
  resending.value = approval.id
  try {
    await studioService.resendApprovalLink(approval.id)
    await loadData()
    alert('Link reenviado com sucesso!')
  } catch (error) {
    alert('Erro ao reenviar link')
  } finally {
    resending.value = null
  }
}

const copyLink = (approval: Approval) => {
  const link = getApprovalLink(approval.token)
  navigator.clipboard.writeText(link)
  alert('Link copiado!')
}

const createApproval = async () => {
  saving.value = true
  formError.value = ''
  try {
    await studioService.createApproval({
      projectId: form.projectId,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      expiresAt: form.expiresAt || undefined
    })
    closeModal()
    await loadData()
    alert('Aprovação criada! O link foi gerado.')
  } catch (error: any) {
    formError.value = error.response?.data?.message || 'Erro ao criar aprovação'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #D4775C, #E8956F); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.loading-state { text-align: center; padding: 60px 20px; color: #64748b; font-size: 1.1rem; }

.approval-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.stat-card { background: white; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; }
.stat-card .stat-icon { font-size: 2rem; }
.stat-card .stat-value { display: block; font-size: 1.75rem; font-weight: 700; }
.stat-card .stat-label { color: #64748b; font-size: 0.85rem; }
.stat-card.pending { border-left: 4px solid #f97316; }
.stat-card.viewed { border-left: 4px solid #3b82f6; }
.stat-card.approved { border-left: 4px solid #10b981; }
.stat-card.revision { border-left: 4px solid #8b5cf6; }

.approvals-list { display: flex; flex-direction: column; gap: 16px; }
.approval-card { background: white; border-radius: 12px; padding: 20px; display: grid; grid-template-columns: 80px 1fr 150px 200px auto; gap: 20px; align-items: center; }
.approval-thumb { width: 80px; height: 60px; background: #f1f5f9; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.approval-info h4 { margin: 0 0 4px 0; }
.approval-info p { margin: 0; font-size: 0.85rem; color: #64748b; }

.status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #b45309; }
.status-badge.viewed { background: #dbeafe; color: #1d4ed8; }
.status-badge.approved { background: #dcfce7; color: #16a34a; }
.status-badge.revision { background: #ede9fe; color: #7c3aed; }
.status-badge.rejected { background: #fee2e2; color: #dc2626; }
.viewed-info { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }

.approval-timeline { display: flex; gap: 8px; }
.timeline-step { display: flex; flex-direction: column; align-items: center; gap: 4px; opacity: 0.4; }
.timeline-step.active { opacity: 1; }
.step-dot { width: 12px; height: 12px; background: #10b981; border-radius: 50%; }
.timeline-step:not(.active) .step-dot { background: #e2e8f0; }
.step-label { font-size: 0.7rem; color: #64748b; }

.approval-actions { display: flex; gap: 8px; }
.approval-actions button { padding: 8px 12px; border: none; border-radius: 8px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
.approval-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-view { background: #f1f5f9; }
.btn-resend { background: #dbeafe; color: #1d4ed8; }
.btn-copy { background: #dcfce7; color: #16a34a; }
.approval-actions button:hover:not(:disabled) { transform: translateY(-1px); }

.empty-state { text-align: center; padding: 60px 20px; background: white; border-radius: 12px; }
.empty-state span { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-state p { color: #64748b; margin: 0 0 20px 0; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: white; border-radius: 16px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
.detail-modal { max-width: 600px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
.modal-body { padding: 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.9rem; color: #374151; }
.form-group input, .form-group select { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; }
.form-group input:focus, .form-group select:focus { outline: none; border-color: #D4775C; }
.form-error { color: #dc2626; font-size: 0.85rem; margin-bottom: 12px; padding: 10px; background: #fef2f2; border-radius: 8px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
.btn-secondary { padding: 10px 20px; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; font-weight: 500; }

/* Detail Modal */
.detail-section { margin-bottom: 20px; }
.detail-section h4 { margin: 0 0 12px 0; font-size: 0.9rem; color: #64748b; }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.detail-row span:first-child { color: #64748b; }
.detail-row a { color: #D4775C; text-decoration: none; }
.feedback-text { background: #f8fafc; padding: 12px; border-radius: 8px; color: #475569; font-size: 0.9rem; line-height: 1.5; }
.link-box { display: flex; gap: 8px; }
.link-box input { flex: 1; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: #f8fafc; }

@media (max-width: 1200px) {
  .approval-stats { grid-template-columns: repeat(2, 1fr); }
  .approval-card { grid-template-columns: 1fr; gap: 12px; }
  .approval-timeline { justify-content: center; }
  .approval-actions { justify-content: center; }
}
</style>
