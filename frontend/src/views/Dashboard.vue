<template>
  <div class="dashboard">
    <!-- Nav -->
    <nav class="nav">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>
        <div class="nav-menu">
          <router-link to="/dashboard" class="active">Dashboard</router-link>
          <router-link to="/projects">Projetos</router-link>
          <router-link to="/orders">Pedidos</router-link>
          <router-link to="/clients">Clientes</router-link>
        </div>
        <div class="nav-actions">
          <NotificationBell />
          <router-link to="/cart" class="cart-btn">
            🛒
            <span v-if="cartCount > 0" class="cart-badge">{{ cartCount }}</span>
          </router-link>
          <div class="user-menu">
            <span class="user-avatar">{{ userInitials }}</span>
            <span class="user-name">{{ userName }}</span>
          </div>
        </div>
      </div>
    </nav>

    <div class="dashboard-content">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-left">
          <h1>Olá, {{ userFirstName }}! 👋</h1>
          <p>Aqui está o resumo do seu negócio</p>
        </div>
        <div class="header-actions">
          <router-link to="/editor" class="btn-primary">
            + Novo Projeto
          </router-link>
        </div>
      </header>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">📚</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalProjects }}</span>
            <span class="stat-label">Projetos Criados</span>
          </div>
          <div class="stat-trend up">
            <span>+{{ stats.projectsThisMonth }}</span> este mês
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">📦</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.pendingOrders }}</span>
            <span class="stat-label">Pedidos em Andamento</span>
          </div>
          <div class="stat-trend">
            {{ stats.ordersInProduction }} em produção
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">💰</div>
          <div class="stat-info">
            <span class="stat-value">R$ {{ formatCurrency(stats.totalRevenue) }}</span>
            <span class="stat-label">Faturamento Total</span>
          </div>
          <div class="stat-trend up">
            +{{ stats.revenueGrowth }}% vs mês anterior
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple">👥</div>
          <div class="stat-info">
            <span class="stat-value">{{ stats.totalClients }}</span>
            <span class="stat-label">Clientes Atendidos</span>
          </div>
          <div class="stat-trend">
            {{ stats.newClientsThisMonth }} novos este mês
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="main-grid">
        <!-- Left Column -->
        <div class="left-column">
          <!-- Revenue Chart -->
          <div class="card chart-card">
            <div class="card-header">
              <h3>Faturamento</h3>
              <div class="period-selector">
                <button 
                  v-for="period in periods" 
                  :key="period.value"
                  :class="{ active: selectedPeriod === period.value }"
                  @click="selectedPeriod = period.value"
                >
                  {{ period.label }}
                </button>
              </div>
            </div>
            <div class="chart-container">
              <div class="chart-bars">
                <div 
                  v-for="(item, index) in chartData" 
                  :key="index"
                  class="chart-bar-wrapper"
                >
                  <div 
                    class="chart-bar" 
                    :style="{ height: `${(item.value / maxChartValue) * 100}%` }"
                  >
                    <span class="bar-tooltip">R$ {{ formatCurrency(item.value) }}</span>
                  </div>
                  <span class="bar-label">{{ item.label }}</span>
                </div>
              </div>
            </div>
            <div class="chart-summary">
              <div class="summary-item">
                <span class="summary-label">Total do período</span>
                <span class="summary-value">R$ {{ formatCurrency(totalPeriodRevenue) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Média mensal</span>
                <span class="summary-value">R$ {{ formatCurrency(averageRevenue) }}</span>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="card">
            <div class="card-header">
              <h3>Pedidos Recentes</h3>
              <router-link to="/orders" class="view-all">Ver todos →</router-link>
            </div>
            <div class="orders-list">
              <div v-for="order in recentOrders" :key="order.id" class="order-item">
                <div class="order-thumb">
                  <span>{{ order.icon }}</span>
                </div>
                <div class="order-info">
                  <span class="order-name">{{ order.productName }}</span>
                  <span class="order-client">{{ order.clientName }}</span>
                </div>
                <div class="order-status" :class="`status--${order.status}`">
                  {{ getStatusLabel(order.status) }}
                </div>
                <div class="order-value">
                  R$ {{ formatCurrency(order.total) }}
                </div>
              </div>
              <div v-if="recentOrders.length === 0" class="empty-state">
                <p>Nenhum pedido recente</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div class="right-column">
          <!-- Pending Approvals -->
          <div class="card">
            <div class="card-header">
              <h3>⏳ Aguardando Aprovação</h3>
              <span class="badge">{{ pendingApprovals.length }}</span>
            </div>
            <div class="approvals-list">
              <div v-for="approval in pendingApprovals" :key="approval.id" class="approval-item">
                <div class="approval-info">
                  <span class="approval-project">{{ approval.projectName }}</span>
                  <span class="approval-client">{{ approval.clientName }}</span>
                  <span class="approval-date">Enviado {{ formatRelativeDate(approval.sentAt) }}</span>
                </div>
                <div class="approval-actions">
                  <button class="btn-sm" @click="resendApproval(approval)">Reenviar</button>
                  <button class="btn-sm primary" @click="viewApproval(approval)">Ver</button>
                </div>
              </div>
              <div v-if="pendingApprovals.length === 0" class="empty-state small">
                <span>✅</span>
                <p>Nenhuma aprovação pendente</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="card">
            <div class="card-header">
              <h3>Ações Rápidas</h3>
            </div>
            <div class="quick-actions">
              <router-link to="/editor" class="quick-action">
                <span class="action-icon">📝</span>
                <span>Novo Projeto</span>
              </router-link>
              <router-link to="/products" class="quick-action">
                <span class="action-icon">📦</span>
                <span>Ver Produtos</span>
              </router-link>
              <router-link to="/clients/new" class="quick-action">
                <span class="action-icon">👤</span>
                <span>Novo Cliente</span>
              </router-link>
              <router-link to="/templates" class="quick-action">
                <span class="action-icon">🎨</span>
                <span>Templates</span>
              </router-link>
            </div>
          </div>

          <!-- Loyalty Program -->
          <div class="card loyalty-card">
            <div class="loyalty-header">
              <span class="loyalty-badge">{{ loyaltyLevel }}</span>
              <h3>Programa de Fidelidade</h3>
            </div>
            <div class="loyalty-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${loyaltyProgress}%` }"></div>
              </div>
              <div class="progress-info">
                <span>{{ loyaltyPoints }} pontos</span>
                <span>{{ pointsToNextLevel }} para {{ nextLevel }}</span>
              </div>
            </div>
            <div class="loyalty-benefits">
              <span class="benefit">🎁 {{ currentDiscount }}% de desconto</span>
              <span class="benefit">🚚 Frete grátis +R${{ freeShippingThreshold }}</span>
            </div>
          </div>

          <!-- Upcoming Dates -->
          <div class="card">
            <div class="card-header">
              <h3>📅 Próximas Datas</h3>
            </div>
            <div class="dates-list">
              <div v-for="date in upcomingDates" :key="date.id" class="date-item">
                <div class="date-badge" :class="date.type">
                  <span class="date-day">{{ date.day }}</span>
                  <span class="date-month">{{ date.month }}</span>
                </div>
                <div class="date-info">
                  <span class="date-title">{{ date.title }}</span>
                  <span class="date-client">{{ date.clientName }}</span>
                </div>
              </div>
              <div v-if="upcomingDates.length === 0" class="empty-state small">
                <p>Nenhuma data próxima</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import NotificationBell from '@/components/common/NotificationBell.vue'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

const cartCount = computed(() => cartStore.itemCount)
const userName = computed(() => authStore.user?.name || 'Fotógrafo')
const userFirstName = computed(() => userName.value.split(' ')[0])
const userInitials = computed(() => {
  const parts = userName.value.split(' ')
  return parts.length > 1 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
})

// Stats
const stats = ref({
  totalProjects: 47,
  projectsThisMonth: 8,
  pendingOrders: 5,
  ordersInProduction: 3,
  totalRevenue: 28450,
  revenueGrowth: 12,
  totalClients: 32,
  newClientsThisMonth: 4
})

// Chart
const selectedPeriod = ref('6m')
const periods = [
  { label: '3M', value: '3m' },
  { label: '6M', value: '6m' },
  { label: '1A', value: '1y' }
]

const chartData = ref([
  { label: 'Jul', value: 3200 },
  { label: 'Ago', value: 4100 },
  { label: 'Set', value: 3800 },
  { label: 'Out', value: 5200 },
  { label: 'Nov', value: 4800 },
  { label: 'Dez', value: 7350 }
])

const maxChartValue = computed(() => Math.max(...chartData.value.map(d => d.value)) * 1.1)
const totalPeriodRevenue = computed(() => chartData.value.reduce((sum, d) => sum + d.value, 0))
const averageRevenue = computed(() => totalPeriodRevenue.value / chartData.value.length)

// Recent Orders
const recentOrders = ref([
  { id: '1', icon: '📖', productName: 'Álbum Casamento Premium', clientName: 'Maria Silva', status: 'production', total: 459.90 },
  { id: '2', icon: '📖', productName: 'Álbum Ensaio 25x25', clientName: 'João Santos', status: 'shipped', total: 299.90 },
  { id: '3', icon: '🎁', productName: 'Estojo Madeira Luxo', clientName: 'Ana Costa', status: 'pending', total: 189.90 },
  { id: '4', icon: '📖', productName: 'Álbum Newborn', clientName: 'Pedro Lima', status: 'delivered', total: 199.90 }
])

// Pending Approvals
const pendingApprovals = ref([
  { id: '1', projectName: 'Casamento Marina & Lucas', clientName: 'Marina Rodrigues', sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { id: '2', projectName: 'Ensaio Família Santos', clientName: 'Carla Santos', sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
])

// Loyalty
const loyaltyLevel = ref('Prata')
const loyaltyPoints = ref(2450)
const loyaltyProgress = ref(65)
const pointsToNextLevel = ref(1550)
const nextLevel = ref('Ouro')
const currentDiscount = ref(10)
const freeShippingThreshold = ref(250)

// Upcoming Dates
const upcomingDates = ref([
  { id: '1', day: '15', month: 'Jan', title: 'Aniversário de Casamento', clientName: 'Maria & João Silva', type: 'anniversary' },
  { id: '2', day: '22', month: 'Jan', title: 'Aniversário', clientName: 'Ana Costa', type: 'birthday' }
])

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const formatRelativeDate = (date: Date) => {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'hoje'
  if (diffDays === 1) return 'ontem'
  return `há ${diffDays} dias`
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Aguardando',
    paid: 'Pago',
    production: 'Produção',
    shipped: 'Enviado',
    delivered: 'Entregue'
  }
  return labels[status] || status
}

const resendApproval = (approval: any) => {
  console.log('Resending approval:', approval.id)
}

const viewApproval = (approval: any) => {
  router.push(`/projects/${approval.id}/approval`)
}

onMounted(() => {
  // Load dashboard data from API
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #F7F4EE;
}

/* Nav */
.nav {
  background: #fff;
  border-bottom: 1px solid #EBE7E0;
  padding: 12px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-inner {
  max-width: 1400px;
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

.nav-menu {
  display: flex;
  gap: 8px;
}

.nav-menu a {
  color: #6B6560;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-menu a:hover {
  background: #F7F4EE;
  color: #2D2A26;
}

.nav-menu a.active {
  background: #FEF3E2;
  color: #D4775C;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-btn {
  position: relative;
  font-size: 1.25rem;
  text-decoration: none;
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  background: #D4775C;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 6px 6px;
  background: #F7F4EE;
  border-radius: 50px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #D4775C, #E8956F);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

/* Dashboard Content */
.dashboard-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 28px;
  font-weight: 700;
  color: #2D2A26;
  margin-bottom: 4px;
}

.header-left p {
  font-size: 15px;
  color: #6B6560;
}

.btn-primary {
  background: linear-gradient(135deg, #D4775C, #C96B50);
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 10px;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 119, 92, 0.3);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border: 1px solid #EBE7E0;
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(45, 42, 38, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.blue { background: #DBEAFE; }
.stat-icon.orange { background: #FEF3E2; }
.stat-icon.green { background: #D1FAE5; }
.stat-icon.purple { background: #EDE9FE; }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #2D2A26;
}

.stat-label {
  font-size: 14px;
  color: #6B6560;
}

.stat-trend {
  font-size: 13px;
  color: #6B6560;
}

.stat-trend.up {
  color: #10B981;
}

.stat-trend.up span {
  font-weight: 600;
}

/* Main Grid */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}

/* Cards */
.card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #EBE7E0;
  margin-bottom: 24px;
}

.card:last-child {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2D2A26;
}

.view-all {
  font-size: 13px;
  color: #D4775C;
  text-decoration: none;
  font-weight: 500;
}

.view-all:hover {
  text-decoration: underline;
}

.badge {
  background: #D4775C;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 50px;
}

/* Chart */
.chart-card {
  min-height: 400px;
}

.period-selector {
  display: flex;
  gap: 4px;
  background: #F7F4EE;
  padding: 4px;
  border-radius: 8px;
}

.period-selector button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #6B6560;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.period-selector button.active {
  background: #fff;
  color: #2D2A26;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.chart-container {
  height: 220px;
  margin-bottom: 20px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 100%;
  padding: 20px 0;
  gap: 12px;
}

.chart-bar-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.chart-bar {
  width: 100%;
  max-width: 48px;
  background: linear-gradient(180deg, #D4775C 0%, #E8956F 100%);
  border-radius: 8px 8px 0 0;
  position: relative;
  transition: all 0.3s;
  cursor: pointer;
  margin-top: auto;
}

.chart-bar:hover {
  opacity: 0.9;
}

.bar-tooltip {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  background: #2D2A26;
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
}

.chart-bar:hover .bar-tooltip {
  opacity: 1;
}

.bar-label {
  margin-top: 12px;
  font-size: 13px;
  color: #6B6560;
}

.chart-summary {
  display: flex;
  gap: 32px;
  padding-top: 20px;
  border-top: 1px solid #EBE7E0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-label {
  font-size: 13px;
  color: #6B6560;
}

.summary-value {
  font-size: 20px;
  font-weight: 700;
  color: #2D2A26;
}

/* Orders List */
.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #FDFBF7;
  border-radius: 12px;
  transition: all 0.2s;
}

.order-item:hover {
  background: #F7F4EE;
}

.order-thumb {
  width: 44px;
  height: 44px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 1px solid #EBE7E0;
}

.order-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.order-name {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.order-client {
  font-size: 13px;
  color: #6B6560;
}

.order-status {
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
}

.status--pending { background: #FEF3C7; color: #92400E; }
.status--paid { background: #DBEAFE; color: #1E40AF; }
.status--production { background: #E0E7FF; color: #3730A3; }
.status--shipped { background: #D1FAE5; color: #065F46; }
.status--delivered { background: #D1FAE5; color: #065F46; }

.order-value {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

/* Approvals */
.approvals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.approval-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #FEF3E2;
  border-radius: 12px;
}

.approval-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.approval-project {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.approval-client {
  font-size: 13px;
  color: #6B6560;
}

.approval-date {
  font-size: 12px;
  color: #9A958E;
}

.approval-actions {
  display: flex;
  gap: 8px;
}

.btn-sm {
  padding: 6px 12px;
  border: 1px solid #E5E0D8;
  background: #fff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-sm:hover {
  background: #F7F4EE;
}

.btn-sm.primary {
  background: #D4775C;
  border-color: #D4775C;
  color: #fff;
}

.btn-sm.primary:hover {
  background: #C96B50;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: #FDFBF7;
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.quick-action:hover {
  background: #F7F4EE;
  transform: translateY(-2px);
}

.action-icon {
  font-size: 28px;
}

.quick-action span:last-child {
  font-size: 13px;
  font-weight: 500;
  color: #2D2A26;
}

/* Loyalty Card */
.loyalty-card {
  background: linear-gradient(135deg, #2D2A26 0%, #4A4744 100%);
  color: #fff;
}

.loyalty-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.loyalty-badge {
  background: linear-gradient(135deg, #C0C0C0, #E8E8E8);
  color: #2D2A26;
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 700;
}

.loyalty-header h3 {
  color: #fff;
  font-size: 16px;
}

.loyalty-progress {
  margin-bottom: 20px;
}

.progress-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D4775C, #E8956F);
  border-radius: 4px;
  transition: width 0.5s;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
}

.loyalty-benefits {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.benefit {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* Dates */
.dates-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #FDFBF7;
  border-radius: 12px;
}

.date-badge {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #FEF3E2;
}

.date-badge.anniversary {
  background: #FCE7F3;
}

.date-badge.birthday {
  background: #DBEAFE;
}

.date-day {
  font-size: 18px;
  font-weight: 700;
  color: #2D2A26;
  line-height: 1;
}

.date-month {
  font-size: 11px;
  color: #6B6560;
  text-transform: uppercase;
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-title {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.date-client {
  font-size: 13px;
  color: #6B6560;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 32px;
  color: #6B6560;
}

.empty-state.small {
  padding: 20px;
}

.empty-state span {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
}

/* Responsive */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .nav-menu {
    display: none;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .chart-bars {
    gap: 8px;
  }
}
</style>
