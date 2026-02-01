<template>
  <div class="projects-page">
    <!-- Nav -->
    <nav class="nav">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/">Home</router-link>
          <router-link to="/products">Produtos</router-link>
          <router-link to="/projects" class="active">Meus Projetos</router-link>
        </div>
        <div class="nav-actions">
          <NotificationBell />
          <router-link to="/cart" class="cart-link">
            🛒
            <span v-if="cartItemCount > 0" class="cart-badge">{{ cartItemCount }}</span>
          </router-link>
        </div>
      </div>
    </nav>

    <div class="container">
      <header class="page-header">
        <div class="header-content">
          <h1>Meus Projetos</h1>
          <p>Gerencie seus álbuns em andamento</p>
        </div>
        <router-link to="/products" class="btn-new-project">
          + Novo Projeto
        </router-link>
      </header>

      <!-- Filtros -->
      <div class="filters">
        <button 
          v-for="filter in filters" 
          :key="filter.value"
          :class="['filter-btn', { active: activeFilter === filter.value }]"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
          <span class="filter-count">{{ getFilterCount(filter.value) }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando projetos...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProjects.length === 0" class="empty-state">
        <div class="empty-icon">📚</div>
        <h2>Nenhum projeto encontrado</h2>
        <p v-if="activeFilter === 'all'">Comece criando seu primeiro álbum!</p>
        <p v-else>Nenhum projeto com este status.</p>
        <router-link to="/products" class="btn-primary">
          Criar Novo Projeto
        </router-link>
      </div>

      <!-- Projects Grid -->
      <div v-else class="projects-grid">
        <div 
          v-for="project in filteredProjects" 
          :key="project.id"
          class="project-card"
        >
          <div class="project-thumbnail">
            <img v-if="project.thumbnailUrl" :src="project.thumbnailUrl" :alt="project.name" />
            <div v-else class="thumbnail-placeholder">
              <span>📷</span>
            </div>
            <div class="project-status" :class="`status--${project.status}`">
              {{ getStatusLabel(project.status) }}
            </div>
          </div>

          <div class="project-info">
            <h3>{{ project.name }}</h3>
            <p class="project-product">{{ project.productSelection?.productName }}</p>
            <div class="project-meta">
              <span>{{ project.productSelection?.pages }} páginas</span>
              <span>•</span>
              <span>{{ formatDate(project.updatedAt) }}</span>
            </div>
          </div>

          <div class="project-price">
            <span class="price-label">Total</span>
            <span class="price-value">R$ {{ formatPrice(project.productSelection?.totalPrice) }}</span>
          </div>

          <div class="project-actions">
            <button 
              v-if="project.status === 'draft' || project.status === 'editing'"
              class="btn-edit"
              @click="editProject(project)"
            >
              ✏️ Continuar Editando
            </button>
            <button 
              v-if="project.status === 'ready'"
              class="btn-cart"
              @click="addToCart(project)"
            >
              🛒 Adicionar ao Carrinho
            </button>
            <button 
              v-if="project.status === 'ordered'"
              class="btn-view"
              @click="viewOrder(project)"
            >
              📋 Ver Pedido
            </button>
            <button class="btn-duplicate" @click="duplicateProject(project)" title="Duplicar">
              📄
            </button>
            <button class="btn-delete" @click="deleteProject(project)" title="Excluir">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <p>© 2025 Foccus Álbuns. Todos os direitos reservados.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { purchaseFlowService, type ProjectData } from '@/services/purchaseFlow'
import NotificationBell from '@/components/common/NotificationBell.vue'

const router = useRouter()
const cartStore = useCartStore()

const loading = ref(true)
const projects = ref<ProjectData[]>([])
const activeFilter = ref('all')

const filters = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunhos', value: 'draft' },
  { label: 'Em Edição', value: 'editing' },
  { label: 'Prontos', value: 'ready' },
  { label: 'Pedidos', value: 'ordered' },
]

const cartItemCount = computed(() => cartStore.itemCount)

const filteredProjects = computed(() => {
  if (activeFilter.value === 'all') return projects.value
  return projects.value.filter(p => p.status === activeFilter.value)
})

const getFilterCount = (filter: string): number => {
  if (filter === 'all') return projects.value.length
  return projects.value.filter(p => p.status === filter).length
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    editing: 'Em Edição',
    ready: 'Pronto',
    ordered: 'Pedido Feito',
  }
  return labels[status] || status
}

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatPrice = (price: number | undefined): string => {
  return (price || 0).toFixed(2).replace('.', ',')
}

const loadProjects = () => {
  loading.value = true
  try {
    projects.value = purchaseFlowService.getProjectsFromStorage()
  } finally {
    loading.value = false
  }
}

const editProject = (project: ProjectData) => {
  purchaseFlowService.loadProject(project.id!)
  router.push(`/editor?project=${project.id}`)
}

const addToCart = async (project: ProjectData) => {
  purchaseFlowService.loadProject(project.id!)
  const success = await purchaseFlowService.finishProjectAndAddToCart()
  
  if (success) {
    // Atualizar status do projeto
    project.status = 'ordered'
    loadProjects()
    
    // Ir para o carrinho
    router.push('/cart')
  }
}

const viewOrder = (project: ProjectData) => {
  router.push('/orders')
}

const duplicateProject = (project: ProjectData) => {
  const newProject: ProjectData = {
    ...project,
    id: undefined,
    name: `${project.name} (Cópia)`,
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  purchaseFlowService.createProject(newProject.productSelection)
  loadProjects()
}

const deleteProject = (project: ProjectData) => {
  if (!confirm(`Tem certeza que deseja excluir "${project.name}"?`)) return
  
  purchaseFlowService.deleteProject(project.id!)
  loadProjects()
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.projects-page {
  min-height: 100vh;
  background: #FDFBF7;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Nav */
.nav {
  background: #fff;
  border-bottom: 1px solid #EBE7E0;
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #2D2A26;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
}

.nav-links {
  display: flex;
  gap: 24px;
}

.nav-links a {
  color: #6B6560;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.nav-links a:hover,
.nav-links a.active {
  color: #D4775C;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-link {
  position: relative;
  font-size: 1.25rem;
  text-decoration: none;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  background: #D4775C;
  color: #fff;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 40px 0 32px;
}

.header-content h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2D2A26;
  margin: 0 0 4px;
}

.header-content p {
  color: #6B6560;
  margin: 0;
}

.btn-new-project {
  padding: 12px 24px;
  background: linear-gradient(135deg, #D4775C, #C96B50);
  color: #fff;
  text-decoration: none;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-new-project:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 119, 92, 0.3);
}

/* Filters */
.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 20px;
  font-size: 14px;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-btn:hover {
  border-color: #D4775C;
}

.filter-btn.active {
  background: #D4775C;
  border-color: #D4775C;
  color: #fff;
}

.filter-count {
  font-size: 12px;
  opacity: 0.8;
}

/* Loading & Empty */
.loading-state,
.empty-state {
  text-align: center;
  padding: 80px 24px;
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

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 1.25rem;
  color: #2D2A26;
  margin-bottom: 8px;
}

.empty-state p {
  color: #6B6560;
  margin-bottom: 24px;
}

.btn-primary {
  display: inline-block;
  padding: 12px 24px;
  background: #D4775C;
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
}

/* Projects Grid */
.projects-grid {
  display: grid;
  gap: 20px;
  padding-bottom: 60px;
}

.project-card {
  display: grid;
  grid-template-columns: 140px 1fr auto auto;
  gap: 20px;
  align-items: center;
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s;
}

.project-card:hover {
  box-shadow: 0 8px 24px rgba(45, 42, 38, 0.08);
  border-color: #D4D0C8;
}

.project-thumbnail {
  width: 140px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #F7F4EE, #EBE7E0);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.project-status {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

.status--draft { background: #FEF3C7; color: #92400E; }
.status--editing { background: #DBEAFE; color: #1E40AF; }
.status--ready { background: #D1FAE5; color: #065F46; }
.status--ordered { background: #E0E7FF; color: #3730A3; }

.project-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #2D2A26;
  margin: 0 0 4px;
}

.project-product {
  font-size: 0.875rem;
  color: #6B6560;
  margin: 0 0 8px;
}

.project-meta {
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  color: #9A958E;
}

.project-price {
  text-align: right;
}

.price-label {
  display: block;
  font-size: 0.75rem;
  color: #9A958E;
}

.price-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #D4775C;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-cart,
.btn-view {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-edit {
  background: #D4775C;
  color: #fff;
}

.btn-edit:hover {
  background: #C96B50;
}

.btn-cart {
  background: #10B981;
  color: #fff;
}

.btn-cart:hover {
  background: #059669;
}

.btn-view {
  background: #3B82F6;
  color: #fff;
}

.btn-view:hover {
  background: #2563EB;
}

.btn-duplicate,
.btn-delete {
  width: 36px;
  height: 36px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-duplicate:hover {
  background: #F7F4EE;
}

.btn-delete:hover {
  background: #FEE2E2;
  border-color: #FECACA;
}

/* Footer */
.footer {
  padding: 32px 24px;
  background: #2D2A26;
  text-align: center;
  margin-top: auto;
}

.footer p {
  color: #78716C;
  font-size: 14px;
  margin: 0;
}

/* Responsive */
@media (max-width: 900px) {
  .project-card {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .project-thumbnail {
    width: 100%;
    height: 160px;
  }

  .project-price {
    text-align: left;
  }

  .project-actions {
    flex-wrap: wrap;
  }
}

@media (max-width: 640px) {
  .nav-links {
    display: none;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
