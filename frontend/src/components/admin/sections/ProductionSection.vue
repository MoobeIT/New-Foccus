<template>
  <div class="production-section">
    <!-- Header -->
    <div class="section-header">
      <h2>🏭 Gestão de Produção</h2>
      <button class="btn-refresh" @click="loadProjects">🔄 Atualizar</button>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
        <div class="stat-icon">💳</div>
        <div class="stat-info">
          <span class="stat-value">{{ getProjectsByStatus('pending').length }}</span>
          <span class="stat-label">Aguardando Pagamento</span>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeTab === 'ready' }" @click="activeTab = 'ready'">
        <div class="stat-icon">📥</div>
        <div class="stat-info">
          <span class="stat-value">{{ getProjectsByStatus('ready').length }}</span>
          <span class="stat-label">Liberado p/ Produção</span>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeTab === 'producing' }" @click="activeTab = 'producing'">
        <div class="stat-icon">🏭</div>
        <div class="stat-info">
          <span class="stat-value">{{ getProjectsByStatus('producing').length }}</span>
          <span class="stat-label">Em Produção</span>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeTab === 'ready_ship' }" @click="activeTab = 'ready_ship'">
        <div class="stat-icon">📦</div>
        <div class="stat-info">
          <span class="stat-value">{{ getProjectsByStatus('ready_ship').length }}</span>
          <span class="stat-label">Pronto p/ Envio</span>
        </div>
      </div>
      <div class="stat-card" :class="{ active: activeTab === 'shipped' }" @click="activeTab = 'shipped'">
        <div class="stat-icon">🚚</div>
        <div class="stat-info">
          <span class="stat-value">{{ getProjectsByStatus('shipped').length }}</span>
          <span class="stat-label">Enviados</span>
        </div>
      </div>
    </div>

    <!-- Flow Indicator -->
    <div class="flow-indicator">
      <div class="flow-step" :class="{ active: activeTab === 'pending' }">
        <span class="step-icon">💳</span>
        <span class="step-label">Pagamento</span>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step" :class="{ active: activeTab === 'ready' }">
        <span class="step-icon">📥</span>
        <span class="step-label">Download</span>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step" :class="{ active: activeTab === 'producing' }">
        <span class="step-icon">🏭</span>
        <span class="step-label">Produção</span>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step" :class="{ active: activeTab === 'ready_ship' }">
        <span class="step-icon">📦</span>
        <span class="step-label">Etiqueta</span>
      </div>
      <div class="flow-arrow">→</div>
      <div class="flow-step" :class="{ active: activeTab === 'shipped' }">
        <span class="step-icon">🚚</span>
        <span class="step-label">Enviado</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando projetos...</p>
    </div>

    <!-- Projects List -->
    <div v-else class="projects-list">
      <!-- Tab Title -->
      <div class="tab-header">
        <h3>{{ getTabTitle() }}</h3>
        <span class="tab-count">{{ currentProjects.length }} projeto(s)</span>
      </div>

      <!-- Empty State -->
      <div v-if="currentProjects.length === 0" class="empty-state">
        <span>📭</span>
        <p>Nenhum projeto nesta etapa</p>
      </div>

      <!-- Project Cards -->
      <div v-else class="projects-grid">
        <div v-for="project in currentProjects" :key="project.id" class="project-card">
          <div class="card-header">
            <div class="project-thumb">
              <img v-if="project.thumbnail" :src="project.thumbnail" />
              <span v-else>📷</span>
            </div>
            <div class="project-info">
              <h4>{{ project.name }}</h4>
              <span class="project-id">#{{ project.id.slice(0, 8) }}</span>
            </div>
            <div class="status-badge" :class="project.productionStatus">
              {{ getStatusLabel(project.productionStatus) }}
            </div>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <span class="label">👤 Cliente:</span>
              <span class="value">{{ project.userName || 'Cliente' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">📧 Email:</span>
              <span class="value">{{ project.userEmail || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">📖 Produto:</span>
              <span class="value">{{ project.productName || 'Fotolivro' }}</span>
            </div>
            <div class="detail-row">
              <span class="label">📄 Páginas:</span>
              <span class="value">{{ project.pageCount || 20 }}</span>
            </div>
            <div class="detail-row">
              <span class="label">💰 Valor:</span>
              <span class="value price">R$ {{ formatPrice(project.totalPrice || 299) }}</span>
            </div>
            <div v-if="project.trackingCode" class="detail-row">
              <span class="label">📦 Rastreio:</span>
              <span class="value tracking">{{ project.trackingCode }}</span>
            </div>
            <!-- Manual Status Change -->
            <div class="detail-row status-row">
              <span class="label">⚙️ Status:</span>
              <select 
                class="status-select" 
                :value="project.productionStatus || 'pending'"
                @change="changeStatus(project, ($event.target as HTMLSelectElement).value)"
              >
                <option value="pending">💳 Aguardando Pagamento</option>
                <option value="ready">📥 Liberado p/ Produção</option>
                <option value="producing">🏭 Em Produção</option>
                <option value="ready_ship">📦 Pronto p/ Envio</option>
                <option value="shipped">🚚 Enviado</option>
              </select>
            </div>
          </div>

          <!-- Actions based on status -->
          <div class="card-actions">
            <!-- Aguardando Pagamento -->
            <template v-if="project.productionStatus === 'pending' || !project.productionStatus">
              <button class="btn-action primary" @click="confirmPayment(project)">
                💳 Confirmar Pagamento
              </button>
            </template>

            <!-- Liberado para Produção -->
            <template v-else-if="project.productionStatus === 'ready'">
              <button class="btn-action primary" @click="downloadAndStartProduction(project)">
                📥 Download e Iniciar Produção
              </button>
              <button class="btn-action secondary" @click="downloadFiles(project)">
                📥 Apenas Download
              </button>
            </template>

            <!-- Em Produção -->
            <template v-else-if="project.productionStatus === 'producing'">
              <button class="btn-action primary" @click="completeProduction(project)">
                ✅ Concluir Produção
              </button>
            </template>

            <!-- Pronto para Envio -->
            <template v-else-if="project.productionStatus === 'ready_ship'">
              <button class="btn-action primary" @click="openShippingModal(project)">
                🏷️ Gerar Etiqueta de Envio
              </button>
              <button class="btn-action secondary" @click="printProductLabel(project)">
                🖨️ Etiqueta do Produto
              </button>
            </template>

            <!-- Enviado -->
            <template v-else-if="project.productionStatus === 'shipped'">
              <button class="btn-action secondary" @click="copyTracking(project)">
                📋 Copiar Rastreio
              </button>
              <button class="btn-action secondary" @click="viewProject(project)">
                👁️ Ver Projeto
              </button>
            </template>

            <!-- View button always available -->
            <button v-if="project.productionStatus !== 'shipped'" class="btn-action icon" @click="viewProject(project)" title="Ver Projeto">
              👁️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal">
        <div class="modal-header">
          <h3>💳 Confirmar Pagamento</h3>
          <button class="close-btn" @click="closePaymentModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="project-summary">
            <strong>{{ selectedProject?.name }}</strong>
            <span>Cliente: {{ selectedProject?.userName }}</span>
            <span class="price">Valor: R$ {{ formatPrice(selectedProject?.totalPrice || 299) }}</span>
          </div>
          <div class="form-group">
            <label>Método de Pagamento</label>
            <select v-model="paymentData.method">
              <option value="pix">PIX</option>
              <option value="credit_card">Cartão de Crédito</option>
              <option value="boleto">Boleto</option>
              <option value="transfer">Transferência</option>
            </select>
          </div>
          <div class="form-group">
            <label>Observações (opcional)</label>
            <textarea v-model="paymentData.notes" placeholder="Notas sobre o pagamento..."></textarea>
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

    <!-- Shipping Modal -->
    <div v-if="showShippingModal" class="modal-overlay" @click.self="closeShippingModal">
      <div class="modal shipping-modal">
        <div class="modal-header">
          <h3>🚚 Gerar Etiqueta de Envio</h3>
          <button class="close-btn" @click="closeShippingModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="project-summary">
            <strong>{{ selectedProject?.name }}</strong>
            <span>Cliente: {{ selectedProject?.userName }}</span>
          </div>
          
          <div class="shipping-address">
            <h4>📍 Endereço de Entrega</h4>
            <div class="form-group">
              <label>Nome do Destinatário</label>
              <input v-model="shippingData.recipientName" type="text" placeholder="Nome completo" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>CEP</label>
                <input v-model="shippingData.zipCode" type="text" placeholder="00000-000" @blur="fetchAddress" />
              </div>
              <div class="form-group">
                <label>Estado</label>
                <input v-model="shippingData.state" type="text" placeholder="SP" />
              </div>
            </div>
            <div class="form-group">
              <label>Cidade</label>
              <input v-model="shippingData.city" type="text" placeholder="São Paulo" />
            </div>
            <div class="form-group">
              <label>Endereço</label>
              <input v-model="shippingData.address" type="text" placeholder="Rua, número" />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Complemento</label>
                <input v-model="shippingData.complement" type="text" placeholder="Apto, bloco..." />
              </div>
              <div class="form-group">
                <label>Bairro</label>
                <input v-model="shippingData.neighborhood" type="text" placeholder="Bairro" />
              </div>
            </div>
          </div>

          <div class="shipping-method">
            <h4>📦 Método de Envio</h4>
            <div class="shipping-options">
              <label class="shipping-option" :class="{ selected: shippingData.method === 'pac' }">
                <input type="radio" v-model="shippingData.method" value="pac" />
                <div class="option-info">
                  <span class="option-name">📦 PAC</span>
                  <span class="option-time">5-8 dias úteis</span>
                </div>
                <span class="option-price">R$ 25,90</span>
              </label>
              <label class="shipping-option" :class="{ selected: shippingData.method === 'sedex' }">
                <input type="radio" v-model="shippingData.method" value="sedex" />
                <div class="option-info">
                  <span class="option-name">🚀 SEDEX</span>
                  <span class="option-time">2-3 dias úteis</span>
                </div>
                <span class="option-price">R$ 45,90</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>Código de Rastreio (opcional)</label>
            <input v-model="shippingData.trackingCode" type="text" placeholder="Será gerado automaticamente se vazio" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeShippingModal">Cancelar</button>
          <button class="btn-primary" @click="generateShippingLabel" :disabled="processing || !isShippingValid">
            {{ processing ? 'Gerando...' : '🏷️ Gerar Etiqueta e Marcar Enviado' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Download Modal -->
    <div v-if="showDownloadModal" class="modal-overlay" @click.self="closeDownloadModal">
      <div class="modal download-modal">
        <div class="modal-header">
          <h3>📥 Download dos Arquivos</h3>
          <button class="close-btn" @click="closeDownloadModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="project-summary">
            <strong>{{ selectedProject?.name }}</strong>
            <span>Cliente: {{ selectedProject?.userName }}</span>
            <span>Páginas: {{ selectedProject?.pageCount || 20 }}</span>
          </div>
          
          <div v-if="downloadData" class="download-options">
            <h4>📄 Arquivos para Produção</h4>
            
            <div class="download-item">
              <div class="download-info">
                <span class="download-icon">📕</span>
                <div class="download-details">
                  <span class="download-name">Capa (PDF)</span>
                  <span class="download-desc">Capa frente, lombada e verso para impressão</span>
                </div>
              </div>
              <button class="btn-download" @click="triggerDownload('cover')" :disabled="downloadingType !== null">
                {{ downloadingType === 'cover' ? '⏳ Gerando...' : '⬇️ Baixar Capa' }}
              </button>
            </div>
            
            <div class="download-item">
              <div class="download-info">
                <span class="download-icon">📖</span>
                <div class="download-details">
                  <span class="download-name">Miolo (PDF)</span>
                  <span class="download-desc">Páginas internas para impressão</span>
                </div>
              </div>
              <button class="btn-download" @click="triggerDownload('content')" :disabled="downloadingType !== null">
                {{ downloadingType === 'content' ? '⏳ Gerando...' : '⬇️ Baixar Miolo' }}
              </button>
            </div>
            
            <div class="download-item">
              <div class="download-info">
                <span class="download-icon">📚</span>
                <div class="download-details">
                  <span class="download-name">Completo (PDF)</span>
                  <span class="download-desc">Arquivo completo com capa e miolo</span>
                </div>
              </div>
              <button class="btn-download" @click="triggerDownload('full')" :disabled="downloadingType !== null">
                {{ downloadingType === 'full' ? '⏳ Gerando...' : '⬇️ Baixar Completo' }}
              </button>
            </div>

            <div class="download-note">
              <span>💡</span>
              <p>Os PDFs serão gerados em alta resolução (300 DPI) para impressão profissional.</p>
            </div>
          </div>
          
          <div v-else class="loading-download">
            <div class="spinner"></div>
            <p>Carregando arquivos...</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDownloadModal">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '@/services/api'

interface Project {
  id: string
  name: string
  userName?: string
  userEmail?: string
  productName?: string
  pageCount?: number
  totalPrice?: number
  paymentStatus?: string
  productionStatus?: string
  thumbnail?: string
  status?: string
  trackingCode?: string
  shippingAddress?: any
}

const loading = ref(true)
const processing = ref(false)
const downloadingType = ref<string | null>(null)
const activeTab = ref('pending')
const projects = ref<Project[]>([])

// Modals
const showPaymentModal = ref(false)
const showShippingModal = ref(false)
const showDownloadModal = ref(false)
const selectedProject = ref<Project | null>(null)
const downloadData = ref<any>(null)

// Payment data
const paymentData = reactive({
  method: 'pix',
  notes: ''
})

// Shipping data
const shippingData = reactive({
  recipientName: '',
  zipCode: '',
  state: '',
  city: '',
  address: '',
  complement: '',
  neighborhood: '',
  method: 'pac',
  trackingCode: ''
})

const isShippingValid = computed(() => {
  return shippingData.recipientName && 
         shippingData.zipCode && 
         shippingData.city && 
         shippingData.address &&
         shippingData.method
})

const getProjectsByStatus = (status: string) => {
  return projects.value.filter(p => {
    const prodStatus = p.productionStatus || 'pending'
    if (status === 'pending') {
      return prodStatus === 'pending' || prodStatus === 'waiting'
    }
    return prodStatus === status
  })
}

const currentProjects = computed(() => getProjectsByStatus(activeTab.value))

const getTabTitle = () => {
  const titles: Record<string, string> = {
    pending: '💳 Aguardando Pagamento',
    ready: '📥 Liberado para Produção',
    producing: '🏭 Em Produção',
    ready_ship: '📦 Pronto para Envio',
    shipped: '🚚 Enviados'
  }
  return titles[activeTab.value] || ''
}

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    waiting: 'Aguardando Pagamento',
    ready: 'Liberado',
    producing: 'Em Produção',
    ready_ship: 'Pronto p/ Envio',
    shipped: 'Enviado'
  }
  return labels[status || 'pending'] || 'Aguardando'
}

const formatPrice = (value: number) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

// Load projects
const loadProjects = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/v1/admin/production/projects')
    projects.value = response.data?.data || response.data || []
    console.log('📦 Projetos carregados:', projects.value.length)
  } catch (error) {
    console.error('Erro ao carregar projetos:', error)
    projects.value = []
  } finally {
    loading.value = false
  }
}

// Payment
const confirmPayment = (project: Project) => {
  selectedProject.value = project
  paymentData.method = 'pix'
  paymentData.notes = ''
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
    await api.post(`/api/v1/admin/production/projects/${selectedProject.value.id}/payment`, {
      paymentMethod: paymentData.method,
      notes: paymentData.notes
    })
    
    // Update local
    const idx = projects.value.findIndex(p => p.id === selectedProject.value?.id)
    if (idx !== -1) {
      projects.value[idx].paymentStatus = 'paid'
      projects.value[idx].productionStatus = 'ready'
    }
    
    closePaymentModal()
    alert('✅ Pagamento confirmado! Projeto liberado para produção.')
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao confirmar pagamento')
  } finally {
    processing.value = false
  }
}

// Download and Production
const downloadFiles = async (project: Project) => {
  const token = localStorage.getItem('accessToken')
  
  try {
    // Buscar informações de download
    const response = await fetch(`/api/v1/admin/production/projects/${project.id}/download?token=${token}`)
    const data = await response.json()
    
    if (!data.success) {
      alert(data.message || 'Erro ao obter arquivos')
      return
    }
    
    // Mapear dados para o formato esperado pelo modal
    const mappedData = {
      coverUrl: data.downloads?.coverPdf,
      contentUrl: data.downloads?.contentPdf,
      fullUrl: data.downloads?.fullPdf,
      pages: data.downloads?.pages || [],
      projectName: data.projectName,
      pageCount: data.pageCount,
      format: data.format,
    }
    
    // Abrir modal de download
    selectedProject.value = project
    downloadData.value = mappedData
    showDownloadModal.value = true
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao obter arquivos para download')
  }
}

const closeDownloadModal = () => {
  showDownloadModal.value = false
  downloadData.value = null
}

const openDownloadLink = (url: string) => {
  window.open(url, '_blank')
}

const triggerDownload = async (type: 'cover' | 'content' | 'full') => {
  if (!selectedProject.value || downloadingType.value) return
  
  const token = localStorage.getItem('accessToken')
  let endpoint = ''
  
  switch (type) {
    case 'cover':
      endpoint = `/api/v1/render/project/${selectedProject.value.id}/cover-pdf?token=${token}`
      break
    case 'content':
      endpoint = `/api/v1/render/project/${selectedProject.value.id}/content-pdf?token=${token}`
      break
    case 'full':
      endpoint = `/api/v1/render/project/${selectedProject.value.id}/pdf?token=${token}`
      break
  }
  
  try {
    downloadingType.value = type
    
    // Chamar endpoint para gerar PDF
    const response = await fetch(endpoint)
    const data = await response.json()
    
    if (data.status === 'completed' && data.url) {
      // Abrir URL do PDF gerado
      window.open(data.url, '_blank')
    } else if (data.status === 'failed') {
      alert(`❌ Erro ao gerar PDF: ${data.error}`)
    } else {
      alert('❌ Erro desconhecido ao gerar PDF')
    }
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    alert('❌ Erro ao gerar PDF')
  } finally {
    downloadingType.value = null
  }
}

const downloadAndStartProduction = async (project: Project) => {
  // Download files
  downloadFiles(project)
  
  // Start production
  try {
    await api.post(`/api/v1/admin/production/projects/${project.id}/start`)
    
    const idx = projects.value.findIndex(p => p.id === project.id)
    if (idx !== -1) {
      projects.value[idx].productionStatus = 'producing'
    }
    
    alert('✅ Arquivos baixados e produção iniciada!')
  } catch (error) {
    console.error('Erro:', error)
  }
}

const completeProduction = async (project: Project) => {
  if (!confirm(`Concluir produção do projeto "${project.name}"?`)) return
  
  try {
    await api.post(`/api/v1/admin/production/projects/${project.id}/complete`)
    
    const idx = projects.value.findIndex(p => p.id === project.id)
    if (idx !== -1) {
      projects.value[idx].productionStatus = 'ready_ship'
    }
    
    alert('✅ Produção concluída! Projeto pronto para envio.')
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao concluir produção')
  }
}

// Shipping
const openShippingModal = (project: Project) => {
  selectedProject.value = project
  
  // Pre-fill with saved address if available
  if (project.shippingAddress) {
    Object.assign(shippingData, project.shippingAddress)
  } else {
    // Reset
    shippingData.recipientName = project.userName || ''
    shippingData.zipCode = ''
    shippingData.state = ''
    shippingData.city = ''
    shippingData.address = ''
    shippingData.complement = ''
    shippingData.neighborhood = ''
    shippingData.method = 'pac'
    shippingData.trackingCode = ''
  }
  
  showShippingModal.value = true
}

const closeShippingModal = () => {
  showShippingModal.value = false
  selectedProject.value = null
}

const fetchAddress = async () => {
  if (shippingData.zipCode.length < 8) return
  
  try {
    const cep = shippingData.zipCode.replace(/\D/g, '')
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await response.json()
    
    if (!data.erro) {
      shippingData.state = data.uf
      shippingData.city = data.localidade
      shippingData.address = data.logradouro
      shippingData.neighborhood = data.bairro
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
  }
}

const generateShippingLabel = async () => {
  if (!selectedProject.value || !isShippingValid.value) return
  
  processing.value = true
  try {
    // Generate tracking code if not provided
    const trackingCode = shippingData.trackingCode || `BR${Date.now().toString(36).toUpperCase()}`
    
    await api.post(`/api/v1/admin/production/projects/${selectedProject.value.id}/ship`, {
      shippingAddress: {
        recipientName: shippingData.recipientName,
        zipCode: shippingData.zipCode,
        state: shippingData.state,
        city: shippingData.city,
        address: shippingData.address,
        complement: shippingData.complement,
        neighborhood: shippingData.neighborhood,
      },
      shippingMethod: shippingData.method,
      trackingCode
    })
    
    // Update local
    const idx = projects.value.findIndex(p => p.id === selectedProject.value?.id)
    if (idx !== -1) {
      projects.value[idx].productionStatus = 'shipped'
      projects.value[idx].trackingCode = trackingCode
    }
    
    closeShippingModal()
    
    // Open print dialog for label
    printShippingLabel(selectedProject.value, trackingCode)
    
    alert(`✅ Etiqueta gerada!\nCódigo de rastreio: ${trackingCode}`)
  } catch (error) {
    console.error('Erro:', error)
    alert('Erro ao gerar etiqueta')
  } finally {
    processing.value = false
  }
}

const printShippingLabel = (project: Project, trackingCode: string) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  
  printWindow.document.write('<!DOCTYPE html><html><head><title>Etiqueta de Envio</title>')
  printWindow.document.write('<style>')
  printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }')
  printWindow.document.write('.label { border: 2px solid #000; padding: 20px; max-width: 400px; }')
  printWindow.document.write('.header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px; }')
  printWindow.document.write('.logo { font-size: 24px; font-weight: bold; }')
  printWindow.document.write('.tracking { font-size: 18px; font-weight: bold; margin: 10px 0; }')
  printWindow.document.write('.barcode { text-align: center; font-family: monospace; font-size: 14px; letter-spacing: 2px; }')
  printWindow.document.write('.address { margin: 15px 0; }')
  printWindow.document.write('.address h3 { margin: 0 0 5px 0; font-size: 14px; }')
  printWindow.document.write('.address p { margin: 2px 0; }')
  printWindow.document.write('.footer { border-top: 1px solid #000; padding-top: 10px; margin-top: 10px; font-size: 12px; }')
  printWindow.document.write('</style></head><body>')
  printWindow.document.write('<div class="label">')
  printWindow.document.write('<div class="header">')
  printWindow.document.write('<div class="logo">📦 FOCCUS FOTOLIVROS</div>')
  printWindow.document.write(`<div class="tracking">Rastreio: ${trackingCode}</div>`)
  printWindow.document.write(`<div class="barcode">||||| ${trackingCode} |||||</div>`)
  printWindow.document.write('</div>')
  printWindow.document.write('<div class="address">')
  printWindow.document.write('<h3>DESTINATÁRIO:</h3>')
  printWindow.document.write(`<p><strong>${shippingData.recipientName}</strong></p>`)
  printWindow.document.write(`<p>${shippingData.address}${shippingData.complement ? ', ' + shippingData.complement : ''}</p>`)
  printWindow.document.write(`<p>${shippingData.neighborhood}</p>`)
  printWindow.document.write(`<p>${shippingData.city} - ${shippingData.state}</p>`)
  printWindow.document.write(`<p><strong>CEP: ${shippingData.zipCode}</strong></p>`)
  printWindow.document.write('</div>')
  printWindow.document.write('<div class="footer">')
  printWindow.document.write(`<p>Pedido: #${project.id.slice(0, 8)}</p>`)
  printWindow.document.write(`<p>Produto: ${project.productName || 'Fotolivro'}</p>`)
  printWindow.document.write(`<p>Método: ${shippingData.method.toUpperCase()}</p>`)
  printWindow.document.write('</div></div>')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  printWindow.print()
}

const printProductLabel = (project: Project) => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  
  printWindow.document.write('<!DOCTYPE html><html><head><title>Etiqueta do Produto</title>')
  printWindow.document.write('<style>')
  printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }')
  printWindow.document.write('.label { border: 1px solid #000; padding: 15px; max-width: 300px; }')
  printWindow.document.write('.product-name { font-size: 16px; font-weight: bold; margin-bottom: 10px; }')
  printWindow.document.write('.details { font-size: 12px; }')
  printWindow.document.write('.details p { margin: 3px 0; }')
  printWindow.document.write('.qr { text-align: center; margin: 10px 0; font-size: 40px; }')
  printWindow.document.write('</style></head><body>')
  printWindow.document.write('<div class="label">')
  printWindow.document.write(`<div class="product-name">${project.name}</div>`)
  printWindow.document.write('<div class="qr">📖</div>')
  printWindow.document.write('<div class="details">')
  printWindow.document.write(`<p><strong>Pedido:</strong> #${project.id.slice(0, 8)}</p>`)
  printWindow.document.write(`<p><strong>Cliente:</strong> ${project.userName || 'Cliente'}</p>`)
  printWindow.document.write(`<p><strong>Produto:</strong> ${project.productName || 'Fotolivro'}</p>`)
  printWindow.document.write(`<p><strong>Páginas:</strong> ${project.pageCount || 20}</p>`)
  printWindow.document.write('</div></div>')
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  printWindow.print()
}

const copyTracking = (project: Project) => {
  if (project.trackingCode) {
    navigator.clipboard.writeText(project.trackingCode)
    alert(`📋 Código copiado: ${project.trackingCode}`)
  }
}

const viewProject = (project: Project) => {
  // Abrir em modo visualização (read-only)
  window.open(`/editor/${project.id}?mode=view`, '_blank')
}

// Manual status change
const changeStatus = async (project: Project, newStatus: string) => {
  if (project.productionStatus === newStatus) return
  
  const statusLabels: Record<string, string> = {
    pending: 'Aguardando Pagamento',
    ready: 'Liberado p/ Produção',
    producing: 'Em Produção',
    ready_ship: 'Pronto p/ Envio',
    shipped: 'Enviado'
  }
  
  if (!confirm(`Alterar status de "${project.name}" para "${statusLabels[newStatus]}"?`)) {
    // Reset select to original value
    loadProjects()
    return
  }
  
  try {
    await api.post(`/api/v1/admin/production/projects/${project.id}/status`, {
      productionStatus: newStatus
    })
    
    // Update local
    const idx = projects.value.findIndex(p => p.id === project.id)
    if (idx !== -1) {
      projects.value[idx].productionStatus = newStatus
      // Se mudou para paid/ready, atualizar paymentStatus também
      if (newStatus === 'ready' || newStatus === 'producing' || newStatus === 'ready_ship' || newStatus === 'shipped') {
        projects.value[idx].paymentStatus = 'paid'
      }
    }
    
    alert(`✅ Status alterado para "${statusLabels[newStatus]}"`)
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    alert('Erro ao alterar status')
    loadProjects() // Reload to reset
  }
}

onMounted(() => {
  loadProjects()
})
</script>


<style scoped>
.production-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.btn-refresh {
  padding: 8px 16px;
  background: #F7F4EE;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-refresh:hover {
  background: #EBE7E0;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.stat-card:hover {
  background: #f1f5f9;
}

.stat-card.active {
  border-color: #D4775C;
  background: #FFF5F2;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2D2A26;
}

.stat-label {
  font-size: 0.75rem;
  color: #6B6560;
}

/* Flow Indicator */
.flow-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 10px;
  margin-bottom: 20px;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 8px;
  opacity: 0.5;
}

.flow-step.active {
  opacity: 1;
  background: #D4775C;
  color: white;
}

.step-icon {
  font-size: 1.25rem;
}

.step-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.flow-arrow {
  color: #9CA3AF;
  font-size: 1.25rem;
}

/* Tab Header */
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #EBE7E0;
}

.tab-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.tab-count {
  color: #6B6560;
  font-size: 0.9rem;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 16px;
}

.project-card {
  background: #FAFAF8;
  border: 1px solid #EBE7E0;
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #EBE7E0;
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
  flex-shrink: 0;
}

.project-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-info {
  flex: 1;
}

.project-info h4 {
  margin: 0 0 4px 0;
  font-size: 0.95rem;
}

.project-id {
  font-size: 0.75rem;
  color: #9CA3AF;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.pending, .status-badge.waiting {
  background: #FEF3C7;
  color: #B45309;
}

.status-badge.ready {
  background: #DBEAFE;
  color: #1D4ED8;
}

.status-badge.producing {
  background: #EDE9FE;
  color: #7C3AED;
}

.status-badge.ready_ship {
  background: #D1FAE5;
  color: #047857;
}

.status-badge.shipped {
  background: #E0E7FF;
  color: #4338CA;
}

.card-details {
  padding: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 0.85rem;
}

.detail-row .label {
  color: #6B6560;
}

.detail-row .value {
  font-weight: 500;
  color: #2D2A26;
}

.detail-row .value.price {
  color: #D4775C;
  font-weight: 600;
}

.detail-row .value.tracking {
  font-family: monospace;
  background: #F3F4F6;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #E5E7EB;
}

.status-select {
  padding: 6px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
  min-width: 180px;
}

.status-select:hover {
  border-color: #D4775C;
}

.status-select:focus {
  outline: none;
  border-color: #D4775C;
  box-shadow: 0 0 0 2px rgba(212, 119, 92, 0.2);
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #EBE7E0;
  flex-wrap: wrap;
}

.btn-action {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-action.primary {
  background: #D4775C;
  color: white;
  flex: 1;
}

.btn-action.primary:hover {
  background: #C06A52;
}

.btn-action.secondary {
  background: #F3F4F6;
  color: #374151;
}

.btn-action.secondary:hover {
  background: #E5E7EB;
}

.btn-action.icon {
  width: 36px;
  padding: 8px;
  background: #F3F4F6;
}

.btn-action.icon:hover {
  background: #E5E7EB;
}

/* Empty & Loading States */
.empty-state, .loading-state {
  text-align: center;
  padding: 60px;
  color: #9CA3AF;
}

.empty-state span {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
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
  max-height: 90vh;
  overflow: auto;
}

.modal.shipping-modal {
  max-width: 560px;
}

.modal.download-modal {
  max-width: 500px;
}

.download-options h4 {
  margin: 0 0 16px 0;
  font-size: 0.95rem;
  color: #374151;
}

.download-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  margin-bottom: 12px;
}

.download-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.download-icon {
  font-size: 2rem;
}

.download-details {
  display: flex;
  flex-direction: column;
}

.download-name {
  font-weight: 600;
  color: #2D2A26;
}

.download-desc {
  font-size: 0.8rem;
  color: #6B6560;
}

.btn-download {
  padding: 10px 16px;
  background: #D4775C;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-download:hover {
  background: #C06A52;
}

.no-files {
  text-align: center;
  padding: 30px;
  color: #9CA3AF;
}

.no-files span {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 10px;
}

.no-files .hint {
  font-size: 0.85rem;
  margin-top: 8px;
}

.loading-download {
  text-align: center;
  padding: 40px;
  color: #6B6560;
}

.download-note {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  background: #FEF3C7;
  border-radius: 8px;
  margin-top: 16px;
}

.download-note span {
  font-size: 1.2rem;
}

.download-note p {
  margin: 0;
  font-size: 0.85rem;
  color: #92400E;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #EBE7E0;
  position: sticky;
  top: 0;
  background: white;
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

.form-group input,
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.shipping-address h4,
.shipping-method h4 {
  margin: 0 0 12px 0;
  font-size: 0.95rem;
  color: #374151;
}

.shipping-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shipping-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #E5E7EB;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.shipping-option:hover {
  border-color: #D4775C;
}

.shipping-option.selected {
  border-color: #D4775C;
  background: #FFF5F2;
}

.shipping-option input {
  width: auto;
}

.option-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.option-name {
  font-weight: 600;
}

.option-time {
  font-size: 0.8rem;
  color: #6B6560;
}

.option-price {
  font-weight: 600;
  color: #D4775C;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #EBE7E0;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: white;
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

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .flow-indicator {
    display: none;
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
