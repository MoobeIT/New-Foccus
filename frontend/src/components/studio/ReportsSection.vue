<template>
  <div class="reports-section">
    <div class="section-header">
      <div class="header-left">
        <h2>📈 Relatórios</h2>
        <p>Acompanhe o desempenho do seu negócio</p>
      </div>
      <div class="header-actions">
        <select v-model="period" class="filter-select">
          <option value="week">Última Semana</option>
          <option value="month">Último Mês</option>
          <option value="quarter">Último Trimestre</option>
          <option value="year">Último Ano</option>
        </select>
        <button class="btn-export" @click="exportReport">📥 Exportar</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <span>⏳</span> Carregando relatórios...
    </div>

    <template v-else>
      <!-- Revenue Stats -->
      <div class="revenue-grid">
        <div class="revenue-card main">
          <span class="revenue-label">Faturamento Total</span>
          <span class="revenue-value">R$ {{ formatCurrency(stats.totalRevenue) }}</span>
          <span class="revenue-trend up" v-if="stats.totalRevenue > 0">Baseado em {{ stats.totalOrders }} pedidos</span>
        </div>
        <div class="revenue-card">
          <span class="revenue-label">Ticket Médio</span>
          <span class="revenue-value">R$ {{ formatCurrency(stats.avgTicket) }}</span>
        </div>
        <div class="revenue-card">
          <span class="revenue-label">Pedidos</span>
          <span class="revenue-value">{{ stats.totalOrders }}</span>
        </div>
        <div class="revenue-card">
          <span class="revenue-label">Novos Clientes</span>
          <span class="revenue-value">{{ stats.newClients }}</span>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-grid">
        <div class="chart-card">
          <h3>📊 Projetos por Status</h3>
          <div class="status-chart">
            <div v-for="(item, key) in projectsByStatus" :key="key" class="status-item">
              <div class="status-bar" :style="{ width: getStatusWidth(item) + '%', background: getStatusColor(key) }"></div>
              <div class="status-info">
                <span class="status-name">{{ getStatusName(key) }}</span>
                <span class="status-count">{{ item }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="chart-card">
          <h3>🎯 Produtos Mais Usados</h3>
          <div class="products-ranking">
            <div v-for="(product, i) in topProducts" :key="i" class="ranking-item">
              <span class="rank">{{ i + 1 }}º</span>
              <span class="product-name">{{ product.name }}</span>
              <span class="product-count">{{ product.count }} projetos</span>
              <div class="progress-bar">
                <div class="progress" :style="{ width: getProductWidth(product.count) + '%' }"></div>
              </div>
            </div>
            <div v-if="topProducts.length === 0" class="empty-chart">
              <span>📭</span>
              <p>Nenhum produto utilizado ainda</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Conversion Funnel -->
      <div class="funnel-section">
        <h3>🔄 Funil de Conversão</h3>
        <div class="funnel">
          <div class="funnel-step" :style="{ '--width': '100%' }">
            <span class="step-value">{{ funnel.projects }}</span>
            <span class="step-label">Projetos Criados</span>
          </div>
          <div class="funnel-step" :style="{ '--width': getFunnelWidth(funnel.sent) }">
            <span class="step-value">{{ funnel.sent }}</span>
            <span class="step-label">Enviados para Aprovação</span>
          </div>
          <div class="funnel-step" :style="{ '--width': getFunnelWidth(funnel.approved) }">
            <span class="step-value">{{ funnel.approved }}</span>
            <span class="step-label">Aprovados</span>
          </div>
          <div class="funnel-step" :style="{ '--width': getFunnelWidth(funnel.ordered) }">
            <span class="step-value">{{ funnel.ordered }}</span>
            <span class="step-label">Pedidos Realizados</span>
          </div>
        </div>
      </div>

      <!-- Client Stats -->
      <div class="client-stats-section">
        <h3>👥 Estatísticas de Clientes</h3>
        <div class="client-stats-grid">
          <div class="client-stat">
            <span class="stat-icon">👥</span>
            <span class="stat-value">{{ clientStats.total }}</span>
            <span class="stat-label">Total de Clientes</span>
          </div>
          <div class="client-stat">
            <span class="stat-icon">✅</span>
            <span class="stat-value">{{ clientStats.activeClients }}</span>
            <span class="stat-label">Com Projetos</span>
          </div>
          <div class="client-stat">
            <span class="stat-icon">🆕</span>
            <span class="stat-value">{{ clientStats.newThisMonth }}</span>
            <span class="stat-label">Novos (30 dias)</span>
          </div>
          <div class="client-stat">
            <span class="stat-icon">💰</span>
            <span class="stat-value">R$ {{ formatCurrency(clientStats.totalRevenue) }}</span>
            <span class="stat-label">Faturamento Clientes</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { studioService } from '@/services/studio'

const loading = ref(true)
const period = ref('month')

const stats = ref({
  totalRevenue: 0,
  avgTicket: 0,
  totalOrders: 0,
  newClients: 0
})

const projectsByStatus = ref<Record<string, number>>({})
const topProducts = ref<{ name: string; count: number }[]>([])
const funnel = ref({ projects: 0, sent: 0, approved: 0, ordered: 0 })
const clientStats = ref({ total: 0, activeClients: 0, newThisMonth: 0, totalRevenue: 0 })

const loadData = async () => {
  loading.value = true
  try {
    const [dashboardData, clientStatsData, approvalStats] = await Promise.all([
      studioService.getDashboardStats(),
      studioService.getClientStats(),
      studioService.getApprovalStats()
    ])

    // Stats principais
    stats.value = {
      totalRevenue: dashboardData.monthRevenue || 0,
      avgTicket: dashboardData.completedOrders > 0 
        ? dashboardData.monthRevenue / dashboardData.completedOrders 
        : 0,
      totalOrders: dashboardData.completedOrders || 0,
      newClients: clientStatsData.newThisMonth || 0
    }

    // Projetos por status
    projectsByStatus.value = dashboardData.pipeline || {}

    // Top produtos (do byProduct)
    const byProduct = dashboardData.recentProjects?.reduce((acc: Record<string, number>, p: any) => {
      const name = p.productName || 'Sem produto'
      acc[name] = (acc[name] || 0) + 1
      return acc
    }, {}) || {}
    
    topProducts.value = Object.entries(byProduct)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Funil de conversão
    funnel.value = {
      projects: dashboardData.totalProjects || 0,
      sent: approvalStats.total || 0,
      approved: approvalStats.approved || 0,
      ordered: dashboardData.completedOrders || 0
    }

    // Client stats
    clientStats.value = clientStatsData
  } catch (error) {
    console.error('Erro ao carregar relatórios:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(period, loadData)

const formatCurrency = (value: number) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

const maxStatus = computed(() => Math.max(...Object.values(projectsByStatus.value), 1))
const getStatusWidth = (value: number) => (value / maxStatus.value) * 100

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    draft: '#94a3b8',
    editing: '#3b82f6',
    pending: '#f97316',
    approved: '#10b981',
    production: '#8b5cf6',
    completed: '#059669'
  }
  return colors[status] || '#64748b'
}

const getStatusName = (status: string) => {
  const names: Record<string, string> = {
    draft: 'Rascunho',
    editing: 'Em Edição',
    pending: 'Aguardando',
    approved: 'Aprovado',
    production: 'Produção',
    completed: 'Concluído'
  }
  return names[status] || status
}

const maxProduct = computed(() => Math.max(...topProducts.value.map(p => p.count), 1))
const getProductWidth = (count: number) => (count / maxProduct.value) * 100

const getFunnelWidth = (value: number) => {
  if (funnel.value.projects === 0) return '30%'
  const percentage = Math.max((value / funnel.value.projects) * 100, 30)
  return percentage + '%'
}

const exportReport = () => {
  alert('Funcionalidade de exportação em desenvolvimento')
}
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.header-actions { display: flex; gap: 12px; }
.filter-select { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; }
.btn-export { padding: 10px 20px; background: #1e293b; color: white; border: none; border-radius: 10px; cursor: pointer; }

.loading-state { text-align: center; padding: 60px 20px; color: #64748b; font-size: 1.1rem; }

.revenue-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.revenue-card { background: white; padding: 24px; border-radius: 12px; }
.revenue-card.main { background: linear-gradient(135deg, #1e293b, #334155); color: white; }
.revenue-label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 8px; }
.revenue-card.main .revenue-label { color: rgba(255,255,255,0.7); }
.revenue-value { display: block; font-size: 2rem; font-weight: 700; }
.revenue-trend { display: block; font-size: 0.8rem; margin-top: 8px; }
.revenue-trend.up { color: #10b981; }
.revenue-card.main .revenue-trend { color: rgba(255,255,255,0.7); }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
.chart-card { background: white; padding: 24px; border-radius: 12px; }
.chart-card h3 { margin: 0 0 20px 0; font-size: 1rem; }

.status-chart { display: flex; flex-direction: column; gap: 12px; }
.status-item { display: flex; flex-direction: column; gap: 4px; }
.status-bar { height: 24px; border-radius: 4px; min-width: 20px; transition: width 0.3s; }
.status-info { display: flex; justify-content: space-between; font-size: 0.85rem; }
.status-name { color: #64748b; }
.status-count { font-weight: 600; }

.products-ranking { display: flex; flex-direction: column; gap: 16px; }
.ranking-item { display: grid; grid-template-columns: 30px 1fr 80px; gap: 12px; align-items: center; }
.rank { font-weight: 700; color: #D4775C; }
.product-name { font-weight: 500; }
.product-count { font-size: 0.85rem; color: #64748b; text-align: right; }
.progress-bar { grid-column: 1 / -1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
.progress { height: 100%; background: linear-gradient(90deg, #D4775C, #E8956F); border-radius: 3px; transition: width 0.3s; }
.empty-chart { text-align: center; padding: 30px; color: #64748b; }
.empty-chart span { font-size: 2rem; display: block; margin-bottom: 8px; }

.funnel-section { background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
.funnel-section h3 { margin: 0 0 24px 0; }
.funnel { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.funnel-step { width: var(--width); background: linear-gradient(90deg, #D4775C, #E8956F); padding: 16px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; color: white; transition: width 0.3s; }
.step-value { font-size: 1.5rem; font-weight: 700; }
.step-label { font-size: 0.9rem; }

.client-stats-section { background: white; padding: 24px; border-radius: 12px; }
.client-stats-section h3 { margin: 0 0 20px 0; }
.client-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.client-stat { text-align: center; padding: 20px; background: #f8fafc; border-radius: 10px; }
.client-stat .stat-icon { font-size: 1.5rem; display: block; margin-bottom: 8px; }
.client-stat .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.client-stat .stat-label { font-size: 0.8rem; color: #64748b; }

@media (max-width: 1200px) {
  .revenue-grid { grid-template-columns: 1fr 1fr; }
  .charts-grid { grid-template-columns: 1fr; }
  .client-stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .revenue-grid { grid-template-columns: 1fr; }
  .client-stats-grid { grid-template-columns: 1fr 1fr; }
}
</style>
