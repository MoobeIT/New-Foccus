<template>
  <div class="orders-section">
    <!-- Header -->
    <div class="section-header">
      <div class="header-left">
        <h2>📦 Gerenciamento de Pedidos</h2>
        <p>Acompanhe e gerencie todos os pedidos</p>
      </div>
      <div class="header-right">
        <select v-model="statusFilter" class="filter-select">
          <option value="">Todos os Status</option>
          <option value="pending">Pendentes</option>
          <option value="processing">Em Produção</option>
          <option value="shipped">Enviados</option>
          <option value="completed">Concluídos</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <button class="btn-secondary" @click="exportOrders">📥 Exportar</button>
        <button class="btn-primary" @click="fetchOrders">🔄 Atualizar</button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-icon">📋</span>
        <div class="stat-content">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
      <div class="stat-card warning">
        <span class="stat-icon">⏳</span>
        <div class="stat-content">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">Pendentes</span>
        </div>
      </div>
      <div class="stat-card info">
        <span class="stat-icon">🏭</span>
        <div class="stat-content">
          <span class="stat-value">{{ stats.processing }}</span>
          <span class="stat-label">Produção</span>
        </div>
      </div>
      <div class="stat-card success">
        <span class="stat-icon">✅</span>
        <div class="stat-content">
          <span class="stat-value">{{ stats.completed }}</span>
          <span class="stat-label">Concluídos</span>
        </div>
      </div>
      <div class="stat-card primary">
        <span class="stat-icon">💰</span>
        <div class="stat-content">
          <span class="stat-value">R$ {{ formatPrice(stats.revenue) }}</span>
          <span class="stat-label">Receita</span>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="content-area">
      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando pedidos...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredOrders.length === 0" class="empty-state">
        <span class="empty-icon">📦</span>
        <p>Nenhum pedido encontrado</p>
        <small>Os pedidos aparecerão aqui quando clientes finalizarem compras</small>
      </div>

      <!-- Orders Table -->
      <div v-else class="table-container">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Valor</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filteredOrders" :key="order.id">
              <td class="order-id">#{{ order.orderNumber || order.id.slice(0, 8) }}</td>
              <td>
                <div class="customer-info">
                  <span class="name">{{ order.customerName }}</span>
                  <span class="email">{{ order.customerEmail }}</span>
                </div>
              </td>
              <td>{{ order.productName }}</td>
              <td>
                <select 
                  class="status-select" 
                  :class="order.status"
                  :value="order.status"
                  @change="updateStatus(order, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="pending">⏳ Pendente</option>
                  <option value="processing">🏭 Produção</option>
                  <option value="shipped">🚚 Enviado</option>
                  <option value="completed">✅ Concluído</option>
                  <option value="cancelled">❌ Cancelado</option>
                </select>
              </td>
              <td>
                <span :class="['badge', 'payment-' + order.paymentStatus]">
                  {{ paymentLabels[order.paymentStatus] || order.paymentStatus }}
                </span>
              </td>
              <td class="value">R$ {{ formatPrice(order.total) }}</td>
              <td class="date">{{ formatDate(order.createdAt) }}</td>
              <td class="actions">
                <button @click="viewOrder(order)" title="Ver detalhes">👁️</button>
                <button @click="addTracking(order)" title="Rastreio">📦</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Detail Modal -->
    <div v-if="selectedOrder" class="modal-backdrop" @click.self="selectedOrder = null">
      <div class="modal-box">
        <div class="modal-header">
          <h3>📦 Pedido #{{ selectedOrder.orderNumber || selectedOrder.id.slice(0, 8) }}</h3>
          <button class="close-btn" @click="selectedOrder = null">×</button>
        </div>
        <div class="modal-body">
          <div class="info-group">
            <h4>👤 Cliente</h4>
            <p><strong>Nome:</strong> {{ selectedOrder.customerName }}</p>
            <p><strong>Email:</strong> {{ selectedOrder.customerEmail }}</p>
          </div>

          <div class="info-group">
            <h4>📦 Pedido</h4>
            <p><strong>Produto:</strong> {{ selectedOrder.productName }}</p>
            <p><strong>Quantidade:</strong> {{ selectedOrder.quantity }}</p>
            <p><strong>Status:</strong> <span :class="['badge', 'status-' + selectedOrder.status]">{{ statusLabels[selectedOrder.status] }}</span></p>
            <p><strong>Pagamento:</strong> <span :class="['badge', 'payment-' + selectedOrder.paymentStatus]">{{ paymentLabels[selectedOrder.paymentStatus] }}</span></p>
          </div>

          <div class="info-group">
            <h4>💰 Valores</h4>
            <p><strong>Subtotal:</strong> R$ {{ formatPrice(selectedOrder.subtotal || selectedOrder.total) }}</p>
            <p><strong>Frete:</strong> R$ {{ formatPrice(selectedOrder.shippingCost || 0) }}</p>
            <p><strong>Desconto:</strong> - R$ {{ formatPrice(selectedOrder.discount || 0) }}</p>
            <p class="total"><strong>Total:</strong> R$ {{ formatPrice(selectedOrder.total) }}</p>
          </div>

          <div v-if="selectedOrder.trackingCode" class="info-group">
            <h4>🚚 Rastreio</h4>
            <div class="tracking-box">
              <code>{{ selectedOrder.trackingCode }}</code>
              <button @click="copyTracking(selectedOrder.trackingCode)">📋</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="selectedOrder = null">Fechar</button>
          <button class="btn-primary" @click="addTracking(selectedOrder)">📦 Rastreio</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { api } from '@/services/api'

interface Order {
  id: string
  orderNumber?: string
  customerName: string
  customerEmail: string
  productName: string
  quantity: number
  status: string
  paymentStatus: string
  total: number
  subtotal?: number
  shippingCost?: number
  discount?: number
  trackingCode?: string
  createdAt: string
  updatedAt?: string
}

const orders = ref<Order[]>([])
const loading = ref(true)
const statusFilter = ref('')
const selectedOrder = ref<Order | null>(null)

const stats = reactive({
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  cancelled: 0,
  revenue: 0,
})

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Produção',
  shipped: 'Enviado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const paymentLabels: Record<string, string> = {
  pending: 'Aguardando',
  paid: 'Pago',
  failed: 'Falhou',
  refunded: 'Reembolsado',
}

const filteredOrders = computed(() => {
  if (!statusFilter.value) return orders.value
  return orders.value.filter(o => o.status === statusFilter.value)
})

const formatPrice = (value: number) => (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR')

const fetchOrders = async () => {
  loading.value = true
  try {
    const [ordersRes, statsRes] = await Promise.all([
      api.get('/api/v1/admin/orders'),
      api.get('/api/v1/admin/orders/stats'),
    ])
    
    orders.value = ordersRes.data?.data?.orders || ordersRes.data?.orders || []
    
    const statsData = statsRes.data?.data || statsRes.data || {}
    Object.assign(stats, {
      total: statsData.total || 0,
      pending: statsData.pending || 0,
      processing: statsData.processing || 0,
      completed: statsData.completed || 0,
      cancelled: statsData.cancelled || 0,
      revenue: statsData.revenue || 0,
    })
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const viewOrder = (order: Order) => { selectedOrder.value = order }

const updateStatus = async (order: Order, newStatus: string) => {
  if (order.status === newStatus) return
  try {
    await api.patch(`/api/v1/admin/orders/${order.id}/status`, { status: newStatus })
    order.status = newStatus
    fetchOrders()
  } catch (error) {
    alert('Erro ao atualizar status')
  }
}

const addTracking = async (order: Order) => {
  const trackingCode = prompt('Código de rastreio:', order.trackingCode || '')
  if (trackingCode === null) return
  try {
    await api.patch(`/api/v1/admin/orders/${order.id}/tracking`, { trackingCode })
    order.trackingCode = trackingCode
    order.status = 'shipped'
    alert('✅ Código de rastreio atualizado!')
  } catch (error) {
    alert('Erro ao atualizar rastreio')
  }
}

const copyTracking = (code: string) => {
  navigator.clipboard.writeText(code)
  alert(`📋 Copiado: ${code}`)
}

const exportOrders = () => {
  const headers = ['Pedido', 'Cliente', 'Email', 'Produto', 'Status', 'Pagamento', 'Valor', 'Data']
  const rows = orders.value.map(o => [
    o.orderNumber || o.id.slice(0, 8),
    o.customerName,
    o.customerEmail,
    o.productName,
    statusLabels[o.status] || o.status,
    paymentLabels[o.paymentStatus] || o.paymentStatus,
    formatPrice(o.total),
    formatDate(o.createdAt),
  ])
  const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pedidos-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

onMounted(fetchOrders)
</script>

<style scoped>
.orders-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #EBE7E0;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 1.25rem;
  color: #2D2A26;
}

.header-left p {
  margin: 0;
  font-size: 0.85rem;
  color: #6B6560;
}

.header-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 0.85rem;
  background: white;
}

.btn-primary, .btn-secondary {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #D4775C;
  color: white;
}

.btn-secondary {
  background: #F3F4F6;
  color: #374151;
}

/* Stats Row */
.stats-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 140px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #FAFAF8;
  border: 1px solid #EBE7E0;
  border-radius: 10px;
}

.stat-card.warning { border-left: 3px solid #F59E0B; }
.stat-card.info { border-left: 3px solid #3B82F6; }
.stat-card.success { border-left: 3px solid #22C55E; }
.stat-card.primary { border-left: 3px solid #D4775C; }

.stat-icon {
  font-size: 1.5rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2D2A26;
}

.stat-label {
  font-size: 0.75rem;
  color: #6B6560;
}

/* Content Area */
.content-area {
  background: white;
  border: 1px solid #EBE7E0;
  border-radius: 12px;
  overflow: hidden;
}

/* Loading & Empty */
.loading-state, .empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #6B6560;
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

@keyframes spin { to { transform: rotate(360deg); } }

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}

.empty-state small {
  display: block;
  margin-top: 8px;
  color: #9CA3AF;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6B6560;
  text-transform: uppercase;
  background: #F9FAFB;
  border-bottom: 1px solid #EBE7E0;
}

.orders-table td {
  padding: 12px 16px;
  font-size: 0.85rem;
  color: #2D2A26;
  border-bottom: 1px solid #F3F4F6;
}

.orders-table tr:hover {
  background: #FAFAF8;
}

.order-id {
  font-weight: 600;
  color: #D4775C;
}

.customer-info {
  display: flex;
  flex-direction: column;
}

.customer-info .name {
  font-weight: 500;
}

.customer-info .email {
  font-size: 0.75rem;
  color: #9CA3AF;
}

.value {
  font-weight: 600;
}

.date {
  color: #6B6560;
}

.status-select {
  padding: 6px 10px;
  border: 1px solid #E5E7EB;
  border-radius: 6px;
  font-size: 0.8rem;
  background: white;
  cursor: pointer;
}

.status-select.pending { border-color: #F59E0B; }
.status-select.processing { border-color: #3B82F6; }
.status-select.shipped { border-color: #8B5CF6; }
.status-select.completed { border-color: #22C55E; }
.status-select.cancelled { border-color: #EF4444; }

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.payment-pending { background: #FEF3C7; color: #B45309; }
.payment-paid { background: #DCFCE7; color: #16A34A; }
.payment-failed { background: #FEE2E2; color: #DC2626; }
.payment-refunded { background: #F3E8FF; color: #7C3AED; }

.status-pending { background: #FEF3C7; color: #B45309; }
.status-processing { background: #DBEAFE; color: #1D4ED8; }
.status-shipped { background: #E0E7FF; color: #4338CA; }
.status-completed { background: #DCFCE7; color: #16A34A; }
.status-cancelled { background: #FEE2E2; color: #DC2626; }

.actions {
  display: flex;
  gap: 6px;
}

.actions button {
  width: 32px;
  height: 32px;
  border: none;
  background: #F3F4F6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.actions button:hover {
  background: #E5E7EB;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #EBE7E0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #F3F4F6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
}

.modal-body {
  padding: 20px;
}

.info-group {
  margin-bottom: 20px;
}

.info-group h4 {
  margin: 0 0 10px 0;
  font-size: 0.9rem;
  color: #6B6560;
}

.info-group p {
  margin: 6px 0;
  font-size: 0.9rem;
}

.info-group .total {
  font-size: 1.1rem;
  color: #D4775C;
}

.tracking-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tracking-box code {
  flex: 1;
  padding: 10px;
  background: #F3F4F6;
  border-radius: 6px;
  font-family: monospace;
}

.tracking-box button {
  padding: 10px;
  border: none;
  background: #F3F4F6;
  border-radius: 6px;
  cursor: pointer;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #EBE7E0;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-row {
    flex-direction: column;
  }
  
  .stat-card {
    min-width: 100%;
  }
}
</style>
