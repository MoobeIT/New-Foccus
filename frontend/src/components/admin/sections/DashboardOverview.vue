<template>
  <div class="dashboard-overview">
    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.id">
        <div class="stat-header">
          <div class="stat-icon" :class="stat.color">
            <component :is="stat.icon" />
          </div>
          <div class="stat-trend" :class="stat.trend.type">
            <svg v-if="stat.trend.type === 'up'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 01.5.5v3h3a.5.5 0 010 1h-3v3a.5.5 0 01-1 0v-3h-3a.5.5 0 010-1h3v-3A.5.5 0 018 4z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 8a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7A.5.5 0 014 8z"/>
            </svg>
            <span>{{ stat.trend.value }}</span>
          </div>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
      <!-- Quick Actions -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Ações Rápidas</h3>
          <p class="card-subtitle">Acesso rápido às principais funcionalidades</p>
        </div>
        <div class="quick-actions">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            class="quick-action-btn"
            @click="$emit('section-change', action.section)"
          >
            <div class="action-icon" :class="action.color">
              <component :is="action.icon" />
            </div>
            <div class="action-content">
              <span class="action-title">{{ action.title }}</span>
              <span class="action-description">{{ action.description }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Recent Orders -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Pedidos Recentes</h3>
          <button class="view-all-btn" @click="$emit('section-change', 'orders')">
            Ver todos
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06L7.28 12.78a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>
        <div class="orders-list">
          <div v-for="order in recentOrders" :key="order.id" class="order-item">
            <div class="order-info">
              <div class="order-id">#{{ order.id }}</div>
              <div class="order-customer">{{ order.customer }}</div>
              <div class="order-product">{{ order.product }}</div>
            </div>
            <div class="order-meta">
              <span class="badge" :class="getStatusClass(order.status)">
                {{ getStatusLabel(order.status) }}
              </span>
              <div class="order-value">R$ {{ order.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Production Queue -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Fila de Produção</h3>
          <button class="view-all-btn" @click="$emit('section-change', 'production')">
            Ver fila
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06L7.28 12.78a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>
        <div class="production-list">
          <div v-for="item in productionQueue" :key="item.id" class="production-item">
            <div class="production-info">
              <div class="production-order">Pedido #{{ item.orderId }}</div>
              <div class="production-product">{{ item.product }}</div>
              <div class="production-deadline">Prazo: {{ item.deadline }}</div>
            </div>
            <div class="production-priority">
              <span class="priority-badge" :class="item.priority">
                {{ getPriorityLabel(item.priority) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Atividade Recente</h3>
          <button class="view-all-btn">
            Ver histórico
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06L7.28 12.78a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
            </svg>
          </button>
        </div>
        <div class="activity-list">
          <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
            <div class="activity-icon" :class="activity.type">
              <component :is="activity.icon" />
            </div>
            <div class="activity-content">
              <div class="activity-text">{{ activity.text }}</div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Health -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Status do Sistema</h3>
          <span class="status-indicator healthy">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="6" r="6"/>
            </svg>
            Operacional
          </span>
        </div>
        <div class="system-metrics">
          <div class="metric">
            <div class="metric-label">API Response</div>
            <div class="metric-value good">45ms</div>
          </div>
          <div class="metric">
            <div class="metric-label">Database</div>
            <div class="metric-value good">12ms</div>
          </div>
          <div class="metric">
            <div class="metric-label">Storage</div>
            <div class="metric-value warning">78%</div>
          </div>
          <div class="metric">
            <div class="metric-label">Uptime</div>
            <div class="metric-value good">99.9%</div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="dashboard-card">
        <div class="card-header">
          <h3 class="card-title">Resumo Hoje</h3>
        </div>
        <div class="daily-stats">
          <div class="daily-stat">
            <div class="daily-stat-value">12</div>
            <div class="daily-stat-label">Novos Pedidos</div>
          </div>
          <div class="daily-stat">
            <div class="daily-stat-value">8</div>
            <div class="daily-stat-label">Concluídos</div>
          </div>
          <div class="daily-stat">
            <div class="daily-stat-value">R$ 2.450</div>
            <div class="daily-stat-label">Faturamento</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{
  'section-change': [section: string]
}>()

// Icons (simplified SVG components)
const DashboardIcon = { template: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/></svg>' }
const OrderIcon = { template: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>' }
const ProductIcon = { template: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>' }
const TemplateIcon = { template: '<svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4z"/></svg>' }

// Data
const stats = ref([
  {
    id: 'orders',
    label: 'Pedidos Totais',
    value: '127',
    color: 'blue',
    icon: OrderIcon,
    trend: { type: 'up', value: '+12%' }
  },
  {
    id: 'pending',
    label: 'Pendentes',
    value: '5',
    color: 'orange',
    icon: DashboardIcon,
    trend: { type: 'down', value: '-3%' }
  },
  {
    id: 'completed',
    label: 'Concluídos',
    value: '118',
    color: 'green',
    icon: ProductIcon,
    trend: { type: 'up', value: '+8%' }
  },
  {
    id: 'revenue',
    label: 'Receita Total',
    value: 'R$ 45.890',
    color: 'purple',
    icon: TemplateIcon,
    trend: { type: 'up', value: '+15%' }
  }
])

const quickActions = ref([
  {
    id: 'new-product',
    title: 'Novo Produto',
    description: 'Criar produto personalizado',
    icon: ProductIcon,
    color: 'blue',
    section: 'products'
  },
  {
    id: 'view-orders',
    title: 'Ver Pedidos',
    description: 'Gerenciar pedidos ativos',
    icon: OrderIcon,
    color: 'green',
    section: 'orders'
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Gerenciar templates',
    icon: TemplateIcon,
    color: 'purple',
    section: 'templates'
  },
  {
    id: 'simulator',
    title: 'Simulador',
    description: 'Calcular preços',
    icon: DashboardIcon,
    color: 'orange',
    section: 'price-simulator'
  }
])

const recentOrders = ref([
  { id: '1234', customer: 'João Silva', product: 'Álbum Casamento 30x30', status: 'pending', value: '389,90' },
  { id: '1233', customer: 'Maria Santos', product: 'Álbum Ensaio 25x25', status: 'processing', value: '245,00' },
  { id: '1232', customer: 'Pedro Costa', product: 'Álbum Newborn 20x20', status: 'completed', value: '189,00' },
  { id: '1231', customer: 'Ana Oliveira', product: 'Álbum 15 Anos Premium', status: 'completed', value: '459,00' }
])

const productionQueue = ref([
  { id: 1, orderId: '1234', product: 'Álbum Casamento 30x30', deadline: '02/01/2026', priority: 'high' },
  { id: 2, orderId: '1233', product: 'Álbum Ensaio 25x25', deadline: '03/01/2026', priority: 'medium' },
  { id: 3, orderId: '1228', product: 'Álbum Newborn 20x20', deadline: '05/01/2026', priority: 'low' }
])

const recentActivities = ref([
  { id: 1, icon: OrderIcon, text: 'Novo pedido #1234 recebido', time: 'há 5 min', type: 'order' },
  { id: 2, icon: ProductIcon, text: 'Pedido #1230 concluído', time: 'há 15 min', type: 'success' },
  { id: 3, icon: TemplateIcon, text: 'Novo template criado', time: 'há 1 hora', type: 'info' },
  { id: 4, icon: DashboardIcon, text: 'Pagamento confirmado #1229', time: 'há 3 horas', type: 'payment' }
])

// Methods
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Em Produção',
    completed: 'Concluído'
  }
  return labels[status] || status
}

const getStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    pending: 'badge-warning',
    processing: 'badge-primary',
    completed: 'badge-success'
  }
  return classes[status] || 'badge-gray'
}

const getPriorityLabel = (priority: string) => {
  const labels: Record<string, string> = {
    high: 'Alta',
    medium: 'Média',
    low: 'Baixa'
  }
  return labels[priority] || priority
}
</script>

<style scoped>
.dashboard-overview {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-6);
}

.stat-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  transition: all var(--transition-fast);
}

.stat-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon.blue { background: var(--primary-500); }
.stat-icon.green { background: var(--success-500); }
.stat-icon.orange { background: var(--warning-500); }
.stat-icon.purple { background: #8b5cf6; }

.stat-trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
}

.stat-trend.up {
  background: var(--success-100);
  color: var(--success-700);
}

.stat-trend.down {
  background: var(--error-100);
  color: var(--error-700);
}

.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin-bottom: var(--space-1);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--gray-600);
  font-weight: var(--font-medium);
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-6);
}

.dashboard-card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.card-header {
  padding: var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
  margin: 0;
}

.card-subtitle {
  font-size: var(--text-sm);
  color: var(--gray-600);
  margin: var(--space-1) 0 0 0;
}

.view-all-btn {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--primary-600);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: var(--font-medium);
  transition: color var(--transition-fast);
}

.view-all-btn:hover {
  color: var(--primary-700);
}

/* Quick Actions */
.quick-actions {
  padding: var(--space-6);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--gray-50);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-xl);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.quick-action-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-300);
  transform: translateY(-1px);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.action-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.action-description {
  font-size: var(--text-xs);
  color: var(--gray-600);
}

/* Lists */
.orders-list,
.production-list,
.activity-list {
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.order-item,
.production-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  background: var(--gray-50);
  border-radius: var(--radius-lg);
}

.order-info,
.production-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.order-id,
.production-order {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--primary-600);
}

.order-customer,
.production-product {
  font-size: var(--text-sm);
  color: var(--gray-900);
}

.order-product,
.production-deadline {
  font-size: var(--text-xs);
  color: var(--gray-600);
}

.order-meta,
.production-priority {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
}

.order-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--gray-900);
}

.priority-badge {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.priority-badge.high {
  background: var(--error-100);
  color: var(--error-700);
}

.priority-badge.medium {
  background: var(--warning-100);
  color: var(--warning-700);
}

.priority-badge.low {
  background: var(--success-100);
  color: var(--success-700);
}

/* Activity */
.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.activity-icon.order { background: var(--primary-500); }
.activity-icon.success { background: var(--success-500); }
.activity-icon.info { background: var(--info-500); }
.activity-icon.payment { background: var(--warning-500); }

.activity-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.activity-text {
  font-size: var(--text-sm);
  color: var(--gray-900);
}

.activity-time {
  font-size: var(--text-xs);
  color: var(--gray-600);
}

/* System Health */
.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.status-indicator.healthy {
  color: var(--success-600);
}

.system-metrics {
  padding: var(--space-6);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--gray-50);
  border-radius: var(--radius-lg);
}

.metric-label {
  font-size: var(--text-sm);
  color: var(--gray-600);
}

.metric-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.metric-value.good { color: var(--success-600); }
.metric-value.warning { color: var(--warning-600); }
.metric-value.error { color: var(--error-600); }

/* Daily Stats */
.daily-stats {
  padding: var(--space-6);
  display: flex;
  justify-content: space-around;
}

.daily-stat {
  text-align: center;
}

.daily-stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--gray-900);
  margin-bottom: var(--space-1);
}

.daily-stat-label {
  font-size: var(--text-xs);
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Responsive */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  
  .quick-actions {
    grid-template-columns: 1fr;
  }
  
  .system-metrics {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>