<template>
  <div class="studio-orders">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <router-link to="/studio" class="back-link">← Voltar</router-link>
        <h1>📦 Meus Pedidos</h1>
      </div>
    </header>

    <!-- Filters -->
    <div class="filters">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="🔍 Buscar pedidos..."
        class="search-input"
      />
      <select v-model="statusFilter" class="filter-select">
        <option value="">Todos os status</option>
        <option value="pending">Pendente</option>
        <option value="processing">Em Produção</option>
        <option value="shipped">Enviado</option>
        <option value="delivered">Entregue</option>
        <option value="cancelled">Cancelado</option>
      </select>
    </div>

    <!-- Orders List -->
    <div class="orders-list" v-if="filteredOrders.length > 0">
      <div 
        v-for="order in filteredOrders" 
        :key="order.id" 
        class="order-card"
      >
        <div class="order-header">
          <div class="order-number">
            <span class="label">Pedido</span>
            <span class="value">#{{ order.orderNumber }}</span>
          </div>
          <span :class="['status', order.status]">{{ getStatusLabel(order.status) }}</span>
        </div>
        
        <div class="order-content">
          <div class="order-info">
            <p class="client">👤 {{ order.clientName }}</p>
            <p class="project">📁 {{ order.projectName }}</p>
            <p class="product">📦 {{ order.productName }}</p>
          </div>
          <div class="order-details">
            <p class="date">📅 {{ formatDate(order.createdAt) }}</p>
            <p class="total">💰 R$ {{ order.total.toFixed(2) }}</p>
          </div>
        </div>

        <div class="order-timeline" v-if="order.timeline.length > 0">
          <div 
            v-for="(event, index) in order.timeline" 
            :key="index"
            :class="['timeline-item', { active: index === 0 }]"
          >
            <span class="timeline-dot"></span>
            <span class="timeline-text">{{ event.description }}</span>
            <span class="timeline-date">{{ formatDateTime(event.date) }}</span>
          </div>
        </div>

        <div class="order-actions">
          <button @click="viewOrderDetails(order.id)">👁️ Ver Detalhes</button>
          <button @click="trackOrder(order.id)" v-if="order.trackingCode">📍 Rastrear</button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="empty-icon">📦</span>
      <h3>Nenhum pedido encontrado</h3>
      <p v-if="searchQuery || statusFilter">Tente ajustar os filtros</p>
      <p v-else>Seus pedidos aparecerão aqui quando seus clientes aprovarem os projetos.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const searchQuery = ref('');
const statusFilter = ref('');

// Mock data - conectar com API
const orders = ref([
  {
    id: '1',
    orderNumber: '2024001',
    clientName: 'Marina Silva',
    projectName: 'Casamento Marina & Lucas',
    productName: 'Fotolivro Premium 30x30',
    status: 'processing',
    total: 459.90,
    trackingCode: null,
    createdAt: new Date(),
    timeline: [
      { description: 'Pedido em produção', date: new Date() },
      { description: 'Pagamento confirmado', date: new Date(Date.now() - 86400000) },
      { description: 'Pedido realizado', date: new Date(Date.now() - 172800000) }
    ]
  },
  {
    id: '2',
    orderNumber: '2024002',
    clientName: 'João Santos',
    projectName: 'Ensaio Família Santos',
    productName: 'Fotolivro Clássico 20x20',
    status: 'shipped',
    total: 289.90,
    trackingCode: 'BR123456789',
    createdAt: new Date(Date.now() - 604800000),
    timeline: [
      { description: 'Pedido enviado', date: new Date(Date.now() - 86400000) },
      { description: 'Produção finalizada', date: new Date(Date.now() - 259200000) },
      { description: 'Pedido em produção', date: new Date(Date.now() - 432000000) }
    ]
  },
  {
    id: '3',
    orderNumber: '2024003',
    clientName: 'Ana Costa',
    projectName: 'Aniversário 15 Anos - Julia',
    productName: 'Fotolivro Luxo 28x21',
    status: 'delivered',
    total: 599.90,
    trackingCode: 'BR987654321',
    createdAt: new Date(Date.now() - 1209600000),
    timeline: [
      { description: 'Pedido entregue', date: new Date(Date.now() - 172800000) },
      { description: 'Pedido enviado', date: new Date(Date.now() - 604800000) }
    ]
  }
]);

const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const matchesSearch = !searchQuery.value || 
      order.orderNumber.includes(searchQuery.value) ||
      order.clientName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      order.projectName.toLowerCase().includes(searchQuery.value.toLowerCase());
    
    const matchesStatus = !statusFilter.value || order.status === statusFilter.value;
    
    return matchesSearch && matchesStatus;
  });
});

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'pending': 'Pendente',
    'processing': 'Em Produção',
    'shipped': 'Enviado',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado'
  };
  return labels[status] || status;
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
};

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
};

const viewOrderDetails = (orderId: string) => {
  router.push(`/studio/orders/${orderId}`);
};

const trackOrder = (orderId: string) => {
  const order = orders.value.find(o => o.id === orderId);
  if (order?.trackingCode) {
    window.open(`https://www.correios.com.br/rastreamento/${order.trackingCode}`, '_blank');
  }
};
</script>

<style scoped>
.studio-orders {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 0 0 2rem 0;
}

.page-header {
  background: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  color: #666;
  text-decoration: none;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.filters {
  display: flex;
  gap: 1rem;
  padding: 0 2rem;
  margin-bottom: 1.5rem;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  min-width: 180px;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0 2rem;
}

.order-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #f0f0f0;
}

.order-number .label {
  color: #666;
  font-size: 0.85rem;
}

.order-number .value {
  font-weight: 700;
  font-size: 1.1rem;
  margin-left: 0.5rem;
}

.status {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
}

.status.pending { background: #fef3c7; color: #d97706; }
.status.processing { background: #dbeafe; color: #1d4ed8; }
.status.shipped { background: #e0e7ff; color: #4f46e5; }
.status.delivered { background: #d1fae5; color: #059669; }
.status.cancelled { background: #fee2e2; color: #dc2626; }

.order-content {
  display: flex;
  justify-content: space-between;
  padding: 1.5rem;
}

.order-info p, .order-details p {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
}

.order-info .client {
  font-weight: 500;
}

.order-details {
  text-align: right;
}

.order-details .total {
  font-weight: 700;
  font-size: 1.1rem;
  color: #059669;
}

.order-timeline {
  padding: 0 1.5rem 1rem;
  border-top: 1px solid #f0f0f0;
  margin-top: -0.5rem;
  padding-top: 1rem;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  font-size: 0.85rem;
  color: #666;
}

.timeline-item.active {
  color: #1a1a2e;
}

.timeline-dot {
  width: 8px;
  height: 8px;
  background: #d1d5db;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-item.active .timeline-dot {
  background: #4f46e5;
}

.timeline-text {
  flex: 1;
}

.timeline-date {
  color: #999;
  font-size: 0.8rem;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
}

.order-actions button {
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
}

.order-actions button:hover {
  background: #f5f5f5;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  color: #666;
}
</style>
