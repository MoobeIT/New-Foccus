<template>
  <div class="studio-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div class="brand-logo">
          <span class="logo-icon">F</span>
          <span class="logo-text">Foccus Studio</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <button 
          :class="['nav-item', { active: activeSection === 'dashboard' }]"
          @click="activeSection = 'dashboard'"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-label">Dashboard</span>
        </button>
        <router-link to="/studio/projects" class="nav-item">
          <span class="nav-icon">📁</span>
          <span class="nav-label">Projetos</span>
        </router-link>
        <router-link to="/studio/clients" class="nav-item">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Clientes</span>
        </router-link>
        <button 
          :class="['nav-item', { active: activeSection === 'approvals' }]"
          @click="activeSection = 'approvals'"
        >
          <span class="nav-icon">✅</span>
          <span class="nav-label">Aprovações</span>
          <span class="nav-badge">3</span>
        </button>
        <router-link to="/studio/orders" class="nav-item">
          <span class="nav-icon">📦</span>
          <span class="nav-label">Pedidos</span>
        </router-link>
        <button 
          :class="['nav-item', { active: activeSection === 'pricing' }]"
          @click="activeSection = 'pricing'"
        >
          <span class="nav-icon">💰</span>
          <span class="nav-label">Tabela de Preços</span>
        </button>
        <button 
          :class="['nav-item', { active: activeSection === 'reports' }]"
          @click="activeSection = 'reports'"
        >
          <span class="nav-icon">📈</span>
          <span class="nav-label">Relatórios</span>
        </button>
        <router-link to="/studio/settings" class="nav-item">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Configurações</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-plan">Plano Pro</span>
          </div>
        </div>
        <button class="logout-btn" @click="handleLogout">
          🚪 Sair
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="main-header">
        <div class="header-left">
          <h1>{{ currentTitle }}</h1>
          <span class="header-date">{{ currentDate }}</span>
        </div>
        <div class="header-right">
          <router-link to="/cart" class="cart-btn" title="Carrinho">
            🛒
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </router-link>
          <button class="btn-primary" @click="handleNewProject">
            <span>✨</span> Novo Projeto
          </button>
          <div class="notifications">
            <button class="notif-btn">
              🔔
              <span v-if="notifications > 0" class="notif-badge">{{ notifications }}</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Dashboard Section -->
      <div v-if="activeSection === 'dashboard'" class="dashboard-content">
        <!-- Loading -->
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Carregando dados...</p>
        </div>

        <template v-else>
        <!-- Welcome Banner -->
        <div class="welcome-banner">
          <div class="welcome-text">
            <h2>Bom dia, {{ firstName }}! 👋</h2>
            <p>Você tem <strong>{{ stats.pendingApproval }} aprovações</strong> pendentes e <strong>{{ stats.inProduction }} projetos</strong> em produção.</p>
          </div>
          <div class="welcome-actions">
            <button class="btn-outline" @click="activeSection = 'approvals'">Ver Aprovações</button>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-header">
              <span class="stat-icon">📁</span>
              <span class="stat-trend up">+12%</span>
            </div>
            <div class="stat-value">{{ stats.totalProjects }}</div>
            <div class="stat-label">Projetos Totais</div>
            <div class="stat-bar"><div class="stat-fill" style="width: 75%"></div></div>
          </div>
          <div class="stat-card orange">
            <div class="stat-header">
              <span class="stat-icon">⏳</span>
              <span class="stat-trend">{{ stats.pendingApproval }} novos</span>
            </div>
            <div class="stat-value">{{ stats.pendingApproval }}</div>
            <div class="stat-label">Aguardando Aprovação</div>
            <div class="stat-bar"><div class="stat-fill" style="width: 30%"></div></div>
          </div>
          <div class="stat-card green">
            <div class="stat-header">
              <span class="stat-icon">💰</span>
              <span class="stat-trend up">+8%</span>
            </div>
            <div class="stat-value">R$ {{ formatCurrency(stats.monthRevenue) }}</div>
            <div class="stat-label">Faturamento do Mês</div>
            <div class="stat-bar"><div class="stat-fill" style="width: 60%"></div></div>
          </div>
          <div class="stat-card purple">
            <div class="stat-header">
              <span class="stat-icon">👥</span>
              <span class="stat-trend up">+3</span>
            </div>
            <div class="stat-value">{{ stats.totalClients }}</div>
            <div class="stat-label">Clientes Ativos</div>
            <div class="stat-bar"><div class="stat-fill" style="width: 85%"></div></div>
          </div>
        </div>

        <!-- Pipeline & Activity -->
        <div class="dashboard-grid">
          <!-- Pipeline -->
          <div class="card pipeline-card">
            <div class="card-header">
              <h3>📊 Pipeline de Projetos</h3>
              <router-link to="/studio/projects" class="btn-link">Ver todos</router-link>
            </div>
            <div class="pipeline">
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot draft"></span>
                  <span>Rascunho</span>
                  <span class="stage-count">{{ pipelineStats.draft }}</span>
                </div>
                <div class="stage-bar draft" :style="{ width: getPipelineWidth('draft') }"></div>
              </div>
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot editing"></span>
                  <span>Em Edição</span>
                  <span class="stage-count">{{ pipelineStats.editing }}</span>
                </div>
                <div class="stage-bar editing" :style="{ width: getPipelineWidth('editing') }"></div>
              </div>
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot pending"></span>
                  <span>Aguardando Aprovação</span>
                  <span class="stage-count">{{ pipelineStats.pending }}</span>
                </div>
                <div class="stage-bar pending" :style="{ width: getPipelineWidth('pending') }"></div>
              </div>
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot approved"></span>
                  <span>Aprovados</span>
                  <span class="stage-count">{{ pipelineStats.approved }}</span>
                </div>
                <div class="stage-bar approved" :style="{ width: getPipelineWidth('approved') }"></div>
              </div>
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot production"></span>
                  <span>Em Produção</span>
                  <span class="stage-count">{{ pipelineStats.production }}</span>
                </div>
                <div class="stage-bar production" :style="{ width: getPipelineWidth('production') }"></div>
              </div>
              <div class="pipeline-stage">
                <div class="stage-header">
                  <span class="stage-dot completed"></span>
                  <span>Concluídos</span>
                  <span class="stage-count">{{ pipelineStats.completed }}</span>
                </div>
                <div class="stage-bar completed" :style="{ width: getPipelineWidth('completed') }"></div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="card activity-card">
            <div class="card-header">
              <h3>🕐 Atividade Recente</h3>
            </div>
            <div class="activity-list">
              <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
                <div :class="['activity-icon', activity.type]">{{ activity.icon }}</div>
                <div class="activity-content">
                  <p>{{ activity.text }}</p>
                  <span class="activity-time">{{ activity.time }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Projects & Upcoming -->
        <div class="dashboard-grid">
          <!-- Recent Projects -->
          <div class="card">
            <div class="card-header">
              <h3>📁 Projetos Recentes</h3>
              <router-link to="/studio/projects" class="btn-link">Ver todos</router-link>
            </div>
            <div class="projects-table">
              <div v-for="project in recentProjects" :key="project.id" class="project-row" @click="goToProject(project.id)">
                <div class="project-thumb">
                  <span v-if="!project.thumbnail">📷</span>
                  <img v-else :src="project.thumbnail" />
                </div>
                <div class="project-info">
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.clientName }}</span>
                </div>
                <div :class="['project-status', project.status]">
                  {{ getStatusLabel(project.status) }}
                </div>
                <div class="project-date">{{ formatDate(project.updatedAt) }}</div>
              </div>
            </div>
          </div>

          <!-- Upcoming Deadlines -->
          <div class="card">
            <div class="card-header">
              <h3>📅 Próximos Prazos</h3>
            </div>
            <div class="deadlines-list">
              <div v-for="deadline in upcomingDeadlines" :key="deadline.id" class="deadline-item">
                <div :class="['deadline-urgency', deadline.urgency]"></div>
                <div class="deadline-info">
                  <strong>{{ deadline.projectName }}</strong>
                  <span>{{ deadline.clientName }}</span>
                </div>
                <div class="deadline-date">
                  <span class="date">{{ deadline.date }}</span>
                  <span class="days">{{ deadline.daysLeft }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </template>
      </div>

      <!-- Approvals Section -->
      <div v-if="activeSection === 'approvals'" class="section-content">
        <ApprovalsSection />
      </div>

      <!-- Pricing Section -->
      <div v-if="activeSection === 'pricing'" class="section-content">
        <PricingSection />
      </div>

      <!-- Reports Section -->
      <div v-if="activeSection === 'reports'" class="section-content">
        <ReportsSection />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { studioService } from '@/services/studio'

// Lazy load sections
import ApprovalsSection from '@/components/studio/ApprovalsSection.vue'
import PricingSection from '@/components/studio/PricingSection.vue'
import ReportsSection from '@/components/studio/ReportsSection.vue'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const activeSection = ref('dashboard')
const notifications = ref(3)
const loading = ref(true)

// Cart
const cartCount = computed(() => cartStore.itemCount)

// Menu items
const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'projects', label: 'Projetos', icon: '📁', badge: '12' },
  { id: 'clients', label: 'Clientes', icon: '👥' },
  { id: 'approvals', label: 'Aprovações', icon: '✅', badge: '3' },
  { id: 'orders', label: 'Pedidos', icon: '📦' },
  { id: 'pricing', label: 'Tabela de Preços', icon: '💰' },
  { id: 'reports', label: 'Relatórios', icon: '📈' },
  { id: 'settings', label: 'Configurações', icon: '⚙️' },
]

// User info
const userName = computed(() => authStore.userName || 'Fotógrafo')
const firstName = computed(() => (authStore.userName || 'Fotógrafo').split(' ')[0])
const userInitials = computed(() => {
  const name = authStore.userName || 'F'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
})

const currentTitle = computed(() => {
  const item = menuItems.find(i => i.id === activeSection.value)
  return item?.label || 'Dashboard'
})

const currentDate = computed(() => {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date())
})

// Stats
const stats = ref({
  totalProjects: 24,
  pendingApproval: 5,
  inProduction: 3,
  totalClients: 18,
  completedOrders: 47,
  monthRevenue: 12450
})

// Pipeline stats
const pipelineStats = ref({
  draft: 2,
  editing: 4,
  pending: 5,
  approved: 3,
  production: 3,
  completed: 7
})

const getPipelineWidth = (stage: string) => {
  const total = Object.values(pipelineStats.value).reduce((a, b) => a + b, 0)
  const value = pipelineStats.value[stage as keyof typeof pipelineStats.value] || 0
  return `${(value / total) * 100}%`
}

// Recent activities
const recentActivities = ref([
  { id: 1, icon: '✅', text: 'Cliente aprovou "Casamento Ana & Pedro"', time: 'há 2 horas', type: 'success' },
  { id: 2, icon: '💬', text: 'Novo comentário em "Ensaio Família Silva"', time: 'há 4 horas', type: 'comment' },
  { id: 3, icon: '📦', text: 'Pedido #1234 enviado para produção', time: 'há 6 horas', type: 'order' },
  { id: 4, icon: '👤', text: 'Novo cliente cadastrado: Maria Santos', time: 'há 1 dia', type: 'client' },
  { id: 5, icon: '📁', text: 'Projeto "15 Anos Julia" criado', time: 'há 2 dias', type: 'project' },
])

// Recent projects
const recentProjects = ref([
  { id: '1', name: 'Casamento Marina & Lucas', clientName: 'Marina Silva', status: 'pending_approval', thumbnail: null, updatedAt: new Date() },
  { id: '2', name: 'Ensaio Família Santos', clientName: 'João Santos', status: 'editing', thumbnail: null, updatedAt: new Date(Date.now() - 86400000) },
  { id: '3', name: '15 Anos - Julia', clientName: 'Carla Mendes', status: 'approved', thumbnail: null, updatedAt: new Date(Date.now() - 172800000) },
  { id: '4', name: 'Newborn - Baby Miguel', clientName: 'Fernanda Costa', status: 'production', thumbnail: null, updatedAt: new Date(Date.now() - 259200000) },
])

// Upcoming deadlines
const upcomingDeadlines = ref([
  { id: 1, projectName: 'Casamento Marina & Lucas', clientName: 'Marina Silva', date: '15 Jan', daysLeft: 'em 3 dias', urgency: 'urgent' },
  { id: 2, projectName: 'Ensaio Família Santos', clientName: 'João Santos', date: '20 Jan', daysLeft: 'em 8 dias', urgency: 'warning' },
  { id: 3, projectName: '15 Anos - Julia', clientName: 'Carla Mendes', date: '28 Jan', daysLeft: 'em 16 dias', urgency: 'normal' },
])

// Methods
const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR')
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(date))
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'draft': 'Rascunho',
    'editing': 'Em Edição',
    'pending_approval': 'Aguardando',
    'approved': 'Aprovado',
    'production': 'Produção',
    'completed': 'Concluído'
  }
  return labels[status] || status
}

const handleNewProject = () => {
  router.push('/studio/projects?newProject=true')
}

const goToProject = (projectId: string) => {
  router.push(`/editor/${projectId}`)
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

onMounted(async () => {
  await loadDashboardData()
})

const loadDashboardData = async () => {
  loading.value = true
  try {
    // Load dashboard stats
    const dashboardStats = await studioService.getDashboardStats()
    
    stats.value = {
      totalProjects: dashboardStats.totalProjects,
      pendingApproval: dashboardStats.pendingApproval,
      inProduction: dashboardStats.inProduction,
      totalClients: dashboardStats.totalClients,
      completedOrders: dashboardStats.completedOrders,
      monthRevenue: dashboardStats.monthRevenue
    }
    
    pipelineStats.value = dashboardStats.pipeline

    // Recent projects já vem do dashboard stats
    if (dashboardStats.recentProjects && Array.isArray(dashboardStats.recentProjects)) {
      recentProjects.value = dashboardStats.recentProjects.slice(0, 4).map((p: any) => ({
        id: p.id,
        name: p.name,
        clientName: p.clientName || 'Projeto',
        status: p.status || 'draft',
        thumbnail: p.thumbnail,
        updatedAt: new Date(p.updatedAt)
      }))
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Layout */
.studio-layout {
  display: flex;
  min-height: 100vh;
  background: #f8fafc;
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  z-index: 100;
}

.sidebar-brand {
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.logo-text {
  font-size: 1.2rem;
  font-weight: 700;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.7);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  margin-bottom: 4px;
  font-size: 0.95rem;
}

.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: white;
}

.nav-item.active {
  background: linear-gradient(135deg, #D4775C, #E8956F);
  color: white;
}

.nav-icon {
  font-size: 1.2rem;
}

.nav-label {
  flex: 1;
}

.nav-badge {
  background: rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.nav-item.active .nav-badge {
  background: rgba(255,255,255,0.3);
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-plan {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
}

.logout-btn {
  width: 100%;
  padding: 10px;
  background: rgba(239,68,68,0.15);
  border: none;
  color: #fca5a5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
}

.logout-btn:hover {
  background: rgba(239,68,68,0.25);
}

/* Main Content */
.main-content {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
}

.main-header {
  background: white;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
}

.header-date {
  color: #64748b;
  font-size: 0.85rem;
  text-transform: capitalize;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(212,119,92,0.3);
}

.btn-outline {
  padding: 10px 20px;
  background: white;
  color: #D4775C;
  border: 2px solid #D4775C;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-outline:hover {
  background: #FEF3E2;
}

.cart-btn {
  position: relative;
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: all 0.2s;
}

.cart-btn:hover {
  background: #e2e8f0;
}

.cart-btn .cart-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  background: #D4775C;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  padding: 0 5px;
}

.notif-btn {
  position: relative;
  width: 44px;
  height: 44px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  font-size: 1.2rem;
  cursor: pointer;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

/* Dashboard Content */
.dashboard-content {
  padding: 24px 32px;
}

/* Welcome Banner */
.welcome-banner {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  color: white;
  padding: 24px 32px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.welcome-text h2 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
}

.welcome-text p {
  margin: 0;
  opacity: 0.8;
}

.welcome-text strong {
  color: #fbbf24;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
}

.stat-card.blue::before { background: #3b82f6; }
.stat-card.orange::before { background: #f97316; }
.stat-card.green::before { background: #10b981; }
.stat-card.purple::before { background: #8b5cf6; }

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-trend {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
}

.stat-trend.up {
  background: #dcfce7;
  color: #16a34a;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.stat-label {
  color: #64748b;
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.stat-bar {
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 2px;
}

.stat-card.blue .stat-fill { background: #3b82f6; }
.stat-card.orange .stat-fill { background: #f97316; }
.stat-card.green .stat-fill { background: #10b981; }
.stat-card.purple .stat-fill { background: #8b5cf6; }

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

/* Cards */
.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1e293b;
}

.btn-link {
  background: none;
  border: none;
  color: #D4775C;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-link:hover {
  text-decoration: underline;
}

/* Pipeline */
.pipeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pipeline-stage {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #64748b;
}

.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.stage-dot.draft { background: #94a3b8; }
.stage-dot.editing { background: #3b82f6; }
.stage-dot.pending { background: #f97316; }
.stage-dot.approved { background: #10b981; }
.stage-dot.production { background: #8b5cf6; }
.stage-dot.completed { background: #22c55e; }

.stage-count {
  margin-left: auto;
  font-weight: 600;
  color: #1e293b;
}

.stage-bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s;
}

.stage-bar.draft { background: #94a3b8; }
.stage-bar.editing { background: #3b82f6; }
.stage-bar.pending { background: #f97316; }
.stage-bar.approved { background: #10b981; }
.stage-bar.production { background: #8b5cf6; }
.stage-bar.completed { background: #22c55e; }

/* Activity */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.activity-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.activity-icon.success { background: #dcfce7; }
.activity-icon.comment { background: #dbeafe; }
.activity-icon.order { background: #fef3c7; }
.activity-icon.client { background: #ede9fe; }
.activity-icon.project { background: #fce7f3; }

.activity-content {
  flex: 1;
}

.activity-content p {
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  color: #1e293b;
}

.activity-time {
  font-size: 0.75rem;
  color: #94a3b8;
}

/* Projects Table */
.projects-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-row:hover {
  background: #f1f5f9;
}

.project-thumb {
  width: 48px;
  height: 48px;
  background: #e2e8f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  overflow: hidden;
}

.project-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.project-info strong {
  font-size: 0.9rem;
  color: #1e293b;
}

.project-info span {
  font-size: 0.8rem;
  color: #64748b;
}

.project-status {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.project-status.draft { background: #f1f5f9; color: #64748b; }
.project-status.editing { background: #dbeafe; color: #1d4ed8; }
.project-status.pending_approval { background: #fef3c7; color: #b45309; }
.project-status.approved { background: #dcfce7; color: #16a34a; }
.project-status.production { background: #ede9fe; color: #7c3aed; }
.project-status.completed { background: #d1fae5; color: #059669; }

.project-date {
  font-size: 0.8rem;
  color: #94a3b8;
}

/* Deadlines */
.deadlines-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deadline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 10px;
}

.deadline-urgency {
  width: 4px;
  height: 40px;
  border-radius: 2px;
}

.deadline-urgency.urgent { background: #ef4444; }
.deadline-urgency.warning { background: #f97316; }
.deadline-urgency.normal { background: #10b981; }

.deadline-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.deadline-info strong {
  font-size: 0.9rem;
  color: #1e293b;
}

.deadline-info span {
  font-size: 0.8rem;
  color: #64748b;
}

.deadline-date {
  text-align: right;
}

.deadline-date .date {
  display: block;
  font-weight: 600;
  color: #1e293b;
}

.deadline-date .days {
  font-size: 0.75rem;
  color: #64748b;
}

/* Section Content */
.section-content {
  padding: 24px 32px;
  flex: 1;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #64748b;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #D4775C;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }
  .logo-text, .nav-label, .nav-badge, .user-info, .logout-btn span {
    display: none;
  }
  .main-content {
    margin-left: 70px;
  }
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
