<template>
  <div class="admin-orders">
    <header class="page-header">
      <div class="header-content">
        <h1>Gerenciar Pedidos</h1>
        <p class="subtitle">Visualize e gerencie todos os pedidos</p>
      </div>
      <div class="header-actions">
        <button class="btn-export" @click="exportOrders">
          📥 Exportar
        </button>
      </div>
    </header>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon pending">📋</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.pending }}</span>
          <span class="stat-label">Aguardando</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon production">🏭</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.production }}</span>
          <span class="stat-label">Em Produção</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon shipped">🚚</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.shipped }}</span>
          <span class="stat-label">Enviados</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon revenue">💰</div>
        <div class="stat-info">
          <span class="stat-value">R$ {{ stats.revenue.toFixed(2) }}</span>
          <span class="stat-label">Receita Total</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar por número do pedido ou cliente..."
          @input="debouncedSearch"
        />
      </div>
      <div class="filter-group">
        <select v-model="statusFilter" @change="loadOrders">
          <option value="">Todos os status</option>
          <option value="pending">Aguardando pagamento</option>
          <option value="paid">Pago</option>
          <option value="production">Em produção</option>
          <option value="ready_to_ship">Pronto para envio</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregue</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <input
          v-model="dateFrom"
          type="date"
          @change="loadOrders"
        />
        <input
          v-model="dateTo"
          type="date"
          @change="loadOrders"
        />
      </div>
    </div>

    <!-- Orders Table -->
    <div class="orders-table-container">
      <table class="orders-table">
        <thead>
          <tr>
            <th>Pedido</th>
            <th>Cliente</th>
            <th>Data</th>
            <th>Status</th>
            <th>Pagamento</th>
            <th>Total</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="loading-cell">
              <div class="spinner" />
              Carregando...
            </td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="7" class="empty-cell">
              Nenhum pedido encontrado
            </td>
          </tr>
          <tr v-for="order in orders" :key="order.id" @click="selectOrder(order)">
            <td class="order-number">
              <strong>#{{ order.orderNumber }}</strong>
              <span class="item-count">{{ order.items?.length || 0 }} itens</span>
            </td>
            <td class="customer-cell">
              <span class="customer-name">{{ order.customer?.name }}</span>
              <span class="customer-email">{{ order.customer?.email }}</span>
            </td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>
              <span class="status-badge" :class="`status--${order.status}`">
                {{ getStatusLabel(order.status) }}
              </span>
            </td>
            <td>
              <span class="payment-badge" :class="`payment--${order.paymentStatus}`">
                {{ getPaymentLabel(order.paymentStatus) }}
              </span>
            </td>
            <td class="total-cell">R$ {{ order.total?.toFixed(2) }}</td>
            <td class="actions-cell" @click.stop>
              <button class="btn-action" @click="viewOrder(order)" title="Ver detalhes">
                👁️
              </button>
              <button 
                v-if="canUpdateStatus(order)" 
                class="btn-action" 
                @click="openStatusModal(order)"
                title="Atualizar status"
              >
                ✏️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        ← Anterior
      </button>
      <span class="page-info">
        Página {{ currentPage }} de {{ totalPages }}
      </span>
      <button 
        class="page-btn"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        Próxima →
      </button>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="modal-overlay" @click.self="selectedOrder = null">
      <div class="modal-content order-modal">
        <button class="modal-close" @click="selectedOrder = null">×</button>
        
        <h2>Pedido #{{ selectedOrder.orderNumber }}</h2>
        
        <div class="order-detail-grid">
          <div class="detail-section">
            <h3>Cliente</h3>
            <p><strong>{{ selectedOrder.customer?.name }}</strong></p>
            <p>{{ selectedOrder.customer?.email }}</p>
            <p>{{ selectedOrder.customer?.phone }}</p>
          </div>
          
          <div class="detail-section">
            <h3>Endereço de Entrega</h3>
            <p>{{ formatAddress(selectedOrder.shippingAddress) }}</p>
          </div>
        </div>

        <div class="detail-section">
          <h3>Itens do Pedido</h3>
          <div class="order-items-list">
            <div v-for="item in selectedOrder.items" :key="item.id" class="order-item-row">
              <span class="item-name">{{ item.productName }}</span>
              <span class="item-qty">x{{ item.quantity }}</span>
              <span class="item-price">R$ {{ item.totalPrice?.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div class="order-totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>R$ {{ selectedOrder.subtotal?.toFixed(2) }}</span>
          </div>
          <div v-if="selectedOrder.discounts > 0" class="total-row discount">
            <span>Descontos</span>
            <span>- R$ {{ selectedOrder.discounts?.toFixed(2) }}</span>
          </div>
          <div class="total-row">
            <span>Frete</span>
            <span>R$ {{ selectedOrder.shipping?.toFixed(2) }}</span>
          </div>
          <div class="total-row final">
            <span>Total</span>
            <span>R$ {{ selectedOrder.total?.toFixed(2) }}</span>
          </div>
        </div>

        <div class="modal-actions">
          <button 
            v-if="canStartProduction(selectedOrder)"
            class="btn-production"
            @click="startProduction(selectedOrder)"
          >
            🏭 Iniciar Produção
          </button>
          <button 
            v-if="canAddTracking(selectedOrder)"
            class="btn-tracking"
            @click="openTrackingModal(selectedOrder)"
          >
            🚚 Adicionar Rastreio
          </button>
        </div>
      </div>
    </div>

    <!-- Status Update Modal -->
    <div v-if="statusModalOrder" class="modal-overlay" @click.self="statusModalOrder = null">
      <div class="modal-content status-modal">
        <h3>Atualizar Status</h3>
        <p>Pedido #{{ statusModalOrder.orderNumber }}</p>
        
        <select v-model="newStatus" class="status-select">
          <option value="paid">Pago</option>
          <option value="production">Em Produção</option>
          <option value="ready_to_ship">Pronto para Envio</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregue</option>
          <option value="completed">Concluído</option>
        </select>

        <textarea 
          v-model="statusNotes"
          placeholder="Observações (opcional)"
          rows="3"
        />

        <div class="modal-buttons">
          <button class="btn-cancel" @click="statusModalOrder = null">Cancelar</button>
          <button class="btn-confirm" @click="updateOrderStatus">Atualizar</button>
        </div>
      </div>
    </div>

    <!-- Tracking Modal -->
    <div v-if="trackingModalOrder" class="modal-overlay" @click.self="trackingModalOrder = null">
      <div class="modal-content tracking-modal">
        <h3>Adicionar Rastreio</h3>
        <p>Pedido #{{ trackingModalOrder.orderNumber }}</p>
        
        <div class="form-group">
          <label>Transportadora</label>
          <select v-model="trackingData.carrier">
            <option value="correios">Correios</option>
            <option value="jadlog">Jadlog</option>
            <option value="sedex">Sedex</option>
            <option value="other">Outra</option>
          </select>
        </div>

        <div class="form-group">
          <label>Código de Rastreio</label>
          <input v-model="trackingData.trackingCode" type="text" placeholder="Ex: BR123456789" />
        </div>

        <div class="form-group">
          <label>Previsão de Entrega</label>
          <input v-model="trackingData.estimatedDelivery" type="date" />
        </div>

        <div class="modal-buttons">
          <button class="btn-cancel" @click="trackingModalOrder = null">Cancelar</button>
          <button class="btn-confirm" @click="addTracking">Adicionar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  customer: { name: string; email: string; phone?: string };
  shippingAddress: any;
  items: any[];
  subtotal: number;
  discounts: number;
  shipping: number;
  total: number;
  createdAt: Date;
}

const notificationStore = useNotificationStore();

const loading = ref(false);
const orders = ref<Order[]>([]);
const selectedOrder = ref<Order | null>(null);
const statusModalOrder = ref<Order | null>(null);
const trackingModalOrder = ref<Order | null>(null);

const searchQuery = ref('');
const statusFilter = ref('');
const dateFrom = ref('');
const dateTo = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const pageSize = 20;

const newStatus = ref('');
const statusNotes = ref('');
const trackingData = reactive({
  carrier: 'correios',
  trackingCode: '',
  estimatedDelivery: '',
});

const stats = reactive({
  pending: 5,
  production: 12,
  shipped: 8,
  revenue: 15890.50,
});

onMounted(() => {
  loadOrders();
});

const loadOrders = async () => {
  loading.value = true;
  try {
    // TODO: Call API
    // Mock data
    orders.value = [
      {
        id: '1',
        orderNumber: 'PED-ABC123',
        status: 'production',
        paymentStatus: 'paid',
        customer: { name: 'João Silva', email: 'joao@email.com', phone: '(11) 99999-9999' },
        shippingAddress: { street: 'Rua das Flores', number: '123', city: 'São Paulo', state: 'SP', cep: '01234-567' },
        items: [{ id: '1', productName: 'Fotolivro Premium', quantity: 1, totalPrice: 149.90 }],
        subtotal: 149.90,
        discounts: 0,
        shipping: 15.90,
        total: 165.80,
        createdAt: new Date(),
      },
      {
        id: '2',
        orderNumber: 'PED-DEF456',
        status: 'pending',
        paymentStatus: 'pending',
        customer: { name: 'Maria Santos', email: 'maria@email.com' },
        shippingAddress: { street: 'Av. Brasil', number: '456', city: 'Rio de Janeiro', state: 'RJ', cep: '20000-000' },
        items: [
          { id: '1', productName: 'Calendário', quantity: 2, totalPrice: 79.80 },
          { id: '2', productName: 'Caneca', quantity: 1, totalPrice: 39.90 },
        ],
        subtotal: 119.70,
        discounts: 10,
        shipping: 12.90,
        total: 122.60,
        createdAt: new Date(Date.now() - 86400000),
      },
    ];
    totalPages.value = 1;
  } catch (error) {
    notificationStore.error('Erro ao carregar pedidos');
  } finally {
    loading.value = false;
  }
};

const debouncedSearch = () => {
  // Debounce search
  setTimeout(() => loadOrders(), 300);
};

const selectOrder = (order: Order) => {
  selectedOrder.value = order;
};

const viewOrder = (order: Order) => {
  selectedOrder.value = order;
};

const openStatusModal = (order: Order) => {
  statusModalOrder.value = order;
  newStatus.value = order.status;
  statusNotes.value = '';
};

const openTrackingModal = (order: Order) => {
  trackingModalOrder.value = order;
  trackingData.carrier = 'correios';
  trackingData.trackingCode = '';
  trackingData.estimatedDelivery = '';
};

const updateOrderStatus = async () => {
  if (!statusModalOrder.value) return;
  try {
    // TODO: Call API
    notificationStore.success('Status atualizado', `Pedido #${statusModalOrder.value.orderNumber}`);
    statusModalOrder.value = null;
    loadOrders();
  } catch (error) {
    notificationStore.error('Erro ao atualizar status');
  }
};

const startProduction = async (order: Order) => {
  try {
    // TODO: Call API
    notificationStore.success('Produção iniciada', `Pedido #${order.orderNumber}`);
    selectedOrder.value = null;
    loadOrders();
  } catch (error) {
    notificationStore.error('Erro ao iniciar produção');
  }
};

const addTracking = async () => {
  if (!trackingModalOrder.value || !trackingData.trackingCode) return;
  try {
    // TODO: Call API
    notificationStore.success('Rastreio adicionado', trackingData.trackingCode);
    trackingModalOrder.value = null;
    loadOrders();
  } catch (error) {
    notificationStore.error('Erro ao adicionar rastreio');
  }
};

const exportOrders = () => {
  notificationStore.info('Exportando pedidos...');
  // TODO: Implement export
};

const goToPage = (page: number) => {
  currentPage.value = page;
  loadOrders();
};

const canUpdateStatus = (order: Order) => !['completed', 'cancelled', 'refunded'].includes(order.status);
const canStartProduction = (order: Order) => order.status === 'paid' && order.paymentStatus === 'paid';
const canAddTracking = (order: Order) => order.status === 'ready_to_ship';

const formatDate = (date: Date) => new Date(date).toLocaleDateString('pt-BR');
const formatAddress = (addr: any) => addr ? `${addr.street}, ${addr.number}, ${addr.city} - ${addr.state}` : '';

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Aguardando', paid: 'Pago', production: 'Produção',
    ready_to_ship: 'Pronto', shipped: 'Enviado', delivered: 'Entregue',
    completed: 'Concluído', cancelled: 'Cancelado',
  };
  return labels[status] || status;
};

const getPaymentLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendente', processing: 'Processando', paid: 'Pago',
    failed: 'Falhou', refunded: 'Reembolsado',
  };
  return labels[status] || status;
};
</script>

<style scoped>
.admin-orders { padding: 2rem; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.page-header h1 { font-size: 1.75rem; font-weight: 600; margin: 0; }
.subtitle { color: #6b7280; margin: 0.25rem 0 0; }
.btn-export { padding: 0.5rem 1rem; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: white; border-radius: 8px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.stat-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.stat-icon.pending { background: #fef3c7; }
.stat-icon.production { background: #dbeafe; }
.stat-icon.shipped { background: #d1fae5; }
.stat-icon.revenue { background: #e0e7ff; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 600; }
.stat-label { font-size: 0.875rem; color: #6b7280; }

.filters-section { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 250px; }
.search-box input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
.filter-group { display: flex; gap: 0.5rem; }
.filter-group select, .filter-group input { padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }

.orders-table-container { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.orders-table { width: 100%; border-collapse: collapse; }
.orders-table th { background: #f9fafb; padding: 1rem; text-align: left; font-weight: 600; font-size: 0.875rem; color: #374151; border-bottom: 1px solid #e5e7eb; }
.orders-table td { padding: 1rem; border-bottom: 1px solid #e5e7eb; }
.orders-table tbody tr { cursor: pointer; transition: background 0.2s; }
.orders-table tbody tr:hover { background: #f9fafb; }

.order-number strong { display: block; }
.item-count { font-size: 0.75rem; color: #6b7280; }
.customer-cell { }
.customer-name { display: block; font-weight: 500; }
.customer-email { font-size: 0.75rem; color: #6b7280; }
.total-cell { font-weight: 600; }

.status-badge, .payment-badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
.status--pending, .payment--pending { background: #fef3c7; color: #92400e; }
.status--paid, .payment--paid { background: #d1fae5; color: #065f46; }
.status--production { background: #dbeafe; color: #1e40af; }
.status--ready_to_ship { background: #e0e7ff; color: #3730a3; }
.status--shipped { background: #d1fae5; color: #065f46; }
.status--delivered, .status--completed { background: #d1fae5; color: #065f46; }
.status--cancelled, .payment--failed { background: #fee2e2; color: #991b1b; }

.actions-cell { display: flex; gap: 0.5rem; }
.btn-action { background: none; border: none; cursor: pointer; padding: 0.25rem; font-size: 1rem; }

.loading-cell, .empty-cell { text-align: center; padding: 3rem !important; color: #6b7280; }
.spinner { width: 24px; height: 24px; border: 2px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; display: inline-block; margin-right: 0.5rem; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }

.pagination { display: flex; justify-content: center; align-items: center; gap: 1rem; margin-top: 1.5rem; }
.page-btn { padding: 0.5rem 1rem; background: white; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { color: #6b7280; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal-content { background: white; border-radius: 12px; padding: 2rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; }
.modal-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; }

.order-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
.detail-section h3 { font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem; }
.detail-section p { margin: 0.25rem 0; font-size: 0.875rem; }

.order-items-list { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.order-item-row { display: flex; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
.order-item-row:last-child { border-bottom: none; }
.item-name { flex: 1; }
.item-qty { color: #6b7280; margin: 0 1rem; }
.item-price { font-weight: 500; }

.order-totals { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; }
.total-row { display: flex; justify-content: space-between; padding: 0.25rem 0; }
.total-row.discount { color: #10b981; }
.total-row.final { font-weight: 600; font-size: 1.125rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; margin-top: 0.5rem; }

.modal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn-production, .btn-tracking { flex: 1; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-production { background: #3b82f6; color: white; }
.btn-tracking { background: #10b981; color: white; }

.status-modal, .tracking-modal { max-width: 400px; }
.status-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; margin: 1rem 0; }
textarea { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; resize: vertical; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; }
.form-group input, .form-group select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
.modal-buttons { display: flex; gap: 1rem; margin-top: 1.5rem; }
.btn-cancel, .btn-confirm { flex: 1; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer; }
.btn-cancel { background: #f3f4f6; color: #374151; }
.btn-confirm { background: #3b82f6; color: white; }

@media (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { 
  .stats-grid { grid-template-columns: 1fr; }
  .order-detail-grid { grid-template-columns: 1fr; }
  .orders-table { font-size: 0.875rem; }
}
</style>
