<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-brand">
        <router-link to="/" class="brand-logo">
          <span class="logo-icon">F</span>
          <span v-if="!sidebarCollapsed" class="logo-text">Foccus Admin</span>
        </router-link>
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed" :aria-label="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="sidebarCollapsed ? 'M9 18l6-6-6-6' : 'M15 18l-6-6 6-6'"/>
          </svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <span v-if="!sidebarCollapsed" class="nav-section-title">Principal</span>
          <button v-for="item in mainMenuItems" :key="item.id" :class="['nav-item', { active: activeSection === item.id }]" @click="activeSection = item.id" :title="sidebarCollapsed ? item.label : ''">
            <span class="nav-icon" v-html="item.icon"></span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
            <span v-if="item.badge && !sidebarCollapsed" class="nav-badge">{{ item.badge }}</span>
          </button>
        </div>

        <div class="nav-section">
          <span v-if="!sidebarCollapsed" class="nav-section-title">Catálogo</span>
          <button v-for="item in catalogMenuItems" :key="item.id" :class="['nav-item', { active: activeSection === item.id }]" @click="activeSection = item.id" :title="sidebarCollapsed ? item.label : ''">
            <span class="nav-icon" v-html="item.icon"></span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
          </button>
        </div>

        <div class="nav-section">
          <span v-if="!sidebarCollapsed" class="nav-section-title">Sistema</span>
          <button v-for="item in systemMenuItems" :key="item.id" :class="['nav-item', { active: activeSection === item.id }]" @click="activeSection = item.id" :title="sidebarCollapsed ? item.label : ''">
            <span class="nav-icon" v-html="item.icon"></span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
          </button>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-card" v-if="!sidebarCollapsed">
          <div class="user-avatar">{{ userInitials }}</div>
          <div class="user-info">
            <span class="user-name">{{ userName }}</span>
            <span class="user-role">Administrador</span>
          </div>
        </div>
        <button class="logout-btn" @click="logout" :title="sidebarCollapsed ? 'Sair' : ''">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          <span v-if="!sidebarCollapsed">Sair</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content" :class="{ expanded: sidebarCollapsed }">
      <header class="main-header">
        <div class="header-left">
          <h1 class="page-title">{{ currentTitle }}</h1>
          <nav class="breadcrumb"><span>Admin</span><span class="sep">/</span><span class="current">{{ currentTitle }}</span></nav>
        </div>
        <div class="header-right">
          <div class="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="text" placeholder="Buscar..." v-model="searchQuery" />
          </div>
          <button class="header-btn" @click="refreshData" title="Atualizar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
          <router-link to="/" class="header-btn" title="Ver Site">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </router-link>
        </div>
      </header>

      <div class="content-area">
        <!-- Dashboard -->
        <div v-if="activeSection === 'dashboard'" class="dashboard">
          <div class="stats-row">
            <div class="stat-card" v-for="stat in dashboardStats" :key="stat.label" :class="stat.color">
              <div class="stat-icon" v-html="stat.icon"></div>
              <div class="stat-content">
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
              <div class="stat-trend" :class="stat.trend > 0 ? 'up' : 'down'">{{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}%</div>
            </div>
          </div>

          <div class="dashboard-grid">
            <div class="card quick-actions">
              <h3>Ações Rápidas</h3>
              <div class="actions-grid">
                <button class="action-btn" @click="activeSection = 'products'"><span>📦</span>Novo Produto</button>
                <button class="action-btn" @click="activeSection = 'orders'"><span>📋</span>Ver Pedidos</button>
                <button class="action-btn" @click="activeSection = 'templates'"><span>🎨</span>Templates</button>
                <button class="action-btn" @click="activeSection = 'price-simulator'"><span>💰</span>Simulador</button>
              </div>
            </div>

            <div class="card activity">
              <div class="card-header"><h3>Atividade Recente</h3><button class="link-btn">Ver tudo</button></div>
              <div class="activity-list">
                <div v-for="a in recentActivities" :key="a.id" class="activity-item">
                  <div class="activity-icon" :class="a.type">{{ a.icon }}</div>
                  <div class="activity-content"><p>{{ a.text }}</p><span>{{ a.time }}</span></div>
                </div>
              </div>
            </div>

            <div class="card orders-preview">
              <div class="card-header"><h3>Últimos Pedidos</h3><button class="link-btn" @click="activeSection = 'orders'">Ver todos</button></div>
              <table class="mini-table">
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Valor</th></tr></thead>
                <tbody>
                  <tr v-for="o in recentOrders" :key="o.id">
                    <td class="order-id">#{{ o.id }}</td>
                    <td>{{ o.customer }}</td>
                    <td><span :class="['status', o.status]">{{ statusLabels[o.status] }}</span></td>
                    <td class="value">R$ {{ o.value }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Dynamic Sections -->
        <OrdersSection v-if="activeSection === 'orders'" />
        <ProductionSection v-if="activeSection === 'production'" />
        <ProductsCatalogManagement v-if="activeSection === 'products'" />
        <FormatsManagement v-if="activeSection === 'formats'" />
        <PapersManagement v-if="activeSection === 'papers'" />
        <CoverTypesManagement v-if="activeSection === 'covers'" />
        <ProductConfigurationManagement v-if="activeSection === 'product-config'" />
        <TemplatesManagement v-if="activeSection === 'templates'" />
        <LayoutsManagement v-if="activeSection === 'layouts'" />
        <PriceSimulator v-if="activeSection === 'price-simulator'" />
        <CouponsManagement v-if="activeSection === 'coupons'" />
        <UsersSection v-if="activeSection === 'users'" />
        <SettingsSection v-if="activeSection === 'settings'" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'

// Components
import ProductsCatalogManagement from '@/components/admin/ProductsCatalogManagement.vue'
import FormatsManagement from '@/components/admin/FormatsManagement.vue'
import PapersManagement from '@/components/admin/PapersManagement.vue'
import CoverTypesManagement from '@/components/admin/CoverTypesManagement.vue'
import ProductConfigurationManagement from '@/components/admin/ProductConfigurationManagement.vue'
import TemplatesManagement from '@/components/admin/TemplatesManagement.vue'
import LayoutsManagement from '@/components/admin/LayoutsManagement.vue'
import PriceSimulator from '@/components/admin/PriceSimulator.vue'
import CouponsManagement from '@/components/admin/CouponsManagement.vue'
import OrdersSection from '@/components/admin/sections/OrdersSection.vue'
import ProductionSection from '@/components/admin/sections/ProductionSection.vue'
import UsersSection from '@/components/admin/sections/UsersSection.vue'
import SettingsSection from '@/components/admin/sections/SettingsSection.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeSection = ref('dashboard')
const sidebarCollapsed = ref(false)
const searchQuery = ref('')
const loading = ref(false)

// SVG Icons
const icons = {
  dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  orders: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  production: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M5 20V8.2a1 1 0 0 1 .4-.8l6-4.5a1 1 0 0 1 1.2 0l6 4.5a1 1 0 0 1 .4.8V20"/></svg>',
  products: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  formats: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
  papers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  covers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  config: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  templates: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
  layouts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  simulator: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
}

const mainMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: icons.dashboard },
  { id: 'orders', label: 'Pedidos', icon: icons.orders, badge: '5' },
  { id: 'production', label: 'Produção', icon: icons.production, badge: '3' },
]

const catalogMenuItems = [
  { id: 'products', label: 'Produtos', icon: icons.products },
  { id: 'formats', label: 'Formatos', icon: icons.formats },
  { id: 'papers', label: 'Papéis', icon: icons.papers },
  { id: 'covers', label: 'Capas', icon: icons.covers },
  { id: 'product-config', label: 'Configuração', icon: icons.config },
  { id: 'templates', label: 'Templates', icon: icons.templates },
  { id: 'layouts', label: 'Layouts', icon: icons.layouts },
  { id: 'price-simulator', label: 'Simulador', icon: icons.simulator },
  { id: 'coupons', label: 'Cupons', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/><path d="M2 10h2M20 10h2M2 14h2M20 14h2"/></svg>' },
]

const systemMenuItems = [
  { id: 'users', label: 'Usuários', icon: icons.users },
  { id: 'settings', label: 'Configurações', icon: icons.settings },
]

const statusLabels: Record<string, string> = { pending: 'Pendente', processing: 'Produção', completed: 'Concluído', cancelled: 'Cancelado' }

const dashboardStats = ref([
  { label: 'Pedidos Totais', value: '127', icon: icons.orders, color: 'blue', trend: 12 },
  { label: 'Pendentes', value: '5', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', color: 'orange', trend: -3 },
  { label: 'Concluídos', value: '118', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', color: 'green', trend: 8 },
  { label: 'Receita', value: 'R$ 45.890', icon: icons.simulator, color: 'purple', trend: 15 },
])

const recentActivities = ref([
  { id: 1, icon: '📦', text: 'Novo pedido #1234 recebido', time: 'há 5 min', type: 'order' },
  { id: 2, icon: '✅', text: 'Pedido #1230 concluído', time: 'há 15 min', type: 'success' },
  { id: 3, icon: '🎨', text: 'Novo template criado', time: 'há 1 hora', type: 'info' },
  { id: 4, icon: '👤', text: 'Novo usuário cadastrado', time: 'há 2 horas', type: 'user' },
])

const recentOrders = ref([
  { id: '1234', customer: 'João Silva', status: 'pending', value: '389,90' },
  { id: '1233', customer: 'Maria Santos', status: 'processing', value: '245,00' },
  { id: '1232', customer: 'Pedro Costa', status: 'completed', value: '189,00' },
  { id: '1231', customer: 'Ana Oliveira', status: 'completed', value: '459,00' },
])

const userName = computed(() => authStore.userName || 'Admin')
const userInitials = computed(() => (authStore.userName || 'AD').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2))
const currentTitle = computed(() => [...mainMenuItems, ...catalogMenuItems, ...systemMenuItems].find(i => i.id === activeSection.value)?.label || 'Dashboard')

const refreshData = async () => {
  loading.value = true
  try {
    const res = await api.get('/api/v1/admin/dashboard/stats')
    if (res.data) {
      dashboardStats.value[0].value = res.data.totalOrders?.toString() || '0'
      dashboardStats.value[1].value = res.data.pendingOrders?.toString() || '0'
      dashboardStats.value[2].value = res.data.completedOrders?.toString() || '0'
      dashboardStats.value[3].value = `R$ ${res.data.totalRevenue || '0'}`
    }
  } catch (e) { console.error('Error fetching stats:', e) }
  finally { loading.value = false }
}

const logout = () => { authStore.logout(); router.push('/login') }

onMounted(() => { refreshData() })
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f8fafc; }

/* Sidebar */
.sidebar { width: 260px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); color: white; display: flex; flex-direction: column; position: fixed; height: 100vh; z-index: 100; transition: width 0.3s; }
.sidebar.collapsed { width: 72px; }
.sidebar-brand { padding: 20px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); }
.brand-logo { display: flex; align-items: center; gap: 12px; text-decoration: none; color: white; }
.logo-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #D4775C, #E8956F); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
.logo-text { font-size: 1.1rem; font-weight: 700; }
.collapse-btn { background: rgba(255,255,255,0.1); border: none; color: white; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.collapse-btn:hover { background: rgba(255,255,255,0.2); }

.sidebar-nav { flex: 1; padding: 16px 12px; overflow-y: auto; }
.nav-section { margin-bottom: 24px; }
.nav-section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.4); padding: 0 12px; margin-bottom: 8px; display: block; }
.nav-item { width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: none; background: transparent; color: rgba(255,255,255,0.7); border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; margin-bottom: 2px; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: #D4775C; color: white; }
.nav-icon { width: 20px; display: flex; align-items: center; justify-content: center; }
.nav-label { font-size: 0.85rem; font-weight: 500; }
.nav-badge { margin-left: auto; background: #ef4444; color: white; font-size: 0.65rem; padding: 2px 6px; border-radius: 8px; }

.sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.user-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 12px; }
.user-avatar { width: 36px; height: 36px; background: #D4775C; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px; }
.user-info { display: flex; flex-direction: column; }
.user-name { font-size: 0.85rem; font-weight: 600; }
.user-role { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
.logout-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border: none; background: rgba(239,68,68,0.15); color: #fca5a5; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.logout-btn:hover { background: rgba(239,68,68,0.25); }

/* Main Content */
.main-content { flex: 1; margin-left: 260px; transition: margin-left 0.3s; }
.main-content.expanded { margin-left: 72px; }

.main-header { background: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; }
.page-title { font-size: 1.4rem; font-weight: 700; color: #1e293b; margin: 0; }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #64748b; margin-top: 4px; }
.breadcrumb .sep { color: #cbd5e1; }
.breadcrumb .current { color: #D4775C; }
.header-right { display: flex; align-items: center; gap: 12px; }
.search-box { display: flex; align-items: center; background: #f1f5f9; border-radius: 8px; padding: 8px 14px; gap: 8px; }
.search-box svg { color: #94a3b8; }
.search-box input { border: none; background: transparent; outline: none; font-size: 0.85rem; width: 180px; color: #1e293b; }
.header-btn { width: 38px; height: 38px; border: none; background: #f1f5f9; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #64748b; text-decoration: none; transition: all 0.2s; }
.header-btn:hover { background: #e2e8f0; color: #1e293b; }

.content-area { padding: 24px; }

/* Dashboard */
.dashboard { display: flex; flex-direction: column; gap: 24px; }
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { background: white; border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative; overflow: hidden; }
.stat-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; }
.stat-card.blue::before { background: #3b82f6; }
.stat-card.orange::before { background: #f97316; }
.stat-card.green::before { background: #10b981; }
.stat-card.purple::before { background: #8b5cf6; }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.stat-card.blue .stat-icon { background: #dbeafe; color: #3b82f6; }
.stat-card.orange .stat-icon { background: #ffedd5; color: #f97316; }
.stat-card.green .stat-icon { background: #dcfce7; color: #10b981; }
.stat-card.purple .stat-icon { background: #ede9fe; color: #8b5cf6; }
.stat-content { flex: 1; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #1e293b; }
.stat-label { font-size: 0.8rem; color: #64748b; }
.stat-trend { font-size: 0.75rem; font-weight: 600; padding: 4px 8px; border-radius: 6px; }
.stat-trend.up { background: #dcfce7; color: #16a34a; }
.stat-trend.down { background: #fee2e2; color: #dc2626; }

.dashboard-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.card h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 16px 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-header h3 { margin: 0; }
.link-btn { background: none; border: none; color: #D4775C; font-size: 0.8rem; font-weight: 500; cursor: pointer; }
.link-btn:hover { text-decoration: underline; }

.quick-actions { grid-column: span 2; }
.actions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.action-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s; }
.action-btn:hover { background: #D4775C; color: white; border-color: #D4775C; }
.action-btn span:first-child { font-size: 1.5rem; }
.action-btn span:last-child { font-size: 0.85rem; font-weight: 500; }

.activity-list { display: flex; flex-direction: column; gap: 12px; }
.activity-item { display: flex; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; }
.activity-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.activity-icon.order { background: #dbeafe; }
.activity-icon.success { background: #dcfce7; }
.activity-icon.info { background: #fef3c7; }
.activity-icon.user { background: #ede9fe; }
.activity-content { flex: 1; }
.activity-content p { margin: 0; font-size: 0.85rem; color: #1e293b; }
.activity-content span { font-size: 0.75rem; color: #94a3b8; }

.mini-table { width: 100%; border-collapse: collapse; }
.mini-table th { text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
.mini-table td { padding: 12px; font-size: 0.85rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
.mini-table .order-id { font-weight: 600; color: #D4775C; }
.mini-table .value { font-weight: 600; }
.status { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 500; }
.status.pending { background: #fef3c7; color: #b45309; }
.status.processing { background: #dbeafe; color: #1d4ed8; }
.status.completed { background: #dcfce7; color: #16a34a; }
.status.cancelled { background: #fee2e2; color: #dc2626; }

@media (max-width: 1200px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .dashboard-grid { grid-template-columns: 1fr; }
  .quick-actions { grid-column: span 1; }
  .actions-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .sidebar { width: 72px; }
  .sidebar .logo-text, .sidebar .nav-label, .sidebar .nav-badge, .sidebar .user-card, .sidebar .logout-btn span:last-child, .sidebar .nav-section-title { display: none; }
  .main-content { margin-left: 72px; }
  .stats-row { grid-template-columns: 1fr; }
}
</style>
