<template>
  <div class="clients-page">
    <!-- Nav -->
    <nav class="nav">
      <div class="nav-inner">
        <router-link to="/" class="brand">
          <div class="brand-icon">F</div>
          <span>Foccus Álbuns</span>
        </router-link>
        <div class="nav-menu">
          <router-link to="/dashboard">Dashboard</router-link>
          <router-link to="/projects">Projetos</router-link>
          <router-link to="/orders">Pedidos</router-link>
          <router-link to="/clients" class="active">Clientes</router-link>
        </div>
        <div class="nav-actions">
          <NotificationBell />
          <router-link to="/cart" class="cart-btn">🛒</router-link>
        </div>
      </div>
    </nav>

    <div class="page-content">
      <!-- Header -->
      <header class="page-header">
        <div class="header-left">
          <h1>Clientes</h1>
          <p>Gerencie seus clientes e histórico de pedidos</p>
        </div>
        <button class="btn-primary" @click="showNewClientModal = true">
          + Novo Cliente
        </button>
      </header>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ clients.length }}</span>
          <span class="stat-label">Total de Clientes</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ activeClients }}</span>
          <span class="stat-label">Clientes Ativos</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">R$ {{ formatCurrency(totalRevenue) }}</span>
          <span class="stat-label">Receita Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ upcomingDates }}</span>
          <span class="stat-label">Datas Próximas</span>
        </div>
      </div>

      <!-- Filters -->
      <div class="filters-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar cliente..."
          />
        </div>
        <div class="filter-group">
          <select v-model="filterStatus">
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <select v-model="sortBy">
            <option value="name">Nome</option>
            <option value="recent">Mais recentes</option>
            <option value="orders">Mais pedidos</option>
            <option value="revenue">Maior receita</option>
          </select>
        </div>
      </div>

      <!-- Clients Grid -->
      <div class="clients-grid">
        <div 
          v-for="client in filteredClients" 
          :key="client.id" 
          class="client-card"
          @click="selectClient(client)"
        >
          <div class="client-header">
            <div class="client-avatar" :style="{ background: client.avatarColor }">
              {{ client.initials }}
            </div>
            <div class="client-info">
              <h3>{{ client.name }}</h3>
              <span class="client-email">{{ client.email }}</span>
            </div>
            <div class="client-status" :class="client.status">
              {{ client.status === 'active' ? 'Ativo' : 'Inativo' }}
            </div>
          </div>

          <div class="client-stats">
            <div class="client-stat">
              <span class="stat-num">{{ client.totalOrders }}</span>
              <span class="stat-text">Pedidos</span>
            </div>
            <div class="client-stat">
              <span class="stat-num">R$ {{ formatCurrency(client.totalSpent) }}</span>
              <span class="stat-text">Total gasto</span>
            </div>
            <div class="client-stat">
              <span class="stat-num">{{ formatDate(client.lastOrder) }}</span>
              <span class="stat-text">Último pedido</span>
            </div>
          </div>

          <div v-if="client.upcomingDate" class="client-reminder">
            <span class="reminder-icon">📅</span>
            <span>{{ client.upcomingDate.type }}: {{ formatFullDate(client.upcomingDate.date) }}</span>
          </div>

          <div class="client-actions">
            <button class="btn-action" @click.stop="sendMessage(client)">💬 Mensagem</button>
            <button class="btn-action" @click.stop="viewHistory(client)">📋 Histórico</button>
            <button class="btn-action primary" @click.stop="newProject(client)">+ Projeto</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredClients.length === 0" class="empty-state">
        <span class="empty-icon">👥</span>
        <h2>Nenhum cliente encontrado</h2>
        <p>Adicione seu primeiro cliente para começar</p>
        <button class="btn-primary" @click="showNewClientModal = true">
          + Adicionar Cliente
        </button>
      </div>
    </div>

    <!-- New Client Modal -->
    <div v-if="showNewClientModal" class="modal-overlay" @click.self="showNewClientModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Novo Cliente</h2>
          <button class="modal-close" @click="showNewClientModal = false">×</button>
        </div>

        <form @submit.prevent="saveClient" class="client-form">
          <div class="form-group">
            <label>Nome completo *</label>
            <input v-model="newClient.name" type="text" required placeholder="Ex: Maria Silva" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="newClient.email" type="email" required placeholder="email@exemplo.com" />
            </div>
            <div class="form-group">
              <label>Telefone</label>
              <input v-model="newClient.phone" type="tel" placeholder="(11) 99999-9999" />
            </div>
          </div>

          <div class="form-group">
            <label>Tipo de cliente</label>
            <select v-model="newClient.type">
              <option value="individual">Pessoa Física</option>
              <option value="business">Empresa</option>
            </select>
          </div>

          <div class="form-section">
            <h4>📅 Datas Importantes</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Aniversário</label>
                <input v-model="newClient.birthday" type="date" />
              </div>
              <div class="form-group">
                <label>Aniversário de Casamento</label>
                <input v-model="newClient.weddingAnniversary" type="date" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Observações</label>
            <textarea v-model="newClient.notes" rows="3" placeholder="Anotações sobre o cliente..."></textarea>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showNewClientModal = false">
              Cancelar
            </button>
            <button type="submit" class="btn-primary">
              Salvar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Client Detail Modal -->
    <div v-if="selectedClient" class="modal-overlay" @click.self="selectedClient = null">
      <div class="modal-content large">
        <div class="modal-header">
          <div class="client-detail-header">
            <div class="client-avatar large" :style="{ background: selectedClient.avatarColor }">
              {{ selectedClient.initials }}
            </div>
            <div>
              <h2>{{ selectedClient.name }}</h2>
              <span class="client-email">{{ selectedClient.email }}</span>
            </div>
          </div>
          <button class="modal-close" @click="selectedClient = null">×</button>
        </div>

        <div class="client-detail-content">
          <!-- Info -->
          <div class="detail-section">
            <h4>Informações</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Telefone</span>
                <span class="info-value">{{ selectedClient.phone || 'Não informado' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Cliente desde</span>
                <span class="info-value">{{ formatFullDate(selectedClient.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total de pedidos</span>
                <span class="info-value">{{ selectedClient.totalOrders }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Total gasto</span>
                <span class="info-value">R$ {{ formatCurrency(selectedClient.totalSpent) }}</span>
              </div>
            </div>
          </div>

          <!-- Dates -->
          <div class="detail-section">
            <h4>📅 Datas Importantes</h4>
            <div class="dates-grid">
              <div v-if="selectedClient.birthday" class="date-card">
                <span class="date-icon">🎂</span>
                <div>
                  <span class="date-type">Aniversário</span>
                  <span class="date-value">{{ formatFullDate(selectedClient.birthday) }}</span>
                </div>
              </div>
              <div v-if="selectedClient.weddingAnniversary" class="date-card">
                <span class="date-icon">💍</span>
                <div>
                  <span class="date-type">Aniversário de Casamento</span>
                  <span class="date-value">{{ formatFullDate(selectedClient.weddingAnniversary) }}</span>
                </div>
              </div>
              <button class="add-date-btn" @click="addDate">+ Adicionar data</button>
            </div>
          </div>

          <!-- Order History -->
          <div class="detail-section">
            <h4>Histórico de Pedidos</h4>
            <div class="orders-history">
              <div v-for="order in selectedClient.orders" :key="order.id" class="history-item">
                <div class="history-icon">📦</div>
                <div class="history-info">
                  <span class="history-product">{{ order.productName }}</span>
                  <span class="history-date">{{ formatFullDate(order.date) }}</span>
                </div>
                <div class="history-status" :class="`status--${order.status}`">
                  {{ getStatusLabel(order.status) }}
                </div>
                <div class="history-value">R$ {{ formatCurrency(order.total) }}</div>
              </div>
              <div v-if="!selectedClient.orders?.length" class="empty-history">
                Nenhum pedido ainda
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="detail-section">
            <h4>Observações</h4>
            <textarea 
              v-model="selectedClient.notes" 
              class="notes-textarea"
              placeholder="Adicione observações sobre este cliente..."
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="selectedClient = null">Fechar</button>
          <button class="btn-primary" @click="newProject(selectedClient)">+ Novo Projeto</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import NotificationBell from '@/components/common/NotificationBell.vue'

const router = useRouter()

const searchQuery = ref('')
const filterStatus = ref('')
const sortBy = ref('name')
const showNewClientModal = ref(false)
const selectedClient = ref<any>(null)

const newClient = ref({
  name: '',
  email: '',
  phone: '',
  type: 'individual',
  birthday: '',
  weddingAnniversary: '',
  notes: ''
})

const clients = ref([
  {
    id: '1',
    name: 'Maria Silva',
    email: 'maria@email.com',
    phone: '(11) 99999-1111',
    initials: 'MS',
    avatarColor: 'linear-gradient(135deg, #D4775C, #E8956F)',
    status: 'active',
    totalOrders: 5,
    totalSpent: 1450.00,
    lastOrder: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2024-03-15'),
    birthday: new Date('1990-05-20'),
    weddingAnniversary: new Date('2022-11-12'),
    upcomingDate: { type: 'Aniversário de Casamento', date: new Date('2025-11-12') },
    notes: 'Cliente VIP, sempre pede álbuns premium',
    orders: [
      { id: '1', productName: 'Álbum Casamento Premium', date: new Date('2024-11-20'), status: 'delivered', total: 459.90 },
      { id: '2', productName: 'Estojo Madeira Luxo', date: new Date('2024-09-10'), status: 'delivered', total: 189.90 }
    ]
  },
  {
    id: '2',
    name: 'João Santos',
    email: 'joao@email.com',
    phone: '(11) 99999-2222',
    initials: 'JS',
    avatarColor: 'linear-gradient(135deg, #7C9A92, #9BB5AE)',
    status: 'active',
    totalOrders: 3,
    totalSpent: 750.00,
    lastOrder: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2024-06-20'),
    birthday: new Date('1985-08-15'),
    notes: '',
    orders: [
      { id: '1', productName: 'Álbum Ensaio 25x25', date: new Date('2024-10-15'), status: 'delivered', total: 299.90 }
    ]
  },
  {
    id: '3',
    name: 'Ana Costa',
    email: 'ana@email.com',
    phone: '(11) 99999-3333',
    initials: 'AC',
    avatarColor: 'linear-gradient(135deg, #B8A398, #D4C4B5)',
    status: 'active',
    totalOrders: 2,
    totalSpent: 389.80,
    lastOrder: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2024-09-01'),
    upcomingDate: { type: 'Aniversário', date: new Date('2025-01-22') },
    notes: 'Fotógrafa parceira',
    orders: []
  }
])

const activeClients = computed(() => clients.value.filter(c => c.status === 'active').length)
const totalRevenue = computed(() => clients.value.reduce((sum, c) => sum + c.totalSpent, 0))
const upcomingDates = computed(() => clients.value.filter(c => c.upcomingDate).length)

const filteredClients = computed(() => {
  let result = [...clients.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.email.toLowerCase().includes(query)
    )
  }

  if (filterStatus.value) {
    result = result.filter(c => c.status === filterStatus.value)
  }

  switch (sortBy.value) {
    case 'recent':
      result.sort((a, b) => b.lastOrder.getTime() - a.lastOrder.getTime())
      break
    case 'orders':
      result.sort((a, b) => b.totalOrders - a.totalOrders)
      break
    case 'revenue':
      result.sort((a, b) => b.totalSpent - a.totalSpent)
      break
    default:
      result.sort((a, b) => a.name.localeCompare(b.name))
  }

  return result
})

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
const formatDate = (date: Date) => {
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 30) return `${diffDays} dias`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
const formatFullDate = (date: Date) => new Date(date).toLocaleDateString('pt-BR')

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    production: 'Produção',
    shipped: 'Enviado',
    delivered: 'Entregue'
  }
  return labels[status] || status
}

const selectClient = (client: any) => {
  selectedClient.value = { ...client }
}

const saveClient = () => {
  const initials = newClient.value.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'linear-gradient(135deg, #D4775C, #E8956F)',
    'linear-gradient(135deg, #7C9A92, #9BB5AE)',
    'linear-gradient(135deg, #B8A398, #D4C4B5)',
    'linear-gradient(135deg, #8B7355, #A68B5B)'
  ]

  clients.value.push({
    id: Date.now().toString(),
    ...newClient.value,
    initials,
    avatarColor: colors[Math.floor(Math.random() * colors.length)],
    status: 'active',
    totalOrders: 0,
    totalSpent: 0,
    lastOrder: new Date(),
    createdAt: new Date(),
    orders: []
  })

  showNewClientModal.value = false
  newClient.value = { name: '', email: '', phone: '', type: 'individual', birthday: '', weddingAnniversary: '', notes: '' }
}

const sendMessage = (client: any) => {
  window.open(`https://wa.me/55${client.phone?.replace(/\D/g, '')}`, '_blank')
}

const viewHistory = (client: any) => {
  selectedClient.value = client
}

const newProject = (client: any) => {
  router.push(`/editor?client=${client.id}`)
}

const addDate = () => {
  // TODO: Implement add date modal
}
</script>

<style scoped>
.clients-page {
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

.nav-menu a:hover { background: #F7F4EE; color: #2D2A26; }
.nav-menu a.active { background: #FEF3E2; color: #D4775C; }

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.cart-btn {
  font-size: 1.25rem;
  text-decoration: none;
}

/* Page Content */
.page-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #2D2A26;
  margin-bottom: 4px;
}

.page-header p {
  font-size: 15px;
  color: #6B6560;
}

.btn-primary {
  background: linear-gradient(135deg, #D4775C, #C96B50);
  color: #fff;
  border: none;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 119, 92, 0.3);
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-item {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #EBE7E0;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #2D2A26;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #6B6560;
}

/* Filters */
.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 10px;
  padding: 10px 16px;
  flex: 1;
  max-width: 400px;
}

.search-icon {
  font-size: 16px;
}

.search-box input {
  border: none;
  outline: none;
  font-size: 14px;
  width: 100%;
  background: transparent;
  color: #2D2A26;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-group select {
  padding: 10px 16px;
  border: 1px solid #EBE7E0;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  color: #2D2A26;
  cursor: pointer;
}

/* Clients Grid */
.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.client-card {
  background: #fff;
  border: 1px solid #EBE7E0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.client-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(45, 42, 38, 0.1);
  border-color: #D4D0C8;
}

.client-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.client-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

.client-avatar.large {
  width: 64px;
  height: 64px;
  font-size: 22px;
}

.client-info {
  flex: 1;
}

.client-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 2px;
}

.client-email {
  font-size: 13px;
  color: #6B6560;
}

.client-status {
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 500;
}

.client-status.active {
  background: #D1FAE5;
  color: #065F46;
}

.client-status.inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.client-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px 0;
  border-top: 1px solid #EBE7E0;
  border-bottom: 1px solid #EBE7E0;
  margin-bottom: 16px;
}

.client-stat {
  text-align: center;
}

.stat-num {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #2D2A26;
}

.stat-text {
  font-size: 12px;
  color: #6B6560;
}

.client-reminder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #FEF3E2;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #92400E;
}

.reminder-icon {
  font-size: 16px;
}

.client-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  flex: 1;
  padding: 10px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #6B6560;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #F7F4EE;
}

.btn-action.primary {
  background: #D4775C;
  border-color: #D4775C;
  color: #fff;
}

.btn-action.primary:hover {
  background: #C96B50;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 24px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 20px;
  color: #2D2A26;
  margin-bottom: 8px;
}

.empty-state p {
  color: #6B6560;
  margin-bottom: 24px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content.large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #EBE7E0;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2D2A26;
}

.modal-close {
  width: 36px;
  height: 36px;
  border: none;
  background: #F7F4EE;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  color: #6B6560;
}

.client-detail-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Form */
.client-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #EBE7E0;
  border-radius: 10px;
  font-size: 14px;
  color: #2D2A26;
  background: #fff;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #D4775C;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-section {
  margin: 24px 0;
  padding-top: 24px;
  border-top: 1px solid #EBE7E0;
}

.form-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 16px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid #EBE7E0;
}

.btn-secondary {
  padding: 12px 24px;
  border: 1px solid #EBE7E0;
  background: #fff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: #6B6560;
  cursor: pointer;
}

/* Detail Content */
.client-detail-content {
  padding: 24px;
}

.detail-section {
  margin-bottom: 28px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  background: #FDFBF7;
  padding: 14px;
  border-radius: 10px;
}

.info-label {
  display: block;
  font-size: 12px;
  color: #6B6560;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.dates-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.date-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #FDFBF7;
  padding: 14px 18px;
  border-radius: 10px;
}

.date-icon {
  font-size: 24px;
}

.date-type {
  display: block;
  font-size: 12px;
  color: #6B6560;
}

.date-value {
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.add-date-btn {
  padding: 14px 18px;
  border: 2px dashed #EBE7E0;
  background: transparent;
  border-radius: 10px;
  font-size: 13px;
  color: #6B6560;
  cursor: pointer;
}

.add-date-btn:hover {
  border-color: #D4775C;
  color: #D4775C;
}

.orders-history {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: #FDFBF7;
  border-radius: 10px;
}

.history-icon {
  font-size: 20px;
}

.history-info {
  flex: 1;
}

.history-product {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #2D2A26;
}

.history-date {
  font-size: 12px;
  color: #6B6560;
}

.history-status {
  padding: 4px 10px;
  border-radius: 50px;
  font-size: 11px;
  font-weight: 500;
}

.status--pending { background: #FEF3C7; color: #92400E; }
.status--production { background: #E0E7FF; color: #3730A3; }
.status--shipped { background: #D1FAE5; color: #065F46; }
.status--delivered { background: #D1FAE5; color: #065F46; }

.history-value {
  font-size: 14px;
  font-weight: 600;
  color: #2D2A26;
}

.empty-history {
  text-align: center;
  padding: 24px;
  color: #6B6560;
  font-size: 14px;
}

.notes-textarea {
  width: 100%;
  padding: 14px;
  border: 1px solid #EBE7E0;
  border-radius: 10px;
  font-size: 14px;
  color: #2D2A26;
  resize: vertical;
  min-height: 100px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px 24px;
  border-top: 1px solid #EBE7E0;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .clients-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .nav-menu {
    display: none;
  }

  .filters-bar {
    flex-direction: column;
  }

  .search-box {
    max-width: 100%;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select {
    flex: 1;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
