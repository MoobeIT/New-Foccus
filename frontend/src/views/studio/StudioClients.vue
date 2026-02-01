<template>
  <div class="clients-page">
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
        <router-link to="/studio/projects" class="nav-item">
          <span class="nav-icon">📁</span>
          <span>Projetos</span>
        </router-link>
        <router-link to="/studio/clients" class="nav-item active">
          <span class="nav-icon">👥</span>
          <span>Clientes</span>
          <span class="nav-badge" v-if="clients.length">{{ clients.length }}</span>
        </router-link>
        <router-link to="/studio/orders" class="nav-item">
          <span class="nav-icon">📦</span>
          <span>Pedidos</span>
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
          <h1>Meus Clientes</h1>
          <span class="count">{{ clients.length }} clientes</span>
        </div>
        <div class="top-right">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input v-model="searchQuery" type="text" placeholder="Buscar clientes..." />
          </div>
          <button class="btn-new" @click="showModal = true">
            + Novo Cliente
          </button>
        </div>
      </header>

      <!-- Clients Grid -->
      <div class="clients-grid">
        <div v-for="client in filteredClients" :key="client.id" class="client-card">
          <div class="card-header">
            <div class="avatar">{{ getInitials(client.name) }}</div>
            <div class="info">
              <h3>{{ client.name }}</h3>
              <p>{{ client.email }}</p>
            </div>
          </div>
          <div class="card-stats">
            <div class="stat">
              <span class="num">{{ client.projectsCount }}</span>
              <span class="label">Projetos</span>
            </div>
            <div class="stat">
              <span class="num">{{ client.ordersCount }}</span>
              <span class="label">Pedidos</span>
            </div>
          </div>
          <div class="card-actions">
            <button @click="viewProjects(client.id)">📁 Projetos</button>
            <button @click="viewOrders(client)">📦 Pedidos</button>
            <button @click="editClient(client)">✏️ Editar</button>
            <button class="danger" @click="deleteClient(client.id)">🗑️</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredClients.length === 0" class="empty-state">
        <span class="empty-icon">👥</span>
        <h3>Nenhum cliente encontrado</h3>
        <p>Adicione seu primeiro cliente</p>
        <button class="btn-new" @click="showModal = true">+ Novo Cliente</button>
      </div>
    </main>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingClient ? 'Editar Cliente' : 'Novo Cliente' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nome *</label>
            <input v-model="form.name" type="text" placeholder="Nome do cliente" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input v-model="form.email" type="email" placeholder="email@exemplo.com" />
          </div>
          <div class="form-group">
            <label>Telefone</label>
            <input v-model="form.phone" type="text" placeholder="(00) 00000-0000" />
          </div>
          <div class="form-group">
            <label>Observações</label>
            <textarea v-model="form.notes" placeholder="Notas sobre o cliente..." rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeModal">Cancelar</button>
          <button class="btn-save" @click="saveClient">Salvar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Pedidos -->
    <div v-if="showOrdersModal" class="modal-overlay" @click.self="closeOrdersModal">
      <div class="modal orders-modal">
        <div class="modal-header">
          <h3>📦 Pedidos de {{ selectedClient?.name }}</h3>
          <button class="close-btn" @click="closeOrdersModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="clientOrders.length === 0" class="empty-orders">
            <span class="empty-icon">📦</span>
            <p>Nenhum pedido encontrado para este cliente</p>
          </div>
          <div v-else class="orders-list">
            <div v-for="order in clientOrders" :key="order.id" class="order-item">
              <div class="order-header">
                <span class="order-id">#{{ order.id }}</span>
                <span class="order-status" :class="order.status">{{ getOrderStatusLabel(order.status) }}</span>
              </div>
              <div class="order-details">
                <div class="order-product">
                  <span class="product-name">{{ order.productName }}</span>
                  <span class="product-pages">{{ order.pages }} páginas</span>
                </div>
                <div class="order-info">
                  <span class="order-date">📅 {{ formatDate(order.createdAt) }}</span>
                  <span class="order-total">💰 R$ {{ formatPrice(order.total) }}</span>
                </div>
              </div>
              <div v-if="order.trackingCode" class="order-tracking">
                <span>🚚 Rastreio: {{ order.trackingCode }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeOrdersModal">Fechar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const searchQuery = ref('')
const showModal = ref(false)
const showOrdersModal = ref(false)
const editingClient = ref<any>(null)
const selectedClient = ref<any>(null)
const clientOrders = ref<any[]>([])

const form = reactive({
  name: '',
  email: '',
  phone: '',
  notes: ''
})

const clients = ref([
  { id: '1', name: 'Marina Silva', email: 'marina@email.com', phone: '(11) 99999-1111', notes: '', projectsCount: 3, ordersCount: 2 },
  { id: '2', name: 'João Santos', email: 'joao@email.com', phone: '(11) 99999-2222', notes: 'Cliente VIP', projectsCount: 5, ordersCount: 4 },
  { id: '3', name: 'Ana Costa', email: 'ana@email.com', phone: '', notes: '', projectsCount: 1, ordersCount: 0 }
])

// Dados de pedidos de exemplo (em produção viriam do backend)
const allOrders = ref([
  { id: '1001', clientId: '1', productName: 'Álbum de Casamento', pages: 40, status: 'delivered', total: 599.90, createdAt: '2025-01-10', trackingCode: 'BR123456789' },
  { id: '1002', clientId: '1', productName: 'Fotolivro 30x30', pages: 20, status: 'production', total: 299.90, createdAt: '2025-01-15', trackingCode: '' },
  { id: '1003', clientId: '2', productName: 'Álbum Premium', pages: 60, status: 'delivered', total: 899.90, createdAt: '2024-12-20', trackingCode: 'BR987654321' },
  { id: '1004', clientId: '2', productName: 'Fotolivro Batizado', pages: 30, status: 'delivered', total: 399.90, createdAt: '2024-11-15', trackingCode: 'BR456789123' },
  { id: '1005', clientId: '2', productName: 'Álbum de Casamento', pages: 50, status: 'shipped', total: 699.90, createdAt: '2025-01-05', trackingCode: 'BR111222333' },
  { id: '1006', clientId: '2', productName: 'Fotolivro 20x20', pages: 20, status: 'pending', total: 199.90, createdAt: '2025-01-18', trackingCode: '' }
])

const filteredClients = computed(() => {
  if (!searchQuery.value) return clients.value
  const q = searchQuery.value.toLowerCase()
  return clients.value.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
})

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

const editClient = (client: any) => {
  editingClient.value = client
  form.name = client.name
  form.email = client.email
  form.phone = client.phone || ''
  form.notes = client.notes || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingClient.value = null
  form.name = ''
  form.email = ''
  form.phone = ''
  form.notes = ''
}

const saveClient = () => {
  if (!form.name || !form.email) return
  
  if (editingClient.value) {
    const idx = clients.value.findIndex(c => c.id === editingClient.value.id)
    if (idx >= 0) {
      clients.value[idx] = { ...clients.value[idx], ...form }
    }
  } else {
    clients.value.push({
      id: Date.now().toString(),
      name: form.name,
      email: form.email,
      phone: form.phone,
      notes: form.notes,
      projectsCount: 0,
      ordersCount: 0
    })
  }
  closeModal()
}

const viewProjects = (clientId: string) => {
  router.push(`/studio/projects?client=${clientId}`)
}

const viewOrders = (client: any) => {
  selectedClient.value = client
  clientOrders.value = allOrders.value.filter(o => o.clientId === client.id)
  showOrdersModal.value = true
}

const closeOrdersModal = () => {
  showOrdersModal.value = false
  selectedClient.value = null
  clientOrders.value = []
}

const getOrderStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    production: 'Em Produção',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  }
  return labels[status] || status
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}

const formatPrice = (price: number) => {
  return (price || 0).toFixed(2).replace('.', ',')
}

const deleteClient = (clientId: string) => {
  if (confirm('Excluir este cliente?')) {
    clients.value = clients.value.filter(c => c.id !== clientId)
  }
}
</script>

<style scoped>
.clients-page {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
}

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
}

.nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
.nav-item.active { background: rgba(212,119,92,0.2); color: #D4775C; }

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

.main-content {
  flex: 1;
  margin-left: 240px;
  padding: 24px 32px;
}

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

.count {
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
  width: 250px;
}

.search-box input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 14px;
}

.btn-new {
  padding: 12px 20px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-new:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(212,119,92,0.4);
}

.clients-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.client-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.avatar {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

.info h3 {
  margin: 0 0 4px;
  font-size: 16px;
  color: #1a1a2e;
}

.info p {
  margin: 0;
  font-size: 13px;
  color: #6c757d;
}

.card-stats {
  display: flex;
  gap: 20px;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.stat {
  text-align: center;
}

.stat .num {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
}

.stat .label {
  font-size: 12px;
  color: #9e9e9e;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-actions button {
  flex: 1;
  padding: 8px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
}

.card-actions button:hover { background: #e0e0e0; }
.card-actions button.danger:hover { background: #ffebee; color: #d32f2f; }

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 60px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #1a1a2e;
}

.empty-state p {
  color: #6c757d;
  margin-bottom: 20px;
}

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
  background: #fff;
  border-radius: 16px;
  width: 450px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: #f5f5f5;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
}

.form-group input, .form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus, .form-group textarea:focus {
  outline: none;
  border-color: #D4775C;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel {
  padding: 10px 20px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
}

.btn-save {
  padding: 10px 20px;
  background: linear-gradient(135deg, #D4775C, #c56a50);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; padding: 16px; }
  .clients-grid { grid-template-columns: 1fr; }
}

/* Modal de Pedidos */
.orders-modal {
  width: 550px;
  max-width: 95vw;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.order-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e0e0e0;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.order-id {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 14px;
}

.order-status {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.order-status.pending { background: #fff3e0; color: #e65100; }
.order-status.paid { background: #e3f2fd; color: #1565c0; }
.order-status.production { background: #f3e5f5; color: #7b1fa2; }
.order-status.shipped { background: #e8f5e9; color: #2e7d32; }
.order-status.delivered { background: #e8f5e9; color: #1b5e20; }
.order-status.cancelled { background: #ffebee; color: #c62828; }

.order-details {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.order-product {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: 500;
  color: #1a1a2e;
  font-size: 14px;
}

.product-pages {
  font-size: 12px;
  color: #6c757d;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;
}

.order-date {
  font-size: 12px;
  color: #6c757d;
}

.order-total {
  font-weight: 600;
  color: #2e7d32;
  font-size: 14px;
}

.order-tracking {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e0e0e0;
  font-size: 12px;
  color: #6c757d;
}

.empty-orders {
  text-align: center;
  padding: 40px 20px;
}

.empty-orders .empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.empty-orders p {
  color: #6c757d;
  margin: 0;
}
</style>
