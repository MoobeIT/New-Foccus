<template>
  <div class="projects-section">
    <!-- Selection Bar (when items selected) -->
    <div v-if="selectedProjects.size > 0" class="selection-bar">
      <div class="selection-info">
        <button class="btn-clear-selection" @click="clearSelection">✕</button>
        <span>{{ selectedProjects.size }} projeto(s) selecionado(s)</span>
      </div>
      <div class="selection-actions">
        <button class="btn-add-cart" @click="addSelectedToCart">
          🛒 Adicionar ao Carrinho
        </button>
      </div>
    </div>

    <!-- Header -->
    <div class="section-header">
      <div class="header-left">
        <h2>📁 Meus Projetos</h2>
        <p>{{ projects.length }} projetos</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <span>🔍</span>
          <input v-model="searchQuery" type="text" placeholder="Buscar projetos..." @input="debouncedSearch" />
        </div>
        <select v-model="filterStatus" class="filter-select" @change="loadProjects">
          <option value="">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="editing">Em Edição</option>
          <option value="pending_approval">Aguardando Aprovação</option>
          <option value="approved">Aprovado</option>
          <option value="production">Em Produção</option>
          <option value="completed">Concluído</option>
        </select>
        <!-- View Toggle -->
        <div class="view-toggle">
          <button :class="{ active: viewMode === 'kanban' }" @click="viewMode = 'kanban'" title="Kanban">
            <span>▦</span>
          </button>
          <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Lista">
            <span>☰</span>
          </button>
        </div>
        <button class="btn-primary" @click="openNewProjectWizard">
          ✨ Novo Projeto
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando projetos...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="projects.length === 0" class="empty-state">
      <span>📁</span>
      <h3>Nenhum projeto encontrado</h3>
      <p>Crie seu primeiro projeto para começar</p>
      <button class="btn-primary" @click="openNewProjectWizard">✨ Criar Projeto</button>
    </div>

    <!-- Kanban View -->
    <div v-else-if="viewMode === 'kanban'" class="kanban-board">
      <div 
        v-for="column in kanbanColumns" 
        :key="column.id" 
        class="kanban-column"
        :class="[column.id, { 'drop-target': dragOverColumn === column.id }]"
        @dragover.prevent="handleDragOver(column.id, $event)"
        @dragleave="handleDragLeave"
        @drop.prevent="handleDrop(column.id)"
      >
        <div class="column-header" :class="column.id">
          <span class="column-title">{{ column.title }}</span>
          <span class="column-count">{{ getColumnProjects(column.id).length }}</span>
        </div>
        <div class="column-content">
          <div 
            v-for="project in getColumnProjects(column.id)" 
            :key="project.id" 
            class="project-card"
            :class="{ 'dragging': draggingProject?.id === project.id, 'locked': isProjectLocked(project), 'selected': selectedProjects.has(project.id) }"
            :draggable="!isProjectLocked(project)"
            @dragstart="handleDragStart(project, $event)"
            @dragend="handleDragEnd"
            @click="handleProjectClick(project)"
          >
            <!-- Selection Checkbox -->
            <label class="card-select" @click.stop>
              <input 
                type="checkbox" 
                :checked="selectedProjects.has(project.id)" 
                @change="toggleProjectSelection(project)" 
              />
            </label>
            <div class="card-thumb">
              <img v-if="project.thumbnail || project.coverUrl || project.thumbnailUrl" :src="project.thumbnail || project.coverUrl || project.thumbnailUrl" />
              <span v-else>📷</span>
              <div v-if="isProjectLocked(project)" class="locked-badge" title="Projeto bloqueado para edição">🔒</div>
              <!-- Payment Status Badge -->
              <div v-if="project.status === 'production'" class="payment-badge" :class="project.paymentStatus || 'pending'">
                {{ project.paymentStatus === 'paid' ? '✓ Pago' : '$ Aguardando' }}
              </div>
            </div>
            <div class="card-content">
              <h4>{{ project.name }}</h4>
              <p class="product-info" v-if="project.productName">{{ project.productName }}</p>
              <p class="meta">📄 {{ project.pageCount || 20 }} páginas</p>
              <p class="date">{{ formatDate(project.updatedAt) }}</p>
              <!-- Payment warning for production -->
              <p v-if="project.status === 'production' && project.paymentStatus !== 'paid'" class="payment-warning">
                ⚠️ Aguardando pagamento
              </p>
            </div>
            <div class="card-actions">
              <button 
                v-if="canAddToCart(project)" 
                @click.stop="addToCart(project)" 
                title="Adicionar ao carrinho"
                class="cart"
              >🛒</button>
              <button 
                v-if="canEdit(project)" 
                @click.stop="openProject(project)" 
                title="Editar"
              >✏️</button>
              <button 
                v-if="canSendForApproval(project)" 
                @click.stop="openApprovalModal(project)" 
                title="Enviar para aprovação"
                class="approval"
              >📤</button>
              <button 
                v-if="canSendToProduction(project)" 
                @click.stop="sendToProduction(project)" 
                title="Enviar para produção"
                class="production"
              >🏭</button>
              <button @click.stop="duplicateProject(project)" title="Duplicar">📋</button>
              <button 
                v-if="canDelete(project)" 
                @click.stop="deleteProject(project)" 
                title="Excluir" 
                class="danger"
              >🗑️</button>
            </div>
          </div>
          <div v-if="getColumnProjects(column.id).length === 0" class="empty-column">
            <span>📭</span>
            <p>Nenhum projeto</p>
            <p class="drop-hint" v-if="draggingProject">Solte aqui</p>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else-if="viewMode === 'list'" class="list-view">
      <div class="list-header">
        <div class="list-col col-select">
          <input type="checkbox" @change="toggleSelectAll" :checked="selectedProjects.size === projects.length && projects.length > 0" />
        </div>
        <div class="list-col col-thumb">Projeto</div>
        <div class="list-col col-name"></div>
        <div class="list-col col-status">Status</div>
        <div class="list-col col-pages">Páginas</div>
        <div class="list-col col-date">Atualizado</div>
        <div class="list-col col-actions">Ações</div>
      </div>
      <div 
        v-for="project in projects" 
        :key="project.id" 
        class="list-row"
        :class="{ selected: selectedProjects.has(project.id) }"
      >
        <div class="list-col col-select">
          <input type="checkbox" :checked="selectedProjects.has(project.id)" @change="toggleProjectSelection(project)" />
        </div>
        <div class="list-col col-thumb">
          <div class="row-thumb">
            <img v-if="project.thumbnail || project.coverUrl" :src="project.thumbnail || project.coverUrl" />
            <span v-else>📷</span>
          </div>
        </div>
        <div class="list-col col-name">
          <h4>{{ project.name }}</h4>
          <p v-if="project.productName">{{ project.productName }}</p>
        </div>
        <div class="list-col col-status">
          <select 
            :value="project.status || 'draft'" 
            @change="changeProjectStatus(project, ($event.target as HTMLSelectElement).value)"
            class="status-select"
            :class="project.status || 'draft'"
          >
            <option value="draft">Rascunho</option>
            <option value="editing">Em Edição</option>
            <option value="pending_approval">Aguardando</option>
            <option value="approved">Aprovado</option>
            <option value="production">Produção</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
        <div class="list-col col-pages">{{ project.pageCount || 20 }}</div>
        <div class="list-col col-date">{{ formatDate(project.updatedAt) }}</div>
        <div class="list-col col-actions">
          <button v-if="canAddToCart(project)" @click="addToCart(project)" class="action-btn cart" title="Carrinho">🛒</button>
          <button @click="openProject(project)" class="action-btn" title="Editar">✏️</button>
          <button @click="duplicateProject(project)" class="action-btn" title="Duplicar">📋</button>
          <button v-if="canDelete(project)" @click="deleteProject(project)" class="action-btn danger" title="Excluir">🗑️</button>
        </div>
      </div>
    </div>

    <!-- Approval Modal -->
    <div v-if="showApprovalModal" class="modal-overlay" @click.self="closeApprovalModal">
      <div class="approval-modal">
        <div class="modal-header">
          <h3>📤 Enviar para Aprovação</h3>
          <button class="close-btn" @click="closeApprovalModal">✕</button>
        </div>
        <div class="modal-body">
          <p>Enviar o projeto <strong>{{ selectedProject?.name }}</strong> para aprovação do cliente.</p>
          
          <div class="form-group">
            <label>Nome do Cliente *</label>
            <input v-model="approvalData.clientName" type="text" placeholder="Nome do cliente" />
          </div>
          
          <div class="form-group">
            <label>Email do Cliente *</label>
            <input v-model="approvalData.clientEmail" type="email" placeholder="email@cliente.com" />
          </div>
          
          <div class="form-group">
            <label>Mensagem (opcional)</label>
            <textarea v-model="approvalData.message" placeholder="Mensagem personalizada para o cliente..." rows="3"></textarea>
          </div>
          
          <div class="approval-info">
            <p>📧 O cliente receberá um link para visualizar e aprovar o projeto.</p>
            <p>✅ Se aprovado, o projeto será movido para "Aprovado".</p>
            <p>🔄 Se houver revisões, voltará para "Em Edição" com os comentários.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeApprovalModal">Cancelar</button>
          <button 
            class="btn-primary" 
            @click="sendForApproval" 
            :disabled="!approvalData.clientName || !approvalData.clientEmail || sendingApproval"
          >
            {{ sendingApproval ? '⏳ Enviando...' : '📤 Enviar Link' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Production Confirmation Modal -->
    <div v-if="showProductionModal" class="modal-overlay" @click.self="closeProductionModal">
      <div class="production-modal">
        <div class="modal-header">
          <h3>🏭 Enviar para Produção</h3>
          <button class="close-btn" @click="closeProductionModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Atenção!</strong>
              <p>Ao enviar para produção, o projeto será bloqueado e não poderá mais ser editado.</p>
            </div>
          </div>
          
          <p>Projeto: <strong>{{ selectedProject?.name }}</strong></p>
          <p>Páginas: <strong>{{ selectedProject?.pageCount || 20 }}</strong></p>
          
          <div class="checklist">
            <label class="checkbox-item">
              <input type="checkbox" v-model="productionChecks.reviewed" />
              <span>Revisei todas as páginas do projeto</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="productionChecks.clientApproved" />
              <span>O cliente aprovou o projeto</span>
            </label>
            <label class="checkbox-item">
              <input type="checkbox" v-model="productionChecks.readyToPrint" />
              <span>O projeto está pronto para impressão</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeProductionModal">Cancelar</button>
          <button 
            class="btn-primary production" 
            @click="confirmSendToProduction" 
            :disabled="!allProductionChecksComplete || sendingToProduction"
          >
            {{ sendingToProduction ? '⏳ Enviando...' : '🏭 Confirmar Produção' }}
          </button>
        </div>
      </div>
    </div>

    <!-- New Project Wizard Modal -->
    <div v-if="showWizard" class="modal-overlay" @click.self="closeWizard">
      <div class="wizard-modal">
        <div class="wizard-header">
          <h3>✨ Novo Projeto</h3>
          <button class="close-btn" @click="closeWizard">✕</button>
        </div>

        <!-- Progress Steps -->
        <div class="wizard-steps">
          <div :class="['step', { active: wizardStep === 1, completed: wizardStep > 1 }]">
            <span class="step-number">1</span>
            <span class="step-label">Produto</span>
          </div>
          <div class="step-line" :class="{ completed: wizardStep > 1 }"></div>
          <div :class="['step', { active: wizardStep === 2, completed: wizardStep > 2 }]">
            <span class="step-number">2</span>
            <span class="step-label">Configuração</span>
          </div>
          <div class="step-line" :class="{ completed: wizardStep > 2 }"></div>
          <div :class="['step', { active: wizardStep === 3 }]">
            <span class="step-number">3</span>
            <span class="step-label">Finalizar</span>
          </div>
        </div>

        <div class="wizard-body">
          <!-- Step 1: Select Product -->
          <div v-if="wizardStep === 1" class="wizard-step-content">
            <h4>Escolha o tipo de produto</h4>
            <p class="step-description">Selecione o produto que deseja criar para seu cliente</p>
            
            <div v-if="loadingProducts" class="loading-products">
              <div class="spinner small"></div>
              <span>Carregando produtos...</span>
            </div>
            
            <div v-else class="products-grid">
              <div 
                v-for="product in availableProducts" 
                :key="product.id"
                :class="['product-card', { selected: newProject.productId === product.id }]"
                @click="selectProduct(product)"
              >
                <div class="product-image">
                  <span>📖</span>
                </div>
                <div class="product-info">
                  <h5>{{ product.name }}</h5>
                  <p class="product-category">{{ product.category }}</p>
                  <p class="product-price">A partir de R$ {{ formatPrice(product.basePrice) }}</p>
                  <span v-if="product.badge" class="product-badge">{{ product.badge }}</span>
                </div>
                <div class="product-check" v-if="newProject.productId === product.id">✓</div>
              </div>
            </div>
          </div>

          <!-- Step 2: Configuration -->
          <div v-if="wizardStep === 2" class="wizard-step-content">
            <h4>Configure seu projeto</h4>
            <p class="step-description">Defina as especificações do álbum</p>

            <!-- Selected Product Summary -->
            <div class="selected-product-summary" v-if="selectedProduct">
              <div class="summary-image">📖</div>
              <div class="summary-info">
                <h5>{{ selectedProduct.name }}</h5>
                <p>{{ selectedProduct.category }}</p>
              </div>
              <button class="btn-change" @click="wizardStep = 1">Alterar</button>
            </div>

            <div class="config-form">
              <!-- Project Name -->
              <div class="form-group">
                <label>Nome do Projeto *</label>
                <input 
                  v-model="newProject.name" 
                  type="text" 
                  placeholder="Ex: Casamento Maria & João"
                  required
                />
              </div>

              <!-- Format Selection -->
              <div class="form-group">
                <label>Formato / Tamanho *</label>
                <div class="format-options">
                  <div 
                    v-for="format in selectedProduct?.formats || []" 
                    :key="format.id"
                    :class="['format-option', { selected: newProject.formatId === format.id }]"
                    @click="selectFormat(format)"
                  >
                    <span class="format-size">{{ format.name }}</span>
                    <span class="format-dimensions">{{ format.width/10 }}x{{ format.height/10 }}cm</span>
                    <span class="format-orientation">{{ getOrientationLabel(format.orientation) }}</span>
                  </div>
                </div>
              </div>

              <!-- Paper Selection -->
              <div class="form-group">
                <label>Tipo de Papel</label>
                <div class="paper-options">
                  <div 
                    v-for="paper in selectedProduct?.papers || []" 
                    :key="paper.id"
                    :class="['paper-option', { selected: newProject.paperId === paper.id }]"
                    @click="newProject.paperId = paper.id"
                  >
                    <span class="paper-name">{{ paper.name }}</span>
                    <span class="paper-finish">{{ paper.finish === 'matte' ? 'Fosco' : 'Brilho' }}</span>
                  </div>
                </div>
              </div>

              <!-- Page Count -->
              <div class="form-group">
                <label>Quantidade de Páginas</label>
                <div class="page-count-selector">
                  <button type="button" @click="decrementPages" :disabled="newProject.pageCount <= selectedFormat?.minPages">−</button>
                  <span class="page-count-value">{{ newProject.pageCount }} páginas</span>
                  <button type="button" @click="incrementPages" :disabled="newProject.pageCount >= selectedFormat?.maxPages">+</button>
                </div>
                <p class="page-hint" v-if="selectedFormat">
                  Mínimo: {{ selectedFormat.minPages }} | Máximo: {{ selectedFormat.maxPages }} páginas
                </p>
              </div>

              <!-- Cover Type -->
              <div class="form-group" v-if="selectedProduct?.coverTypes?.length">
                <label>Tipo de Capa</label>
                <div class="cover-options">
                  <div 
                    v-for="cover in selectedProduct.coverTypes" 
                    :key="cover.id"
                    :class="['cover-option', { selected: newProject.coverTypeId === cover.id }]"
                    @click="newProject.coverTypeId = cover.id"
                  >
                    <span class="cover-name">{{ cover.name }}</span>
                    <span class="cover-price" v-if="cover.price > 0">+R$ {{ formatPrice(cover.price) }}</span>
                    <span class="cover-price" v-else>Incluso</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Choose Method -->
          <div v-if="wizardStep === 3" class="wizard-step-content">
            <h4>Como deseja criar o projeto?</h4>
            <p class="step-description">Escolha entre usar nosso editor online ou enviar um arquivo pronto</p>

            <!-- Project Summary -->
            <div class="project-summary">
              <h5>📋 Resumo do Projeto</h5>
              <div class="summary-details">
                <div class="summary-row">
                  <span>Produto:</span>
                  <strong>{{ selectedProduct?.name }}</strong>
                </div>
                <div class="summary-row">
                  <span>Formato:</span>
                  <strong>{{ selectedFormat?.name }} ({{ selectedFormat?.width/10 }}x{{ selectedFormat?.height/10 }}cm)</strong>
                </div>
                <div class="summary-row">
                  <span>Papel:</span>
                  <strong>{{ selectedPaper?.name || 'Padrão' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Páginas:</span>
                  <strong>{{ newProject.pageCount }} páginas</strong>
                </div>
                <div class="summary-row" v-if="selectedCover">
                  <span>Capa:</span>
                  <strong>{{ selectedCover.name }}</strong>
                </div>
              </div>
            </div>

            <!-- Method Selection -->
            <div class="method-selection">
              <div 
                :class="['method-card', { selected: creationMethod === 'editor' }]"
                @click="creationMethod = 'editor'"
              >
                <div class="method-icon">🎨</div>
                <div class="method-info">
                  <h5>Criar no Editor</h5>
                  <p>Use nosso editor online para montar o álbum com suas fotos. Arraste, redimensione e personalize cada página.</p>
                  <ul class="method-features">
                    <li>✓ Editor visual intuitivo</li>
                    <li>✓ Templates prontos</li>
                    <li>✓ Salva automaticamente</li>
                    <li>✓ Visualização em tempo real</li>
                  </ul>
                </div>
                <div class="method-check" v-if="creationMethod === 'editor'">✓</div>
              </div>

              <div 
                :class="['method-card', { selected: creationMethod === 'upload' }]"
                @click="creationMethod = 'upload'"
              >
                <div class="method-icon">📤</div>
                <div class="method-info">
                  <h5>Enviar Arquivo Pronto</h5>
                  <p>Já tem o álbum pronto em PDF? Faça upload do arquivo e envie diretamente para produção.</p>
                  <ul class="method-features">
                    <li>✓ Upload de PDF</li>
                    <li>✓ Verificação automática</li>
                    <li>✓ Suporte a arquivos grandes</li>
                    <li>✓ Ideal para designers</li>
                  </ul>
                </div>
                <div class="method-check" v-if="creationMethod === 'upload'">✓</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Wizard Footer -->
        <div class="wizard-footer">
          <button 
            v-if="wizardStep > 1" 
            type="button" 
            class="btn-secondary" 
            @click="wizardStep--"
          >
            ← Voltar
          </button>
          <div class="footer-spacer"></div>
          
          <button 
            v-if="wizardStep < 3" 
            type="button" 
            class="btn-primary" 
            @click="nextStep"
            :disabled="!canProceed"
          >
            Continuar →
          </button>
          
          <button 
            v-if="wizardStep === 3" 
            type="button" 
            class="btn-primary" 
            @click="createProject"
            :disabled="creating || !creationMethod"
          >
            {{ creating ? 'Criando...' : (creationMethod === 'editor' ? '🎨 Criar e Abrir Editor' : '📤 Criar e Fazer Upload') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { studioService, type Project } from '@/services/studio'
import { catalogService, type Product, type ProductFormat, type ProductPaper, type ProductCoverType } from '@/services/catalog'

import { useCartStore } from '@/stores/cart'

const router = useRouter()
const route = useRoute()
const cartStore = useCartStore()

const loading = ref(true)
const creating = ref(false)
const loadingProducts = ref(false)
const searchQuery = ref('')
const filterStatus = ref('')
const projects = ref<Project[]>([])
const viewMode = ref<'kanban' | 'list'>('kanban')

// Selection state for cart
const selectedProjects = ref<Set<string>>(new Set())

// Wizard state
const showWizard = ref(false)
const wizardStep = ref(1)
const creationMethod = ref<'editor' | 'upload'>('editor')
const availableProducts = ref<Product[]>([])

// Drag & Drop state
const draggingProject = ref<Project | null>(null)
const dragOverColumn = ref<string | null>(null)

// Approval Modal state
const showApprovalModal = ref(false)
const selectedProject = ref<Project | null>(null)
const sendingApproval = ref(false)
const approvalData = reactive({
  clientName: '',
  clientEmail: '',
  message: ''
})

// Production Modal state
const showProductionModal = ref(false)
const sendingToProduction = ref(false)
const productionChecks = reactive({
  reviewed: false,
  clientApproved: false,
  readyToPrint: false
})

const newProject = reactive({
  name: '',
  productId: '',
  formatId: '',
  paperId: '',
  coverTypeId: '',
  pageCount: 20
})

const kanbanColumns = [
  { id: 'draft', title: 'Rascunho' },
  { id: 'editing', title: 'Em Edição' },
  { id: 'pending_approval', title: 'Aguardando Aprovação' },
  { id: 'approved', title: 'Aprovado' },
  { id: 'production', title: 'Em Produção' },
  { id: 'completed', title: 'Concluído' },
]

// Workflow rules: which columns can receive drops from which
const workflowRules: Record<string, string[]> = {
  'draft': ['editing'],
  'editing': ['draft', 'pending_approval'],
  'pending_approval': ['editing'], // Can go back to editing if revision needed
  'approved': ['production'], // Only forward to production
  'production': ['completed'],
  'completed': []
}

let searchTimeout: any = null

// Computed
const selectedProduct = computed(() => availableProducts.value.find(p => p.id === newProject.productId))
const selectedFormat = computed(() => selectedProduct.value?.formats?.find(f => f.id === newProject.formatId))
const selectedPaper = computed(() => selectedProduct.value?.papers?.find(p => p.id === newProject.paperId))
const selectedCover = computed(() => selectedProduct.value?.coverTypes?.find(c => c.id === newProject.coverTypeId))

const canProceed = computed(() => {
  if (wizardStep.value === 1) return !!newProject.productId
  if (wizardStep.value === 2) return !!newProject.name && !!newProject.formatId
  return true
})

const allProductionChecksComplete = computed(() => {
  return productionChecks.reviewed && productionChecks.clientApproved && productionChecks.readyToPrint
})

onMounted(() => {
  loadProjects()
  
  // Check if should open wizard from query params
  if (route.query.newProject === 'true') {
    openNewProjectWizard()
  }
})

const loadProjects = async () => {
  loading.value = true
  try {
    const filters: any = {}
    if (filterStatus.value) filters.status = filterStatus.value
    if (searchQuery.value) filters.search = searchQuery.value
    projects.value = await studioService.getProjects(filters)
  } catch (error) {
    console.error('Erro ao carregar projetos:', error)
  } finally {
    loading.value = false
  }
}

const loadProducts = async () => {
  loadingProducts.value = true
  try {
    availableProducts.value = await catalogService.getProducts()
  } catch (error) {
    console.error('Erro ao carregar produtos:', error)
  } finally {
    loadingProducts.value = false
  }
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadProjects(), 300)
}

// ==================== DRAG & DROP ====================

const handleDragStart = (project: Project, event: DragEvent) => {
  draggingProject.value = project
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', project.id)
  }
}

const handleDragEnd = () => {
  draggingProject.value = null
  dragOverColumn.value = null
}

const handleDragOver = (columnId: string, event: DragEvent) => {
  if (canDropInColumn(columnId)) {
    dragOverColumn.value = columnId
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }
}

const handleDragLeave = () => {
  dragOverColumn.value = null
}

const handleDrop = async (targetColumnId: string) => {
  if (!draggingProject.value || !canDropInColumn(targetColumnId)) {
    dragOverColumn.value = null
    return
  }

  const project = draggingProject.value
  const currentStatus = (project.status || 'draft').toLowerCase()
  
  // Don't do anything if dropping in same column
  if (currentStatus === targetColumnId) {
    dragOverColumn.value = null
    draggingProject.value = null
    return
  }

  // Direct status change - no restrictions
  await changeProjectStatus(project, targetColumnId)
  
  dragOverColumn.value = null
  draggingProject.value = null
}

const canDropInColumn = (targetColumnId: string): boolean => {
  if (!draggingProject.value) return false
  
  const currentStatus = (draggingProject.value.status || 'draft').toLowerCase()
  
  // Can't drop in same column
  if (currentStatus === targetColumnId) return false
  
  // Allow moving to any column (no restrictions)
  return true
}

const changeProjectStatus = async (project: Project, newStatus: string) => {
  try {
    await studioService.changeProjectStatus(project.id, newStatus)
    
    // Update local state
    const idx = projects.value.findIndex(p => p.id === project.id)
    if (idx !== -1) {
      projects.value[idx].status = newStatus
    }
    
    // Force reactivity
    projects.value = [...projects.value]
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    alert('Erro ao mover projeto. Tente novamente.')
  }
}

// ==================== PROJECT ACTIONS ====================

const isProjectLocked = (project: Project): boolean => {
  const status = (project.status || 'draft').toLowerCase()
  return ['production', 'completed'].includes(status)
}

const canEdit = (project: Project): boolean => {
  return !isProjectLocked(project)
}

const canDelete = (project: Project): boolean => {
  const status = (project.status || 'draft').toLowerCase()
  return ['draft', 'editing'].includes(status)
}

const canSendForApproval = (project: Project): boolean => {
  const status = (project.status || 'draft').toLowerCase()
  return ['draft', 'editing'].includes(status)
}

const canSendToProduction = (project: Project): boolean => {
  const status = (project.status || 'draft').toLowerCase()
  // Pode enviar para produção de qualquer status exceto já em produção ou concluído
  return !['production', 'completed'].includes(status)
}

const handleProjectClick = (project: Project) => {
  if (isProjectLocked(project)) {
    // Show read-only view or info
    alert(`Este projeto está em ${project.status === 'production' ? 'produção' : 'concluído'} e não pode ser editado.`)
  } else {
    openProject(project)
  }
}

// ==================== APPROVAL MODAL ====================

const openApprovalModal = (project: Project) => {
  selectedProject.value = project
  approvalData.clientName = ''
  approvalData.clientEmail = ''
  approvalData.message = ''
  showApprovalModal.value = true
}

const closeApprovalModal = () => {
  showApprovalModal.value = false
  selectedProject.value = null
}

const sendForApproval = async () => {
  if (!selectedProject.value || !approvalData.clientName || !approvalData.clientEmail) return
  
  sendingApproval.value = true
  
  try {
    // Create approval request
    await studioService.createApproval({
      projectId: selectedProject.value.id,
      clientName: approvalData.clientName,
      clientEmail: approvalData.clientEmail
    })
    
    // Change project status to pending_approval
    await changeProjectStatus(selectedProject.value, 'pending_approval')
    
    closeApprovalModal()
    alert('✅ Link de aprovação enviado para o cliente!')
  } catch (error) {
    console.error('Erro ao enviar para aprovação:', error)
    alert('Erro ao enviar para aprovação. Tente novamente.')
  } finally {
    sendingApproval.value = false
  }
}

// ==================== PRODUCTION MODAL ====================

const openProductionModal = (project: Project) => {
  selectedProject.value = project
  productionChecks.reviewed = false
  productionChecks.clientApproved = false
  productionChecks.readyToPrint = false
  showProductionModal.value = true
}

const closeProductionModal = () => {
  showProductionModal.value = false
  selectedProject.value = null
}

const sendToProduction = (project: Project) => {
  openProductionModal(project)
}

const confirmSendToProduction = async () => {
  if (!selectedProject.value || !allProductionChecksComplete.value) return
  
  sendingToProduction.value = true
  
  try {
    // 1. Mudar status para produção
    await changeProjectStatus(selectedProject.value, 'production')
    
    // 2. Adicionar ao carrinho automaticamente
    const project = selectedProject.value
    const config = project.productSelection || {}
    let unitPrice = config.formatPrice || config.basePrice || 299
    
    if (config.extraPagesPrice) {
      unitPrice += config.extraPagesPrice
    }
    if (config.coverPrice) {
      unitPrice += config.coverPrice
    }
    
    await cartStore.addItem({
      productId: project.productId || 'photobook',
      productName: project.name || 'Fotolivro',
      variantId: config.formatId,
      variantName: config.formatName || config.size,
      projectId: project.id,
      quantity: 1,
      pages: config.pages || project.pageCount || 20,
      unitPrice,
      thumbnailUrl: project.thumbnail || project.coverUrl,
      customizations: {
        ...config,
        paymentStatus: 'pending' // Status de pagamento pendente
      }
    })
    
    closeProductionModal()
    
    // Perguntar se quer ir para o carrinho
    if (confirm('✅ Projeto enviado para produção e adicionado ao carrinho!\n\nDeseja ir para o carrinho para finalizar o pagamento?')) {
      router.push('/cart')
    }
  } catch (error) {
    console.error('Erro ao enviar para produção:', error)
    alert('Erro ao enviar para produção. Tente novamente.')
  } finally {
    sendingToProduction.value = false
  }
}

const getColumnProjects = (status: string) => {
  return projects.value.filter(p => {
    const projectStatus = (p.status || 'draft').toLowerCase()
    return projectStatus === status || projectStatus === status.toUpperCase()
  })
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

const formatPrice = (value: number) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    casamento: '💒 Casamento',
    ensaio: '📸 Ensaio',
    newborn: '👶 Newborn',
    '15anos': '🎀 15 Anos',
    estojo: '🎁 Estojo',
    photobook: '📖 Fotolivro',
    case: '📦 Estojo'
  }
  return labels[category] || category || '📖 Produto'
}

const getOrientationLabel = (orientation: string) => {
  const labels: Record<string, string> = {
    square: 'Quadrado',
    portrait: 'Retrato',
    landscape: 'Paisagem'
  }
  return labels[orientation] || orientation
}

// Wizard methods
const openNewProjectWizard = () => {
  // Reset state
  wizardStep.value = 1
  creationMethod.value = 'editor'
  newProject.name = ''
  newProject.productId = ''
  newProject.formatId = ''
  newProject.paperId = ''
  newProject.coverTypeId = ''
  newProject.pageCount = 20
  
  // Pre-fill client info from query params
  if (route.query.clientName) {
    newProject.name = `Projeto - ${route.query.clientName}`
  }
  
  showWizard.value = true
  loadProducts()
}

const closeWizard = () => {
  showWizard.value = false
  // Clear query params
  if (route.query.newProject) {
    router.replace({ query: {} })
  }
}

const selectProduct = (product: Product) => {
  newProject.productId = product.id
  // Auto-select first format and paper
  if (product.formats?.length) {
    newProject.formatId = product.formats[0].id
    newProject.pageCount = product.formats[0].minPages
  }
  if (product.papers?.length) {
    newProject.paperId = product.papers[0].id
  }
  if (product.coverTypes?.length) {
    newProject.coverTypeId = product.coverTypes[0].id
  }
}

const selectFormat = (format: ProductFormat) => {
  newProject.formatId = format.id
  // Adjust page count to format limits
  if (newProject.pageCount < format.minPages) {
    newProject.pageCount = format.minPages
  }
  if (newProject.pageCount > format.maxPages) {
    newProject.pageCount = format.maxPages
  }
}

const incrementPages = () => {
  const increment = selectedFormat.value?.pageIncrement || 2
  const max = selectedFormat.value?.maxPages || 100
  if (newProject.pageCount + increment <= max) {
    newProject.pageCount += increment
  }
}

const decrementPages = () => {
  const increment = selectedFormat.value?.pageIncrement || 2
  const min = selectedFormat.value?.minPages || 20
  if (newProject.pageCount - increment >= min) {
    newProject.pageCount -= increment
  }
}

const nextStep = () => {
  if (canProceed.value && wizardStep.value < 3) {
    wizardStep.value++
  }
}

const createProject = async () => {
  if (!newProject.name.trim() || !newProject.productId) return
  
  creating.value = true
  try {
    const project = await studioService.createProject({
      name: newProject.name,
      productId: newProject.productId,
      formatId: newProject.formatId,
      paperId: newProject.paperId,
      coverTypeId: newProject.coverTypeId,
      pageCount: newProject.pageCount,
      settings: { creationMethod: creationMethod.value }
    })
    
    if (project) {
      // Salvar configuração do produto no localStorage para o editor usar
      const productConfig = {
        productId: newProject.productId,
        productName: selectedProduct.value?.name || 'Álbum',
        formatId: newProject.formatId,
        formatName: selectedFormat.value?.name,
        width: selectedFormat.value?.width || 300,
        height: selectedFormat.value?.height || 300,
        paperId: newProject.paperId,
        paperName: selectedPaper.value?.name,
        coverTypeId: newProject.coverTypeId,
        coverName: selectedCover.value?.name,
        pages: newProject.pageCount,
        minPages: selectedFormat.value?.minPages || 20,
        maxPages: selectedFormat.value?.maxPages || 100,
      }
      localStorage.setItem('editor-product-config', JSON.stringify(productConfig))
      console.log('📦 Configuração do produto salva para o editor:', productConfig)
      
      closeWizard()
      
      // Recarregar lista de projetos em background
      loadProjects()
      
      if (creationMethod.value === 'editor') {
        router.push(`/editor/${project.id}`)
      } else {
        // Go to upload page
        router.push({ path: `/studio/upload/${project.id}`, query: { projectName: project.name } })
      }
    }
  } catch (error) {
    console.error('Erro ao criar projeto:', error)
    alert('Erro ao criar projeto. Tente novamente.')
  } finally {
    creating.value = false
  }
}

const openProject = (project: Project) => {
  router.push(`/editor/${project.id}`)
}

const duplicateProject = async (project: Project) => {
  if (!confirm(`Duplicar "${project.name}"?`)) return
  try {
    const newProj = await studioService.duplicateProject(project.id)
    if (newProj) {
      await loadProjects()
      alert('Projeto duplicado com sucesso!')
    }
  } catch (error) {
    alert('Erro ao duplicar projeto.')
  }
}

const deleteProject = async (project: Project) => {
  if (!confirm(`Tem certeza que deseja excluir "${project.name}"? Esta ação não pode ser desfeita.`)) return
  try {
    const success = await studioService.deleteProject(project.id)
    if (success) {
      await loadProjects()
    } else {
      alert('Erro ao excluir projeto.')
    }
  } catch (error) {
    alert('Erro ao excluir projeto.')
  }
}

// ==================== SELECTION & CART ====================

const toggleProjectSelection = (project: Project) => {
  console.log('🔄 Toggle selection for:', project.id, project.name)
  
  if (selectedProjects.value.has(project.id)) {
    selectedProjects.value.delete(project.id)
  } else {
    selectedProjects.value.add(project.id)
  }
  // Force reactivity
  selectedProjects.value = new Set(selectedProjects.value)
}

const toggleSelectAll = () => {
  if (selectedProjects.value.size === projects.value.length) {
    selectedProjects.value = new Set()
  } else {
    selectedProjects.value = new Set(projects.value.map(p => p.id))
  }
}

const clearSelection = () => {
  selectedProjects.value = new Set()
}

const canAddToCart = (project: Project): boolean => {
  const status = (project.status || 'draft').toLowerCase()
  // Can add to cart if project is approved or completed (ready for purchase)
  return ['approved', 'completed', 'editing', 'draft'].includes(status)
}

const addToCart = async (project: Project) => {
  if (!canAddToCart(project)) return
  
  try {
    // Get project config
    const config = project.productSelection || {}
    let unitPrice = config.formatPrice || config.basePrice || 299
    
    // Add extra pages price
    if (config.extraPagesPrice) {
      unitPrice += config.extraPagesPrice
    }
    
    // Add cover price
    if (config.coverPrice) {
      unitPrice += config.coverPrice
    }
    
    await cartStore.addItem({
      productId: project.productId || 'photobook',
      productName: project.name || 'Fotolivro',
      variantId: config.formatId,
      variantName: config.formatName || config.size,
      projectId: project.id,
      quantity: 1,
      pages: config.pages || project.pageCount || 20,
      unitPrice,
      thumbnailUrl: project.thumbnail || project.coverUrl,
      customizations: config
    })
    
    alert(`✅ "${project.name}" adicionado ao carrinho!`)
  } catch (error) {
    console.error('Erro ao adicionar ao carrinho:', error)
    alert('Erro ao adicionar ao carrinho. Tente novamente.')
  }
}

const addSelectedToCart = async () => {
  if (selectedProjects.value.size === 0) return
  
  const projectsToAdd = projects.value.filter(p => selectedProjects.value.has(p.id) && canAddToCart(p))
  
  if (projectsToAdd.length === 0) {
    alert('Nenhum projeto selecionado pode ser adicionado ao carrinho.')
    return
  }
  
  try {
    for (const project of projectsToAdd) {
      const config = project.productSelection || {}
      let unitPrice = config.formatPrice || config.basePrice || 299
      
      if (config.extraPagesPrice) {
        unitPrice += config.extraPagesPrice
      }
      
      if (config.coverPrice) {
        unitPrice += config.coverPrice
      }
      
      await cartStore.addItem({
        productId: project.productId || 'photobook',
        productName: project.name || 'Fotolivro',
        variantId: config.formatId,
        variantName: config.formatName || config.size,
        projectId: project.id,
        quantity: 1,
        pages: config.pages || project.pageCount || 20,
        unitPrice,
        thumbnailUrl: project.thumbnail || project.coverUrl,
        customizations: config
      })
    }
    
    clearSelection()
    alert(`✅ ${projectsToAdd.length} projeto(s) adicionado(s) ao carrinho!`)
    
    // Optionally navigate to cart
    router.push('/cart')
  } catch (error) {
    console.error('Erro ao adicionar projetos ao carrinho:', error)
    alert('Erro ao adicionar projetos ao carrinho. Tente novamente.')
  }
}
</script>

<style scoped>
.projects-section { background: #F7F4EE; min-height: calc(100vh - 100px); }

/* Selection Bar */
.selection-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(212, 119, 92, 0.3);
}
.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
  font-weight: 500;
}
.btn-clear-selection {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.btn-clear-selection:hover {
  background: rgba(255,255,255,0.3);
}
.selection-actions {
  display: flex;
  gap: 12px;
}
.btn-add-cart {
  padding: 10px 20px;
  background: white;
  color: #D4775C;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.btn-add-cart:hover {
  background: #FFF8F5;
  transform: translateY(-1px);
}

/* Card Selection */
.card-select {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: white;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-select:hover {
  background: #f0f0f0;
}
.card-select input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #D4775C;
  cursor: pointer;
  margin: 0;
  display: block;
}
.project-card.selected {
  border-color: #D4775C !important;
  background: #FFF8F5 !important;
  box-shadow: 0 0 0 3px rgba(212, 119, 92, 0.3), 0 4px 12px rgba(0,0,0,0.1) !important;
}
.project-card.selected .card-select {
  background: #D4775C;
}
.project-card.selected .card-select input[type="checkbox"] {
  accent-color: white;
}
.card-actions button.cart {
  background: #D4775C !important;
  color: white !important;
  border-color: #D4775C !important;
}
.card-actions button.cart:hover {
  background: #C96B50 !important;
  border-color: #C96B50 !important;
}

.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.header-actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; gap: 8px; background: white; padding: 10px 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
.search-box input { border: none; outline: none; font-size: 0.9rem; width: 200px; background: transparent; }
.filter-select { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; font-size: 0.9rem; cursor: pointer; }
.btn-primary { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: linear-gradient(135deg, #D4775C, #E8956F); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { padding: 10px 20px; background: #f1f5f9; border: none; border-radius: 10px; cursor: pointer; font-weight: 500; }

/* Loading & Empty */
.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #D4775C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
.spinner.small { width: 24px; height: 24px; border-width: 2px; display: inline-block; margin: 0 8px 0 0; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state span { font-size: 4rem; display: block; margin-bottom: 16px; }
.empty-state h3 { margin: 0 0 8px 0; color: #1e293b; }
.empty-state p { margin: 0 0 24px 0; }

/* View Toggle */
.view-toggle {
  display: flex;
  background: #EBE7E0;
  border-radius: 8px;
  padding: 4px;
}
.view-toggle button {
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  color: #6B6560;
  transition: all 0.2s;
}
.view-toggle button.active {
  background: white;
  color: #D4775C;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.view-toggle button:hover:not(.active) {
  color: #2D2A26;
}

/* Kanban */
.kanban-board { display: flex; gap: 16px; overflow-x: auto; padding: 8px 4px 16px; }

.kanban-column { 
  min-width: 280px; 
  max-width: 280px; 
  border-radius: 16px; 
  padding: 0; 
  flex-shrink: 0; 
  transition: all 0.2s; 
  overflow: hidden;
}
.kanban-column.drop-target { 
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* Column Colors */
.kanban-column.draft { background: linear-gradient(180deg, #6B7280 0%, #4B5563 100%); }
.kanban-column.editing { background: linear-gradient(180deg, #3B82F6 0%, #2563EB 100%); }
.kanban-column.pending_approval { background: linear-gradient(180deg, #F97316 0%, #EA580C 100%); }
.kanban-column.approved { background: linear-gradient(180deg, #10B981 0%, #059669 100%); }
.kanban-column.production { background: linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%); }
.kanban-column.completed { background: linear-gradient(180deg, #22C55E 0%, #16A34A 100%); }

.column-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  padding: 16px 18px; 
  color: white;
}
.column-header .column-title { 
  font-weight: 700; 
  font-size: 0.95rem; 
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
.column-header .column-count { 
  background: rgba(255,255,255,0.25); 
  padding: 4px 12px; 
  border-radius: 20px; 
  font-size: 0.8rem; 
  font-weight: 600; 
  color: white;
}

.column-content { 
  display: flex; 
  flex-direction: column; 
  gap: 10px; 
  min-height: 200px; 
  max-height: 450px; 
  overflow-y: auto; 
  padding: 0 12px 12px;
  background: rgba(255,255,255,0.1);
}

.project-card { 
  background: white; 
  border-radius: 12px; 
  padding: 12px; 
  cursor: grab; 
  transition: all 0.2s; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
  border: none;
  position: relative; 
}
.project-card:hover { 
  transform: translateY(-2px); 
  box-shadow: 0 6px 16px rgba(0,0,0,0.15); 
}
.project-card.dragging { opacity: 0.5; transform: rotate(3deg); cursor: grabbing; }
.project-card.locked { cursor: not-allowed; opacity: 0.7; }
.project-card.locked:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.card-thumb { 
  width: 100%; 
  height: 90px; 
  background: linear-gradient(135deg, #D4775C 0%, #E8956F 50%, #F5B895 100%); 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-size: 2rem; 
  margin-bottom: 10px; 
  overflow: hidden; 
  position: relative; 
  color: rgba(255,255,255,0.5);
}
.card-thumb img { 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  position: relative;
  z-index: 1;
}
.card-thumb span {
  position: absolute;
  z-index: 0;
}
.card-thumb .locked-badge { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.8); color: white; padding: 4px 6px; border-radius: 4px; font-size: 0.7rem; z-index: 2; }
.card-thumb .payment-badge { 
  position: absolute; 
  bottom: 4px; 
  left: 4px; 
  right: 4px;
  padding: 4px 8px; 
  border-radius: 4px; 
  font-size: 0.7rem; 
  font-weight: 600;
  text-align: center;
  z-index: 2; 
}
.card-thumb .payment-badge.pending { background: #FEF3C7; color: #B45309; }
.card-thumb .payment-badge.paid { background: #D1FAE5; color: #047857; }
.card-content .payment-warning { margin: 4px 0 0 0; font-size: 0.7rem; color: #B45309; font-weight: 500; }
.card-content h4 { margin: 0 0 4px 0; font-size: 0.9rem; font-weight: 600; color: #2D2A26; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-content .product-info { margin: 0 0 4px 0; font-size: 0.75rem; color: #D4775C; font-weight: 600; }
.card-content .meta { margin: 0 0 4px 0; font-size: 0.8rem; color: #4A4744; }
.card-content .date { margin: 0; font-size: 0.75rem; color: #6B6560; }
.card-actions { display: flex; gap: 4px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #EBE7E0; }
.card-actions button { flex: 1; padding: 6px; background: #F7F4EE; border: 1px solid #EBE7E0; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.card-actions button:hover { background: #EBE7E0; border-color: #D4D0C8; }
.card-actions button.danger:hover { background: #fee2e2; border-color: #fca5a5; }
.card-actions button.approval:hover { background: #fef3c7; border-color: #fcd34d; }
.card-actions button.production:hover { background: #ede9fe; border-color: #c4b5fd; }
.empty-column { text-align: center; padding: 40px 20px; color: rgba(255,255,255,0.7); }
.empty-column span { font-size: 2rem; display: block; margin-bottom: 8px; }
.empty-column p { margin: 0; }
.empty-column .drop-hint { font-size: 0.8rem; color: white; margin-top: 8px; font-weight: 600; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; }

/* List View */
.list-view {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.list-header {
  display: grid;
  grid-template-columns: 40px 60px 1fr 140px 80px 120px 140px;
  gap: 12px;
  padding: 14px 20px;
  background: #F7F4EE;
  font-weight: 600;
  font-size: 0.85rem;
  color: #6B6560;
  border-bottom: 1px solid #EBE7E0;
}
.list-row {
  display: grid;
  grid-template-columns: 40px 60px 1fr 140px 80px 120px 140px;
  gap: 12px;
  padding: 12px 20px;
  align-items: center;
  border-bottom: 1px solid #F0EDE8;
  transition: background 0.2s;
}
.list-row:hover {
  background: #FDFBF7;
}
.list-row.selected {
  background: #FFF8F5;
}
.list-row:last-child {
  border-bottom: none;
}
.list-col {
  display: flex;
  align-items: center;
}
.col-select input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #D4775C;
  cursor: pointer;
}
.row-thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: rgba(255,255,255,0.6);
  font-size: 1.2rem;
}
.row-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.col-name {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
.col-name h4 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #2D2A26;
}
.col-name p {
  margin: 0;
  font-size: 0.8rem;
  color: #D4775C;
}
.status-select {
  padding: 6px 10px;
  border-radius: 20px;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}
.status-select.draft { background: #E5E7EB; color: #4B5563; }
.status-select.editing { background: #DBEAFE; color: #1D4ED8; }
.status-select.pending_approval { background: #FFEDD5; color: #C2410C; }
.status-select.approved { background: #D1FAE5; color: #047857; }
.status-select.production { background: #EDE9FE; color: #6D28D9; }
.status-select.completed { background: #DCFCE7; color: #15803D; }
.col-pages {
  font-weight: 500;
  color: #4A4744;
}
.col-date {
  font-size: 0.85rem;
  color: #6B6560;
}
.col-actions {
  display: flex;
  gap: 6px;
}
.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #F7F4EE;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}
.action-btn:hover {
  background: #EBE7E0;
}
.action-btn.cart {
  background: #D4775C;
  color: white;
}
.action-btn.cart:hover {
  background: #C96B50;
}
.action-btn.danger:hover {
  background: #FEE2E2;
}

/* Approval Modal */
.approval-modal, .production-modal { background: white; border-radius: 16px; width: 100%; max-width: 500px; overflow: hidden; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { margin: 0; font-size: 1.1rem; }
.modal-body { padding: 24px; }
.modal-body .form-group { margin-bottom: 16px; }
.modal-body .form-group label { display: block; font-size: 0.9rem; font-weight: 500; margin-bottom: 6px; color: #374151; }
.modal-body .form-group input, .modal-body .form-group textarea { width: 100%; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; }
.modal-body .form-group input:focus, .modal-body .form-group textarea:focus { outline: none; border-color: #D4775C; }
.approval-info { background: #f8fafc; padding: 16px; border-radius: 10px; margin-top: 16px; }
.approval-info p { margin: 0 0 8px 0; font-size: 0.85rem; color: #64748b; }
.approval-info p:last-child { margin-bottom: 0; }
.modal-footer { display: flex; gap: 12px; padding: 20px 24px; border-top: 1px solid #e2e8f0; }
.modal-footer .btn-secondary { flex: 1; padding: 12px; background: #f1f5f9; border: none; border-radius: 10px; font-weight: 500; cursor: pointer; }
.modal-footer .btn-primary { flex: 1; padding: 12px; background: linear-gradient(135deg, #D4775C, #C96B50); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
.modal-footer .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.modal-footer .btn-primary.production { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

/* Production Modal */
.warning-box { display: flex; gap: 12px; background: #fef3c7; padding: 16px; border-radius: 10px; margin-bottom: 20px; }
.warning-icon { font-size: 1.5rem; }
.warning-box strong { display: block; color: #b45309; margin-bottom: 4px; }
.warning-box p { margin: 0; font-size: 0.9rem; color: #92400e; }
.checklist { margin-top: 20px; }
.checkbox-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.checkbox-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: #D4775C; }
.checkbox-item span { font-size: 0.9rem; color: #374151; }

/* Wizard Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.wizard-modal { background: white; border-radius: 20px; width: 100%; max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.wizard-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #e2e8f0; }
.wizard-header h3 { margin: 0; font-size: 1.25rem; }
.close-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }

/* Wizard Steps */
.wizard-steps { display: flex; align-items: center; justify-content: center; padding: 20px 24px; background: #f8fafc; gap: 8px; }
.step { display: flex; align-items: center; gap: 8px; }
.step-number { width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; color: #64748b; }
.step.active .step-number { background: #D4775C; color: white; }
.step.completed .step-number { background: #10b981; color: white; }
.step-label { font-size: 0.9rem; color: #64748b; }
.step.active .step-label { color: #1e293b; font-weight: 500; }
.step-line { width: 40px; height: 2px; background: #e2e8f0; }
.step-line.completed { background: #10b981; }

/* Wizard Body */
.wizard-body { flex: 1; overflow-y: auto; padding: 24px; }
.wizard-step-content h4 { margin: 0 0 8px 0; font-size: 1.1rem; }
.step-description { margin: 0 0 24px 0; color: #64748b; }

/* Products Grid */
.loading-products { text-align: center; padding: 40px; color: #64748b; }
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.product-card { background: #f8fafc; border: 2px solid transparent; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; position: relative; }
.product-card:hover { border-color: #e2e8f0; background: white; }
.product-card.selected { border-color: #D4775C; background: white; }
.product-image { width: 100%; height: 100px; background: linear-gradient(135deg, #f1f5f9, #e2e8f0); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin-bottom: 12px; }
.product-info h5 { margin: 0 0 4px 0; font-size: 1rem; }
.product-category { margin: 0 0 8px 0; font-size: 0.8rem; color: #64748b; }
.product-price { margin: 0; font-size: 0.9rem; font-weight: 600; color: #D4775C; }
.product-badge { position: absolute; top: 12px; right: 12px; background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
.product-check { position: absolute; top: 12px; left: 12px; width: 24px; height: 24px; background: #D4775C; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }

/* Config Form */
.selected-product-summary { display: flex; align-items: center; gap: 16px; background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
.summary-image { width: 50px; height: 50px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.summary-info { flex: 1; }
.summary-info h5 { margin: 0 0 4px 0; }
.summary-info p { margin: 0; font-size: 0.85rem; color: #64748b; }
.btn-change { padding: 6px 12px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }

.config-form { display: flex; flex-direction: column; gap: 20px; }
.form-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.9rem; }
.form-group input { width: 100%; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 0.95rem; box-sizing: border-box; }
.form-group input:focus { outline: none; border-color: #D4775C; }

.format-options, .paper-options, .cover-options { display: flex; flex-wrap: wrap; gap: 10px; }
.format-option, .paper-option, .cover-option { padding: 12px 16px; background: #f8fafc; border: 2px solid transparent; border-radius: 10px; cursor: pointer; transition: all 0.2s; text-align: center; min-width: 100px; }
.format-option:hover, .paper-option:hover, .cover-option:hover { border-color: #e2e8f0; }
.format-option.selected, .paper-option.selected, .cover-option.selected { border-color: #D4775C; background: white; }
.format-size { display: block; font-weight: 600; font-size: 1rem; }
.format-dimensions { display: block; font-size: 0.8rem; color: #64748b; }
.format-orientation { display: block; font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }
.paper-name, .cover-name { display: block; font-weight: 500; }
.paper-finish, .cover-price { display: block; font-size: 0.8rem; color: #64748b; margin-top: 2px; }

.page-count-selector { display: flex; align-items: center; gap: 16px; }
.page-count-selector button { width: 40px; height: 40px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; font-size: 1.2rem; cursor: pointer; }
.page-count-selector button:hover:not(:disabled) { background: #f8fafc; }
.page-count-selector button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-count-value { font-size: 1.1rem; font-weight: 600; min-width: 120px; text-align: center; }
.page-hint { margin: 8px 0 0 0; font-size: 0.8rem; color: #94a3b8; }

/* Step 3 - Method Selection */
.project-summary { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.project-summary h5 { margin: 0 0 16px 0; font-size: 0.95rem; }
.summary-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
.summary-row span { color: #64748b; }
.summary-row strong { color: #1e293b; }

.method-selection { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.method-card { background: #f8fafc; border: 2px solid transparent; border-radius: 16px; padding: 24px; cursor: pointer; transition: all 0.2s; position: relative; }
.method-card:hover { border-color: #e2e8f0; background: white; }
.method-card.selected { border-color: #D4775C; background: white; }
.method-icon { font-size: 2.5rem; margin-bottom: 16px; }
.method-info h5 { margin: 0 0 8px 0; font-size: 1.1rem; }
.method-info p { margin: 0 0 16px 0; font-size: 0.9rem; color: #64748b; line-height: 1.5; }
.method-features { list-style: none; padding: 0; margin: 0; }
.method-features li { padding: 4px 0; font-size: 0.85rem; color: #475569; }
.method-check { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; background: #D4775C; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }

/* Wizard Footer */
.wizard-footer { display: flex; align-items: center; padding: 20px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
.footer-spacer { flex: 1; }

@media (max-width: 768px) {
  .wizard-modal { max-width: 100%; margin: 10px; }
  .products-grid { grid-template-columns: 1fr; }
  .method-selection { grid-template-columns: 1fr; }
  .summary-details { grid-template-columns: 1fr; }
  .format-options, .paper-options, .cover-options { flex-direction: column; }
  .format-option, .paper-option, .cover-option { min-width: auto; }
}
</style>
