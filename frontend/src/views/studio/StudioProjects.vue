<template>
  <div class="projects-page">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <router-link to="/studio" class="logo">
          <div class="logo-icon">F</div>
          <span>Foccus Studio</span>
        </router-link>
      </div>
      
      <nav class="sidebar-nav">
        <router-link to="/studio" class="nav-item">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </router-link>
        <router-link to="/studio/projects" class="nav-item active">
          <span class="nav-icon">📁</span>
          <span>Projetos</span>
          <span class="nav-badge" v-if="projects.length">{{ projects.length }}</span>
        </router-link>
        <router-link to="/studio/clients" class="nav-item">
          <span class="nav-icon">👥</span>
          <span>Clientes</span>
        </router-link>
        <router-link to="/studio/orders" class="nav-item">
          <span class="nav-icon">📦</span>
          <span>Pedidos</span>
        </router-link>
        <router-link to="/studio/upload" class="nav-item">
          <span class="nav-icon">📤</span>
          <span>Upload</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/studio/settings" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span>Configurações</span>
        </router-link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="top-left">
          <h1>Meus Projetos</h1>
          <span class="project-count">{{ filteredProjects.length }} projetos</span>
        </div>
        <div class="top-right">
          <div class="search-box">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input v-model="searchQuery" type="text" placeholder="Buscar projetos..." />
          </div>
          <button class="btn-new-project" @click="showWizard = true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo Projeto
          </button>
        </div>
      </header>

      <!-- Filters & View Toggle -->
      <div class="filters-bar">
        <div class="filter-tabs">
          <button 
            :class="['filter-tab', { active: filterStatus === '' }]"
            @click="filterStatus = ''"
          >
            Todos
            <span class="tab-count">{{ projects.length }}</span>
          </button>
          <button 
            :class="['filter-tab', { active: filterStatus === 'draft' }]"
            @click="filterStatus = 'draft'"
          >
            Rascunhos
            <span class="tab-count">{{ getStatusCount('draft') }}</span>
          </button>
          <button 
            :class="['filter-tab', { active: filterStatus === 'editing' }]"
            @click="filterStatus = 'editing'"
          >
            Em Edição
            <span class="tab-count">{{ getStatusCount('editing') }}</span>
          </button>
          <button 
            :class="['filter-tab', { active: filterStatus === 'pending_approval' }]"
            @click="filterStatus = 'pending_approval'"
          >
            Aguardando
            <span class="tab-count">{{ getStatusCount('pending_approval') }}</span>
          </button>
          <button 
            :class="['filter-tab', { active: filterStatus === 'approved' }]"
            @click="filterStatus = 'approved'"
          >
            Aprovados
            <span class="tab-count">{{ getStatusCount('approved') }}</span>
          </button>
          <button 
            :class="['filter-tab', { active: filterStatus === 'production' }]"
            @click="filterStatus = 'production'"
          >
            Produção
            <span class="tab-count">{{ getStatusCount('production') }}</span>
          </button>
        </div>
        <div class="view-options">
          <button 
            :class="['view-btn', { active: viewMode === 'grid' }]"
            @click="viewMode = 'grid'"
            title="Grade"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'list' }]"
            @click="viewMode = 'list'"
            title="Lista"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="4" width="18" height="4" rx="1"/><rect x="3" y="10" width="18" height="4" rx="1"/>
              <rect x="3" y="16" width="18" height="4" rx="1"/>
            </svg>
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'kanban' }]"
            @click="viewMode = 'kanban'"
            title="Kanban"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/>
              <rect x="17" y="3" width="5" height="15" rx="1"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Selection Bar -->
      <div v-if="selectedProjects.size > 0" class="selection-bar">
        <span>{{ selectedProjects.size }} selecionado(s)</span>
        <button class="btn-action" @click="addSelectedToCart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Adicionar ao Carrinho
        </button>
        <button class="btn-action danger" @click="deleteSelected">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Excluir
        </button>
        <button class="btn-clear" @click="selectedProjects.clear()">✕ Limpar</button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <p>Carregando projetos...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProjects.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
        </div>
        <h3>Nenhum projeto encontrado</h3>
        <p v-if="searchQuery">Tente buscar com outros termos</p>
        <p v-else>Crie seu primeiro projeto para começar</p>
        <button class="btn-primary" @click="showWizard = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Criar Projeto
        </button>
      </div>

      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="projects-grid">
        <div 
          v-for="project in filteredProjects" 
          :key="project.id" 
          class="project-card"
          :class="{ selected: selectedProjects.has(project.id) }"
        >
          <div class="card-select">
            <input 
              type="checkbox" 
              :checked="selectedProjects.has(project.id)"
              @change="toggleSelection(project.id)"
            />
          </div>
          <div class="card-thumbnail" @click="openProject(project)">
            <img v-if="project.thumbnail || project.coverUrl" :src="project.thumbnail || project.coverUrl" alt="" />
            <div v-else class="thumb-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
            <div class="card-status" :class="project.status || 'draft'">
              {{ getStatusLabel(project.status) }}
            </div>
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ project.name }}</h3>
            <p class="card-product">{{ project.productName || 'Fotolivro' }}</p>
            <div class="card-meta">
              <span>📄 {{ project.pageCount || 20 }} páginas</span>
              <span>{{ formatDate(project.updatedAt) }}</span>
            </div>
            
            <!-- Review Feedback Panel -->
            <div v-if="project.reviewData" class="review-panel" :class="getReviewClass(project)">
              <div class="review-header">
                <span class="review-icon">{{ getReviewIcon(project) }}</span>
                <span class="review-title">{{ getReviewTitle(project) }}</span>
              </div>
              <div class="review-stats">
                <span class="stat approved">✓ {{ getApprovedCount(project) }}</span>
                <span class="stat revision">✏️ {{ getRevisionCount(project) }}</span>
              </div>
              <button 
                v-if="hasRevisionComments(project)" 
                class="btn-view-feedback"
                @click.stop="openReviewModal(project)"
              >
                Ver Comentários
              </button>
            </div>
            
            <!-- Approval Link Info -->
            <div v-if="project.approvalLink" class="approval-link-info">
              <span class="link-icon">🔗</span>
              <span class="link-text">Link enviado para {{ project.clientName || 'cliente' }}</span>
              <button class="btn-copy-link" @click.stop="copyApprovalLink(project)" title="Copiar link">
                📋
              </button>
            </div>
          </div>
          <div class="card-actions">
            <button class="action-btn" @click="openProject(project)" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="action-btn" @click="duplicateProject(project)" title="Duplicar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
            <button class="action-btn" @click="sendForApproval(project)" title="Enviar para aprovação">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
            <button class="action-btn danger" @click="deleteProject(project)" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else-if="viewMode === 'list'" class="projects-list">
        <div class="list-header">
          <div class="col-check"><input type="checkbox" @change="toggleSelectAll" /></div>
          <div class="col-project">Projeto</div>
          <div class="col-status">Status</div>
          <div class="col-pages">Páginas</div>
          <div class="col-date">Atualizado</div>
          <div class="col-actions">Ações</div>
        </div>
        <div 
          v-for="project in filteredProjects" 
          :key="project.id" 
          class="list-row"
          :class="{ selected: selectedProjects.has(project.id) }"
        >
          <div class="col-check">
            <input 
              type="checkbox" 
              :checked="selectedProjects.has(project.id)"
              @change="toggleSelection(project.id)"
            />
          </div>
          <div class="col-project" @click="openProject(project)">
            <div class="project-thumb">
              <img v-if="project.thumbnail || project.coverUrl" :src="project.thumbnail || project.coverUrl" alt="" />
              <div v-else class="thumb-placeholder-sm">📷</div>
            </div>
            <div class="project-info">
              <h4>{{ project.name }}</h4>
              <span>{{ project.productName || 'Fotolivro' }}</span>
            </div>
          </div>
          <div class="col-status">
            <span class="status-badge" :class="project.status || 'draft'">
              {{ getStatusLabel(project.status) }}
            </span>
          </div>
          <div class="col-pages">{{ project.pageCount || 20 }}</div>
          <div class="col-date">{{ formatDate(project.updatedAt) }}</div>
          <div class="col-actions">
            <button class="action-btn-sm" @click="openProject(project)">✏️</button>
            <button class="action-btn-sm" @click="duplicateProject(project)">📋</button>
            <button class="action-btn-sm danger" @click="deleteProject(project)">🗑️</button>
          </div>
        </div>
      </div>

      <!-- Kanban View -->
      <div v-else-if="viewMode === 'kanban'" class="kanban-board">
        <div 
          v-for="column in kanbanColumns" 
          :key="column.id" 
          class="kanban-column"
          @dragover.prevent="dragOverColumn = column.id"
          @dragleave="dragOverColumn = null"
          @drop="handleDrop(column.id)"
        >
          <div class="column-header" :class="column.id">
            <span class="column-icon">{{ column.icon }}</span>
            <span class="column-title">{{ column.title }}</span>
            <span class="column-count">{{ getColumnProjects(column.id).length }}</span>
          </div>
          <div class="column-body" :class="{ 'drag-over': dragOverColumn === column.id }">
            <div 
              v-for="project in getColumnProjects(column.id)" 
              :key="project.id"
              class="kanban-card"
              draggable="true"
              @dragstart="handleDragStart(project)"
              @dragend="draggingProject = null"
              @click="openProject(project)"
            >
              <div class="kanban-thumb">
                <img v-if="project.thumbnail || project.coverUrl" :src="project.thumbnail || project.coverUrl" alt="" />
                <span v-else>📷</span>
              </div>
              <div class="kanban-info">
                <h4>{{ project.name }}</h4>
                <span>{{ project.pageCount || 20 }} páginas</span>
              </div>
            </div>
            <div v-if="getColumnProjects(column.id).length === 0" class="column-empty">
              Nenhum projeto
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- New Project Modal -->
    <Teleport to="body">
      <div v-if="showWizard" class="modal-overlay" @click.self="showWizard = false">
        <div class="wizard-modal">
          <button class="modal-close" @click="showWizard = false">✕</button>
          
          <!-- Steps -->
          <div class="wizard-steps">
            <div :class="['step', { active: wizardStep === 1, done: wizardStep > 1 }]">
              <span class="step-num">1</span>
              <span class="step-text">Produto</span>
            </div>
            <div class="step-line" :class="{ done: wizardStep > 1 }"></div>
            <div :class="['step', { active: wizardStep === 2, done: wizardStep > 2 }]">
              <span class="step-num">2</span>
              <span class="step-text">Configurar</span>
            </div>
            <div class="step-line" :class="{ done: wizardStep > 2 }"></div>
            <div :class="['step', { active: wizardStep === 3 }]">
              <span class="step-num">3</span>
              <span class="step-text">Criar</span>
            </div>
          </div>

          <!-- Step 1: Product -->
          <div v-if="wizardStep === 1" class="wizard-content">
            <h2>Escolha o Produto</h2>
            <p>Selecione o tipo de álbum que deseja criar</p>
            
            <div class="product-grid">
              <div 
                v-for="product in availableProducts" 
                :key="product.id"
                :class="['product-option', { selected: newProject.productId === product.id }]"
                @click="selectProduct(product)"
              >
                <div class="product-icon">📖</div>
                <h4>{{ product.name }}</h4>
                <p>{{ product.category }}</p>
                <span class="product-price">A partir de R$ {{ formatPrice(product.basePrice) }}</span>
              </div>
            </div>
          </div>

          <!-- Step 2: Configure -->
          <div v-if="wizardStep === 2" class="wizard-content">
            <h2>Configure o Projeto</h2>
            <p>Defina as especificações do seu álbum</p>

            <div class="config-form">
              <div class="form-group">
                <label>Nome do Projeto</label>
                <input v-model="newProject.name" type="text" placeholder="Ex: Casamento Maria & João" />
              </div>

              <div class="form-group">
                <label>Formato</label>
                <div class="format-grid">
                  <div 
                    v-for="format in selectedProductData?.formats || []" 
                    :key="format.id"
                    :class="['format-option', { selected: newProject.formatId === format.id }]"
                    @click="newProject.formatId = format.id"
                  >
                    <span class="format-name">{{ format.name }}</span>
                    <span class="format-size">{{ format.width/10 }}×{{ format.height/10 }}cm</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label>Páginas</label>
                <div class="page-selector">
                  <button @click="newProject.pageCount = Math.max(20, newProject.pageCount - 2)">−</button>
                  <span>{{ newProject.pageCount }}</span>
                  <button @click="newProject.pageCount = Math.min(80, newProject.pageCount + 2)">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Create -->
          <div v-if="wizardStep === 3" class="wizard-content">
            <h2>Como deseja criar?</h2>
            <p>Escolha o método de criação do projeto</p>

            <div class="method-grid">
              <div 
                :class="['method-option', { selected: creationMethod === 'editor' }]"
                @click="creationMethod = 'editor'"
              >
                <div class="method-icon">🎨</div>
                <h4>Editor Online</h4>
                <p>Monte o álbum com nossas ferramentas</p>
              </div>
              <div 
                :class="['method-option', { selected: creationMethod === 'upload' }]"
                @click="creationMethod = 'upload'"
              >
                <div class="method-icon">📤</div>
                <h4>Upload PDF</h4>
                <p>Envie um arquivo pronto</p>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="wizard-footer">
            <button v-if="wizardStep > 1" class="btn-back" @click="wizardStep--">
              ← Voltar
            </button>
            <div class="spacer"></div>
            <button v-if="wizardStep < 3" class="btn-next" @click="wizardStep++" :disabled="!canProceed">
              Continuar →
            </button>
            <button v-else class="btn-create" @click="createProject" :disabled="creating">
              {{ creating ? 'Criando...' : 'Criar Projeto' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Review Feedback Modal -->
      <div v-if="showReviewModal && reviewProject" class="modal-overlay" @click.self="closeReviewModal">
        <div class="review-modal">
          <div class="review-modal-header">
            <h3>📋 Feedback do Cliente</h3>
            <button class="modal-close" @click="closeReviewModal">✕</button>
          </div>
          
          <div class="review-modal-body">
            <div class="review-project-info">
              <h4>{{ reviewProject.name }}</h4>
              <p>{{ reviewProject.clientName || 'Cliente' }} • {{ formatDate(reviewProject.reviewData?.lastUpdated) }}</p>
            </div>

            <!-- Summary -->
            <div class="review-summary">
              <div class="summary-item approved">
                <span class="num">{{ getApprovedCount(reviewProject) }}</span>
                <span class="label">Aprovadas</span>
              </div>
              <div class="summary-item revision">
                <span class="num">{{ getRevisionCount(reviewProject) }}</span>
                <span class="label">Revisão</span>
              </div>
            </div>

            <!-- Comments List -->
            <div class="comments-section">
              <h4>💬 Comentários do Cliente</h4>
              <div v-if="getReviewComments(reviewProject).length" class="comments-list">
                <div 
                  v-for="(comment, idx) in getReviewComments(reviewProject)" 
                  :key="idx" 
                  class="comment-card"
                  :class="comment.status"
                >
                  <div class="comment-page">
                    <span class="page-badge" :class="comment.status">
                      {{ comment.status === 'revision' ? '✏️' : '✓' }}
                    </span>
                    Página {{ comment.page }}
                  </div>
                  <p class="comment-text">{{ comment.text }}</p>
                </div>
              </div>
              <div v-else class="no-comments">
                <p>Nenhum comentário do cliente</p>
              </div>
            </div>
          </div>

          <div class="review-modal-footer">
            <button class="btn-secondary" @click="closeReviewModal">Fechar</button>
            <button class="btn-primary" @click="openProject(reviewProject); closeReviewModal()">
              ✏️ Editar Projeto
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { studioService } from '@/services/studio'
import { catalogService } from '@/services/catalog'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const creating = ref(false)
const searchQuery = ref('')
const filterStatus = ref('')
const viewMode = ref<'grid' | 'list' | 'kanban'>('grid')
const projects = ref<any[]>([])
const selectedProjects = ref<Set<string>>(new Set())
const showWizard = ref(false)
const wizardStep = ref(1)
const creationMethod = ref<'editor' | 'upload'>('editor')
const availableProducts = ref<any[]>([])
const draggingProject = ref<any>(null)
const dragOverColumn = ref<string | null>(null)

const newProject = reactive({
  name: '',
  productId: '',
  formatId: '',
  pageCount: 20
})

const kanbanColumns = [
  { id: 'draft', title: 'Rascunho', icon: '📝' },
  { id: 'editing', title: 'Em Edição', icon: '✏️' },
  { id: 'pending_approval', title: 'Aguardando', icon: '⏳' },
  { id: 'approved', title: 'Aprovado', icon: '✅' },
  { id: 'production', title: 'Produção', icon: '🏭' },
  { id: 'completed', title: 'Concluído', icon: '🎉' }
]

const filteredProjects = computed(() => {
  let result = projects.value
  if (filterStatus.value) {
    result = result.filter(p => (p.status || 'draft') === filterStatus.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => p.name?.toLowerCase().includes(q))
  }
  return result
})

const selectedProductData = computed(() => 
  availableProducts.value.find(p => p.id === newProject.productId)
)

const canProceed = computed(() => {
  if (wizardStep.value === 1) return !!newProject.productId
  if (wizardStep.value === 2) return !!newProject.name && !!newProject.formatId
  return true
})

onMounted(async () => {
  await loadProjects()
  await loadProducts()
  
  // Check if should open wizard from query params
  if (route.query.newProject === 'true') {
    showWizard.value = true
  }
})

const loadProjects = async () => {
  loading.value = true
  try {
    projects.value = await studioService.getProjects()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadProducts = async () => {
  try {
    availableProducts.value = await catalogService.getProducts()
  } catch (e) {
    console.error(e)
  }
}

const getStatusCount = (status: string) => 
  projects.value.filter(p => (p.status || 'draft') === status).length

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    editing: 'Em Edição',
    pending_approval: 'Aguardando',
    approved: 'Aprovado',
    production: 'Produção',
    completed: 'Concluído'
  }
  return labels[status || 'draft'] || status
}

const getColumnProjects = (columnId: string) => 
  projects.value.filter(p => (p.status || 'draft') === columnId)

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

const formatPrice = (price: number) => {
  return (price || 0).toFixed(2).replace('.', ',')
}

const toggleSelection = (id: string) => {
  if (selectedProjects.value.has(id)) {
    selectedProjects.value.delete(id)
  } else {
    selectedProjects.value.add(id)
  }
}

const toggleSelectAll = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) {
    filteredProjects.value.forEach(p => selectedProjects.value.add(p.id))
  } else {
    selectedProjects.value.clear()
  }
}

const openProject = (project: any) => {
  router.push(`/editor?projectId=${project.id}`)
}

const duplicateProject = async (project: any) => {
  try {
    await studioService.duplicateProject(project.id)
    await loadProjects()
  } catch (e) {
    console.error(e)
  }
}

const deleteProject = async (project: any) => {
  if (!confirm(`Excluir "${project.name}"?`)) return
  try {
    await studioService.deleteProject(project.id)
    await loadProjects()
  } catch (e) {
    console.error(e)
  }
}

const deleteSelected = async () => {
  if (!confirm(`Excluir ${selectedProjects.value.size} projetos?`)) return
  for (const id of selectedProjects.value) {
    await studioService.deleteProject(id)
  }
  selectedProjects.value.clear()
  await loadProjects()
}

const addSelectedToCart = () => {
  alert('Funcionalidade em desenvolvimento')
}

const sendForApproval = (project: any) => {
  alert('Funcionalidade em desenvolvimento')
}

const selectProduct = (product: any) => {
  newProject.productId = product.id
  if (product.formats?.length) {
    newProject.formatId = product.formats[0].id
  }
}

const createProject = async () => {
  creating.value = true
  try {
    const format = selectedProductData.value?.formats?.find((f: any) => f.id === newProject.formatId)
    const project = await studioService.createProject({
      name: newProject.name,
      productId: newProject.productId,
      formatId: newProject.formatId,
      pageCount: newProject.pageCount,
      width: format?.width || 300,
      height: format?.height || 300
    })
    showWizard.value = false
    router.push(`/editor?projectId=${project.id}`)
  } catch (e) {
    console.error(e)
    alert('Erro ao criar projeto')
  } finally {
    creating.value = false
  }
}

const handleDragStart = (project: any) => {
  draggingProject.value = project
}

const handleDrop = async (columnId: string) => {
  if (!draggingProject.value) return
  try {
    await studioService.updateProject(draggingProject.value.id, { status: columnId })
    await loadProjects()
  } catch (e) {
    console.error(e)
  }
  draggingProject.value = null
  dragOverColumn.value = null
}

// Review Modal
const showReviewModal = ref(false)
const reviewProject = ref<any>(null)

// Review helper functions
const getReviewClass = (project: any) => {
  if (!project.reviewData) return ''
  const statuses = Object.values(project.reviewData.statuses || {})
  const hasRevision = statuses.includes('revision')
  const allApproved = statuses.length > 0 && statuses.every(s => s === 'approved')
  if (hasRevision) return 'has-revision'
  if (allApproved) return 'all-approved'
  return 'pending'
}

const getReviewIcon = (project: any) => {
  const cls = getReviewClass(project)
  if (cls === 'has-revision') return '⚠️'
  if (cls === 'all-approved') return '✅'
  return '⏳'
}

const getReviewTitle = (project: any) => {
  const cls = getReviewClass(project)
  if (cls === 'has-revision') return 'Revisão Solicitada'
  if (cls === 'all-approved') return 'Aprovado pelo Cliente'
  return 'Aguardando Revisão'
}

const getApprovedCount = (project: any) => {
  if (!project.reviewData?.statuses) return 0
  return Object.values(project.reviewData.statuses).filter(s => s === 'approved').length
}

const getRevisionCount = (project: any) => {
  if (!project.reviewData?.statuses) return 0
  return Object.values(project.reviewData.statuses).filter(s => s === 'revision').length
}

const hasRevisionComments = (project: any) => {
  if (!project.reviewData?.comments) return false
  return Object.values(project.reviewData.comments).some((c: any) => c && c.length > 0)
}

const openReviewModal = (project: any) => {
  reviewProject.value = project
  showReviewModal.value = true
}

const closeReviewModal = () => {
  showReviewModal.value = false
  reviewProject.value = null
}

const copyApprovalLink = async (project: any) => {
  if (!project.approvalLink) return
  try {
    await navigator.clipboard.writeText(project.approvalLink)
    alert('Link copiado!')
  } catch (e) {
    console.error(e)
  }
}

const getReviewComments = (project: any) => {
  if (!project.reviewData?.comments) return []
  const comments: any[] = []
  Object.entries(project.reviewData.comments).forEach(([pageIdx, pageComments]: [string, any]) => {
    if (pageComments && pageComments.length) {
      pageComments.forEach((c: any) => {
        comments.push({
          page: parseInt(pageIdx) + 1,
          text: c.text,
          status: project.reviewData.statuses?.[pageIdx] || 'pending'
        })
      })
    }
  })
  return comments
}
</script>

<style scoped>
.projects-page {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: #1a1a2e;
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #fff;
}

.logo-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.logo span {
  font-weight: 600;
  font-size: 16px;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.nav-item.active {
  background: rgba(212, 119, 92, 0.2);
  color: #D4775C;
}

.nav-icon {
  font-size: 18px;
}

.nav-badge {
  margin-left: auto;
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 24px 32px;
}

/* Top Bar */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.top-left h1 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.project-count {
  color: #6c757d;
  font-size: 14px;
}

.top-right {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 16px;
  width: 280px;
}

.search-icon {
  width: 18px;
  height: 18px;
  color: #9e9e9e;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 14px;
}

.btn-new-project {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-new-project:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.4);
}

.btn-new-project svg {
  width: 18px;
  height: 18px;
}

/* Filters Bar */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  color: #6c757d;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  border-color: #D4775C;
  color: #D4775C;
}

.filter-tab.active {
  background: #D4775C;
  border-color: #D4775C;
  color: #fff;
}

.tab-count {
  background: rgba(0,0,0,0.1);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
}

.filter-tab.active .tab-count {
  background: rgba(255,255,255,0.2);
}

.view-options {
  display: flex;
  gap: 4px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 4px;
}

.view-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #9e9e9e;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn:hover {
  background: #f5f5f5;
  color: #1a1a2e;
}

.view-btn.active {
  background: #1a1a2e;
  color: #fff;
}

.view-btn svg {
  width: 18px;
  height: 18px;
}

/* Selection Bar */
.selection-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #e3f2fd;
  border-radius: 10px;
  margin-bottom: 20px;
}

.selection-bar span {
  font-weight: 500;
  color: #1565c0;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #1565c0;
  border-radius: 8px;
  color: #1565c0;
  font-size: 13px;
  cursor: pointer;
}

.btn-action.danger {
  border-color: #d32f2f;
  color: #d32f2f;
}

.btn-action svg {
  width: 16px;
  height: 16px;
}

.btn-clear {
  margin-left: auto;
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
}

/* Loading & Empty States */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loader {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #D4775C;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon svg {
  width: 80px;
  height: 80px;
  color: #bdbdbd;
}

.empty-state h3 {
  margin: 20px 0 8px;
  color: #1a1a2e;
}

.empty-state p {
  color: #6c757d;
  margin-bottom: 24px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

/* Grid View */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.project-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.3s;
  position: relative;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

.project-card.selected {
  box-shadow: 0 0 0 2px #D4775C;
}

.card-select {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
}

.card-select input {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.card-thumbnail {
  position: relative;
  height: 180px;
  background: #f5f5f5;
  cursor: pointer;
}

.card-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bdbdbd;
}

.thumb-placeholder svg {
  width: 48px;
  height: 48px;
}

.card-status {
  position: absolute;
  bottom: 12px;
  left: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.card-status.draft { background: #e0e0e0; color: #616161; }
.card-status.editing { background: #fff3e0; color: #e65100; }
.card-status.pending_approval { background: #e3f2fd; color: #1565c0; }
.card-status.approved { background: #e8f5e9; color: #2e7d32; }
.card-status.production { background: #f3e5f5; color: #7b1fa2; }
.card-status.completed { background: #e0f2f1; color: #00695c; }

.card-body {
  padding: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-product {
  font-size: 13px;
  color: #6c757d;
  margin: 0 0 12px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9e9e9e;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 8px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  color: #616161;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #e0e0e0;
}

.action-btn.danger:hover {
  background: #ffebee;
  color: #d32f2f;
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

/* List View */
.projects-list {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.list-header {
  display: grid;
  grid-template-columns: 40px 1fr 120px 80px 100px 120px;
  gap: 16px;
  padding: 12px 20px;
  background: #f8f9fa;
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
}

.list-row {
  display: grid;
  grid-template-columns: 40px 1fr 120px 80px 100px 120px;
  gap: 16px;
  padding: 16px 20px;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s;
}

.list-row:hover {
  background: #f8f9fa;
}

.list-row.selected {
  background: #e3f2fd;
}

.col-project {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.project-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f5;
}

.project-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder-sm {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.project-info h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.project-info span {
  font-size: 12px;
  color: #6c757d;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status-badge.draft { background: #e0e0e0; color: #616161; }
.status-badge.editing { background: #fff3e0; color: #e65100; }
.status-badge.pending_approval { background: #e3f2fd; color: #1565c0; }
.status-badge.approved { background: #e8f5e9; color: #2e7d32; }
.status-badge.production { background: #f3e5f5; color: #7b1fa2; }
.status-badge.completed { background: #e0f2f1; color: #00695c; }

.col-pages, .col-date {
  font-size: 13px;
  color: #6c757d;
}

.col-actions {
  display: flex;
  gap: 8px;
}

.action-btn-sm {
  padding: 6px 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.action-btn-sm:hover {
  background: #e0e0e0;
}

.action-btn-sm.danger:hover {
  background: #ffebee;
}

/* Kanban View */
.kanban-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 20px;
}

.kanban-column {
  flex: 0 0 260px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  font-weight: 600;
  font-size: 14px;
}

.column-header.draft { background: #f5f5f5; }
.column-header.editing { background: #fff3e0; }
.column-header.pending_approval { background: #e3f2fd; }
.column-header.approved { background: #e8f5e9; }
.column-header.production { background: #f3e5f5; }
.column-header.completed { background: #e0f2f1; }

.column-count {
  margin-left: auto;
  background: rgba(0,0,0,0.1);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.column-body {
  padding: 12px;
  min-height: 300px;
  transition: background 0.2s;
}

.column-body.drag-over {
  background: #e3f2fd;
}

.kanban-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: grab;
  transition: all 0.2s;
}

.kanban-card:hover {
  background: #f0f0f0;
}

.kanban-thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.kanban-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.kanban-info h4 {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
}

.kanban-info span {
  font-size: 11px;
  color: #6c757d;
}

.column-empty {
  text-align: center;
  padding: 40px 20px;
  color: #9e9e9e;
  font-size: 13px;
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

.wizard-modal {
  background: #fff;
  border-radius: 20px;
  width: 600px;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  z-index: 10;
}

/* Wizard Steps */
.wizard-steps {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f8f9fa;
}

.step {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e0e0e0;
  color: #9e9e9e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.step.active .step-num {
  background: #D4775C;
  color: #fff;
}

.step.done .step-num {
  background: #4caf50;
  color: #fff;
}

.step-text {
  font-size: 13px;
  color: #9e9e9e;
}

.step.active .step-text {
  color: #1a1a2e;
  font-weight: 600;
}

.step-line {
  width: 40px;
  height: 2px;
  background: #e0e0e0;
  margin: 0 12px;
}

.step-line.done {
  background: #4caf50;
}

/* Wizard Content */
.wizard-content {
  padding: 32px;
}

.wizard-content h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #1a1a2e;
}

.wizard-content > p {
  color: #6c757d;
  margin-bottom: 24px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.product-option {
  padding: 20px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.product-option:hover {
  border-color: #D4775C;
}

.product-option.selected {
  border-color: #D4775C;
  background: rgba(212, 119, 92, 0.05);
}

.product-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.product-option h4 {
  margin: 0 0 4px;
  font-size: 16px;
}

.product-option p {
  margin: 0 0 8px;
  font-size: 13px;
  color: #6c757d;
}

.product-price {
  font-size: 14px;
  font-weight: 600;
  color: #D4775C;
}

/* Config Form */
.config-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #1a1a2e;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
}

.format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.format-option {
  padding: 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option:hover {
  border-color: #D4775C;
}

.format-option.selected {
  border-color: #D4775C;
  background: rgba(212, 119, 92, 0.05);
}

.format-name {
  display: block;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.format-size {
  font-size: 12px;
  color: #6c757d;
}

.page-selector {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-selector button {
  width: 40px;
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  font-size: 20px;
  cursor: pointer;
}

.page-selector button:hover {
  background: #f5f5f5;
}

.page-selector span {
  font-size: 18px;
  font-weight: 600;
  min-width: 100px;
  text-align: center;
}

/* Method Grid */
.method-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.method-option {
  padding: 24px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.method-option:hover {
  border-color: #D4775C;
}

.method-option.selected {
  border-color: #D4775C;
  background: rgba(212, 119, 92, 0.05);
}

.method-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.method-option h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.method-option p {
  margin: 0;
  font-size: 13px;
  color: #6c757d;
}

/* Wizard Footer */
.wizard-footer {
  display: flex;
  align-items: center;
  padding: 20px 32px;
  border-top: 1px solid #e0e0e0;
}

.spacer {
  flex: 1;
}

.btn-back {
  padding: 12px 24px;
  background: transparent;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-next, .btn-create {
  padding: 12px 24px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-next:disabled, .btn-create:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    width: 70px;
  }
  
  .sidebar-header .logo span,
  .nav-item span:not(.nav-icon),
  .nav-badge {
    display: none;
  }
  
  .main-content {
    margin-left: 70px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  
  .main-content {
    margin-left: 0;
    padding: 16px;
  }
  
  .top-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .top-right {
    flex-direction: column;
  }
  
  .search-box {
    width: 100%;
  }
  
  .filter-tabs {
    overflow-x: auto;
    padding-bottom: 8px;
  }
  
  .projects-grid {
    grid-template-columns: 1fr;
  }
  
  .wizard-modal {
    width: 95%;
    margin: 20px;
  }
  
  .product-grid, .format-grid, .method-grid {
    grid-template-columns: 1fr;
  }
}

/* Review Panel in Card */
.review-panel {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f5f5;
}

.review-panel.has-revision {
  background: #fff3e0;
  border-left: 3px solid #ff9800;
}

.review-panel.all-approved {
  background: #e8f5e9;
  border-left: 3px solid #4caf50;
}

.review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.review-icon {
  font-size: 16px;
}

.review-title {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
}

.review-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.review-stats .stat {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.review-stats .stat.approved {
  color: #2e7d32;
}

.review-stats .stat.revision {
  color: #e65100;
}

.btn-view-feedback {
  width: 100%;
  padding: 6px 12px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 12px;
  color: #1a1a2e;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view-feedback:hover {
  background: #f5f5f5;
  border-color: #D4775C;
  color: #D4775C;
}

/* Approval Link Info */
.approval-link-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 10px;
  background: #e3f2fd;
  border-radius: 6px;
  font-size: 11px;
  color: #1565c0;
}

.link-icon {
  font-size: 14px;
}

.link-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-copy-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
}

.btn-copy-link:hover {
  transform: scale(1.1);
}

/* Review Modal */
.review-modal {
  background: #fff;
  border-radius: 16px;
  width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.review-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.review-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #1a1a2e;
}

.review-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.review-project-info {
  margin-bottom: 20px;
}

.review-project-info h4 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #1a1a2e;
}

.review-project-info p {
  margin: 0;
  font-size: 13px;
  color: #6c757d;
}

.review-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.review-summary .summary-item {
  flex: 1;
  text-align: center;
  padding: 16px;
  border-radius: 12px;
  background: #f5f5f5;
}

.review-summary .summary-item.approved {
  background: #e8f5e9;
}

.review-summary .summary-item.revision {
  background: #fff3e0;
}

.review-summary .num {
  display: block;
  font-size: 28px;
  font-weight: 700;
}

.review-summary .summary-item.approved .num {
  color: #2e7d32;
}

.review-summary .summary-item.revision .num {
  color: #e65100;
}

.review-summary .label {
  font-size: 12px;
  color: #6c757d;
  text-transform: uppercase;
}

.comments-section h4 {
  margin: 0 0 16px;
  font-size: 14px;
  color: #1a1a2e;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-card {
  padding: 14px;
  border-radius: 10px;
  background: #f8f9fa;
  border-left: 3px solid #e0e0e0;
}

.comment-card.revision {
  background: #fff8e1;
  border-left-color: #ff9800;
}

.comment-card.approved {
  background: #f1f8e9;
  border-left-color: #8bc34a;
}

.comment-page {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 8px;
}

.page-badge {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.page-badge.revision {
  background: #ff9800;
  color: #fff;
}

.page-badge.approved {
  background: #4caf50;
  color: #fff;
}

.comment-text {
  margin: 0;
  font-size: 14px;
  color: #1a1a2e;
  line-height: 1.5;
}

.no-comments {
  text-align: center;
  padding: 30px;
  color: #9e9e9e;
}

.review-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn-secondary {
  padding: 10px 20px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #f5f5f5;
}
</style>
