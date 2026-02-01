<template>
  <div class="orders-section">
    <div class="section-header">
      <div class="header-left">
        <h2>📦 Meus Pedidos</h2>
        <p>{{ orders.length }} pedidos</p>
      </div>
      <div class="header-actions">
        <select v-model="filterStatus" class="filter-select" @change="loadOrders">
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="production">Em Produção</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregue</option>
        </select>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando pedidos...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="orders.length === 0" class="empty-state">
      <span>📦</span>
      <h3>Nenhum pedido encontrado</h3>
      <p>Seus pedidos aparecerão aqui</p>
    </div>

    <!-- Orders Table -->
    <div v-else class="orders-table">
      <div class="table-header">
        <span>Pedido</span>
        <span>Projeto</span>
        <span>Valor</span>
        <span>Status</span>
        <span>Ações</span>
      </div>
      <div v-for="order in orders" :key="order.id" class="table-row">
        <div class="order-id">
          <strong>#{{ order.id.slice(0, 8) }}</strong>
          <span>{{ formatDate(order.createdAt) }}</span>
        </div>
        <div class="order-project">
          <strong>{{ order.projectName || 'Projeto' }}</strong>
        </div>
        <div class="order-value">R$ {{ formatCurrency(order.total) }}</div>
        <div class="order-status">
          <span :class="['status-badge', order.status]">{{ getStatusLabel(order.status) }}</span>
          <div v-if="order.trackingCode" class="tracking">📍 {{ order.trackingCode }}</div>
        </div>
        <div class="order-actions">
          <button @click="viewOrder(order)" title="Ver detalhes">👁️</button>
          <button v-if="order.trackingCode" @click="trackOrder(order)" title="Rastrear">📍</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { studioService, type Order } from '@/services/studio'

const loading = ref(true)
const filterStatus = ref('')
const orders = ref<Order[]>([])

onMounted(() => {
  loadOrders()
})

const loadOrders = async () => {
  loading.value = true
  try {
    const filters = filterStatus.value ? { status: filterStatus.value } : undefined
    orders.value = await studioService.getOrders(filters)
  } catch (error) {
    console.error('Erro ao carregar pedidos:', error)
  } finally {
    loading.value = false
  }
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

const formatCurrency = (value: number) => {
  return (value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Pendente',
    'paid': 'Pago',
    'production': 'Em Produção',
    'shipped': 'Enviado',
    'delivered': 'Entregue'
  }
  return labels[status?.toLowerCase()] || status
}

const viewOrder = (order: Order) => {
  alert(`Detalhes do pedido #${order.id}`)
}

const trackOrder = (order: Order) => {
  if (order.trackingCode) {
    window.open(`https://rastreamento.correios.com.br/?objetos=${order.trackingCode}`, '_blank')
  }
}
</script>

<style scoped>
.section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.header-left h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
.header-left p { margin: 0; color: #64748b; }
.filter-select { padding: 10px 16px; border: 1px solid #e2e8f0; border-radius: 10px; background: white; }

.loading-state, .empty-state { text-align: center; padding: 60px 20px; color: #64748b; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #D4775C; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
@keyframes spin { to { transform: rotate(360deg); } }
.empty-state span { font-size: 4rem; display: block; margin-bottom: 16px; }
.empty-state h3 { margin: 0 0 8px 0; color: #1e293b; }

.orders-table { background: white; border-radius: 12px; overflow: hidden; }
.table-header { display: grid; grid-template-columns: 140px 1fr 120px 150px 100px; padding: 16px 20px; background: #f8fafc; font-weight: 600; font-size: 0.85rem; color: #64748b; }
.table-row { display: grid; grid-template-columns: 140px 1fr 120px 150px 100px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; align-items: center; }
.table-row:hover { background: #fafafa; }

.order-id strong { display: block; color: #D4775C; }
.order-id span { font-size: 0.8rem; color: #94a3b8; }
.order-project strong { display: block; }
.order-value { font-weight: 600; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
.status-badge.pending { background: #fef3c7; color: #b45309; }
.status-badge.paid { background: #dbeafe; color: #1d4ed8; }
.status-badge.production { background: #ede9fe; color: #7c3aed; }
.status-badge.shipped { background: #fef3c7; color: #b45309; }
.status-badge.delivered { background: #dcfce7; color: #16a34a; }
.tracking { font-size: 0.75rem; color: #64748b; margin-top: 4px; }

.order-actions { display: flex; gap: 8px; }
.order-actions button { padding: 8px; background: #f8fafc; border: none; border-radius: 6px; cursor: pointer; }
.order-actions button:hover { background: #e2e8f0; }
</style>
