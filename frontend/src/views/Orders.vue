<template>
  <div class="orders-page">
    <div class="orders-container">
      <header class="orders-header">
        <div class="header-left">
          <router-link to="/" class="back-link">← Voltar</router-link>
          <h1>Meus Pedidos</h1>
        </div>
        <div class="orders-filters">
          <select v-model="statusFilter" class="filter-select">
            <option value="">Todos os status</option>
            <option value="pending">Aguardando pagamento</option>
            <option value="paid">Pago</option>
            <option value="production">Em produção</option>
            <option value="shipped">Enviado</option>
            <option value="delivered">Entregue</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Carregando pedidos...</p>
      </div>

      <div v-else-if="orders.length === 0" class="empty-state">
        <div class="empty-icon">📦</div>
        <h2>Nenhum pedido encontrado</h2>
        <p>Você ainda não fez nenhum pedido.</p>
        <button class="btn-primary" @click="goToProducts">
          Ver produtos
        </button>
      </div>

      <div v-else class="orders-list">
        <div v-for="order in filteredOrders" :key="order.id" class="order-card">
          <div class="order-header">
            <div class="order-info">
              <span class="order-number">Pedido #{{ order.orderNumber }}</span>
              <span class="order-date">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="order-status" :class="`status--${order.status}`">
              {{ getStatusLabel(order.status) }}
            </div>
          </div>

          <div class="order-items">
            <div v-for="item in order.items.slice(0, 2)" :key="item.id" class="order-item">
              <div class="item-image">
                <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" :alt="item.productName" />
                <div v-else class="item-placeholder">📷</div>
              </div>
              <div class="item-details">
                <span class="item-name">{{ item.productName }}</span>
                <span class="item-quantity">Qtd: {{ item.quantity }}</span>
              </div>
            </div>
            <div v-if="order.items.length > 2" class="more-items">
              +{{ order.items.length - 2 }} item(s)
            </div>
          </div>

          <div class="order-footer">
            <div class="order-total">
              <span>Total:</span>
              <span class="total-value">R$ {{ order.total.toFixed(2) }}</span>
            </div>
            <div class="order-actions">
              <button 
                v-if="order.shippingData?.trackingCode" 
                class="btn-track"
                @click="showTracking(order)"
              >
                🚚 Rastrear
              </button>
              <button class="btn-details" @click="viewOrder(order)">
                Ver detalhes
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Order Details Modal -->
      <div v-if="selectedOrder" class="modal-overlay" @click.self="selectedOrder = null">
        <div class="modal-content order-details-modal">
          <button class="modal-close" @click="selectedOrder = null">×</button>
          
          <h2>Pedido #{{ selectedOrder.orderNumber }}</h2>
          
          <div class="order-timeline">
            <div 
              v-for="event in selectedOrder.timeline" 
              :key="event.id"
              class="timeline-event"
              :class="{ 'timeline-event--current': event.status === selectedOrder.status }"
            >
              <div class="event-dot" />
              <div class="event-content">
                <span class="event-title">{{ event.title }}</span>
                <span class="event-date">{{ formatDateTime(event.timestamp) }}</span>
              </div>
            </div>
          </div>

          <div class="order-details-section">
            <h3>Itens do Pedido</h3>
            <div v-for="item in selectedOrder.items" :key="item.id" class="detail-item">
              <span>{{ item.productName }} x{{ item.quantity }}</span>
              <span>R$ {{ item.totalPrice.toFixed(2) }}</span>
            </div>
          </div>

          <div class="order-details-section">
            <h3>Endereço de Entrega</h3>
            <p>{{ formatAddress(selectedOrder.shippingAddress) }}</p>
          </div>

          <div v-if="selectedOrder.shippingData?.trackingCode" class="order-details-section">
            <h3>Rastreamento</h3>
            <div class="tracking-info">
              <p>
                <strong>Código:</strong> 
                <code>{{ selectedOrder.shippingData.trackingCode }}</code>
                <button class="btn-copy" @click="copyTrackingCode(selectedOrder.shippingData.trackingCode)">
                  {{ copiedCode ? '✓' : '📋' }}
                </button>
              </p>
              <p><strong>Transportadora:</strong> {{ selectedOrder.shippingData.carrier }}</p>
              <a 
                :href="getTrackingUrl(selectedOrder.shippingData.carrier, selectedOrder.shippingData.trackingCode)" 
                target="_blank" 
                class="btn-track-external"
              >
                🔗 Rastrear no site da transportadora
              </a>
            </div>
          </div>

          <div class="order-details-footer">
            <div class="detail-row">
              <span>Subtotal</span>
              <span>R$ {{ selectedOrder.subtotal.toFixed(2) }}</span>
            </div>
            <div v-if="selectedOrder.discounts > 0" class="detail-row discount">
              <span>Descontos</span>
              <span>- R$ {{ selectedOrder.discounts.toFixed(2) }}</span>
            </div>
            <div class="detail-row">
              <span>Frete</span>
              <span>R$ {{ selectedOrder.shipping.toFixed(2) }}</span>
            </div>
            <div class="detail-row total">
              <span>Total</span>
              <span>R$ {{ selectedOrder.total.toFixed(2) }}</span>
            </div>
          </div>

          <div class="modal-actions">
            <button 
              v-if="selectedOrder.canCancel" 
              class="btn-cancel"
              @click="cancelOrder(selectedOrder)"
            >
              Cancelar pedido
            </button>
            <button 
              v-if="selectedOrder.canReorder" 
              class="btn-reorder"
              @click="reorder(selectedOrder)"
            >
              Pedir novamente
            </button>
          </div>
        </div>
      </div>

      <!-- Tracking Modal -->
      <div v-if="trackingOrder" class="modal-overlay" @click.self="trackingOrder = null">
        <div class="modal-content tracking-modal">
          <button class="modal-close" @click="trackingOrder = null">×</button>
          <OrderTracking
            :order-id="trackingOrder.id"
            :order-number="trackingOrder.orderNumber"
            :status="trackingOrder.status"
            :tracking-code="trackingOrder.shippingData?.trackingCode"
            :carrier="trackingOrder.shippingData?.carrier"
            :estimated-delivery="trackingOrder.shippingData?.estimatedDelivery"
            :events="trackingOrder.shippingData?.trackingEvents"
            @refresh="refreshTracking"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import OrderTracking from '@/components/orders/OrderTracking.vue';
import { orderNotificationsService } from '@/services/orderNotifications';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

interface TrackingEvent {
  id: string;
  status: string;
  description: string;
  location?: string;
  timestamp: Date;
}

interface TimelineEvent {
  id: string;
  title: string;
  timestamp: Date;
  status: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  subtotal: number;
  discounts: number;
  shipping: number;
  total: number;
  createdAt: Date;
  trackingCode?: string;
  shippingAddress?: any;
  shippingData?: {
    trackingCode: string;
    carrier: string;
    estimatedDelivery?: Date;
    trackingEvents?: TrackingEvent[];
  };
  timeline?: TimelineEvent[];
  canCancel?: boolean;
  canReorder?: boolean;
}

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const orders = ref<Order[]>([]);
const statusFilter = ref('');
const selectedOrder = ref<Order | null>(null);
const trackingOrder = ref<Order | null>(null);
const copiedCode = ref(false);

const filteredOrders = computed(() => {
  if (!statusFilter.value) return orders.value;
  return orders.value.filter(o => o.status === statusFilter.value);
});

onMounted(async () => {
  await loadOrders();
  
  // Se tiver orderId na rota, abrir detalhes
  if (route.params.orderId) {
    const order = orders.value.find(o => o.id === route.params.orderId);
    if (order) {
      selectedOrder.value = order;
    }
  }
});

const loadOrders = async () => {
  loading.value = true;
  try {
    // TODO: Call API to load orders
    // const response = await ordersService.listOrders();
    // orders.value = response.orders;
    
    // Mock data
    orders.value = [
      {
        id: 'order-1',
        orderNumber: 'PED-ABC123',
        status: 'shipped',
        paymentStatus: 'paid',
        items: [
          { id: '1', productName: 'Fotolivro Premium 20x20', quantity: 1, totalPrice: 149.90 },
        ],
        subtotal: 149.90,
        discounts: 0,
        shipping: 15.90,
        total: 165.80,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        trackingCode: 'BR123456789',
        shippingAddress: {
          street: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          cep: '01234-567',
        },
        shippingData: {
          trackingCode: 'BR123456789BR',
          carrier: 'correios',
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          trackingEvents: [
            { id: '1', status: 'shipped', description: 'Objeto postado', location: 'São Paulo - SP', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { id: '2', status: 'in_transit', description: 'Objeto em trânsito - por favor aguarde', location: 'Campinas - SP', timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000) },
          ],
        },
        timeline: [
          { id: '1', title: 'Pedido criado', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: 'pending' },
          { id: '2', title: 'Pagamento confirmado', timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), status: 'paid' },
          { id: '3', title: 'Em produção', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), status: 'production' },
          { id: '4', title: 'Enviado', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'shipped' },
        ],
        canCancel: false,
        canReorder: true,
      },
      {
        id: 'order-2',
        orderNumber: 'PED-DEF456',
        status: 'production',
        paymentStatus: 'paid',
        items: [
          { id: '1', productName: 'Álbum Casamento 30x30', quantity: 1, totalPrice: 299.90 },
          { id: '2', productName: 'Estojo Premium', quantity: 1, totalPrice: 89.90 },
        ],
        subtotal: 389.80,
        discounts: 20,
        shipping: 0,
        total: 369.80,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        shippingAddress: {
          street: 'Av. Brasil',
          number: '456',
          neighborhood: 'Jardins',
          city: 'São Paulo',
          state: 'SP',
          cep: '04567-890',
        },
        timeline: [
          { id: '1', title: 'Pedido criado', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'pending' },
          { id: '2', title: 'Pagamento confirmado', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'paid' },
          { id: '3', title: 'Em produção', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'production' },
        ],
        canCancel: false,
        canReorder: false,
      },
    ];
  } catch (error) {
    console.error('Error loading orders:', error);
  } finally {
    loading.value = false;
  }
};

const getStatusLabel = (status: string): string => {
  return orderNotificationsService.getStatusLabel(status);
};

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

const formatDateTime = (date: Date): string => {
  return new Date(date).toLocaleString('pt-BR');
};

const formatAddress = (address: any): string => {
  if (!address?.street) return 'Não informado';
  return `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.cep}`;
};

const getTrackingUrl = (carrier: string, trackingCode: string): string => {
  const urls: Record<string, string> = {
    correios: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
    sedex: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
    pac: `https://www.linkcorreios.com.br/?id=${trackingCode}`,
    jadlog: `https://www.jadlog.com.br/jadlog/tracking?cte=${trackingCode}`,
  };
  return urls[carrier?.toLowerCase()] || `https://www.google.com/search?q=${trackingCode}+rastreamento`;
};

const copyTrackingCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    copiedCode.value = true;
    setTimeout(() => copiedCode.value = false, 2000);
  } catch (error) {
    console.error('Erro ao copiar:', error);
  }
};

const viewOrder = (order: Order) => {
  selectedOrder.value = order;
};

const showTracking = (order: Order) => {
  trackingOrder.value = order;
};

const refreshTracking = async () => {
  // TODO: Refresh tracking from API
  console.log('Refreshing tracking...');
};

const cancelOrder = async (order: Order) => {
  if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;
  
  try {
    // TODO: Call API to cancel order
    console.log('Cancelling order:', order.id);
    await loadOrders();
    selectedOrder.value = null;
  } catch (error) {
    console.error('Error cancelling order:', error);
  }
};

const reorder = async (order: Order) => {
  try {
    // TODO: Add items to cart and redirect
    console.log('Reordering:', order.id);
    router.push('/cart');
  } catch (error) {
    console.error('Error reordering:', error);
  }
};

const goToProducts = () => {
  router.push('/products');
};
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 2rem 1rem;
}

.orders-container {
  max-width: 900px;
  margin: 0 auto;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.orders-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 8px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.order-card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.order-number {
  font-weight: 600;
  color: #1f2937;
}

.order-date {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
}

.order-status {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status--pending { background: #fef3c7; color: #92400e; }
.status--paid { background: #dbeafe; color: #1e40af; }
.status--production { background: #e0e7ff; color: #3730a3; }
.status--shipped { background: #d1fae5; color: #065f46; }
.status--delivered { background: #d1fae5; color: #065f46; }
.status--completed { background: #d1fae5; color: #065f46; }
.status--cancelled { background: #fee2e2; color: #991b1b; }

.order-items {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.order-item {
  display: flex;
  gap: 0.75rem;
}

.item-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
}

.item-quantity {
  font-size: 0.75rem;
  color: #6b7280;
}

.more-items {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #6b7280;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-total span:first-child {
  color: #6b7280;
  font-size: 0.875rem;
}

.total-value {
  font-weight: 600;
  font-size: 1.125rem;
  color: #1f2937;
  margin-left: 0.5rem;
}

.order-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-track,
.btn-details {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-track {
  background: #f3f4f6;
  color: #374151;
}

.btn-details {
  background: #3b82f6;
  color: white;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

.order-details-modal h2 {
  margin-bottom: 1.5rem;
}

.order-timeline {
  margin-bottom: 1.5rem;
}

.timeline-event {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 0;
  position: relative;
}

.timeline-event:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 30px;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.event-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e5e7eb;
  flex-shrink: 0;
  margin-top: 4px;
}

.timeline-event--current .event-dot {
  background: #3b82f6;
}

.event-title {
  display: block;
  font-weight: 500;
}

.event-date {
  font-size: 0.75rem;
  color: #6b7280;
}

.order-details-section {
  margin-bottom: 1.5rem;
}

.order-details-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.order-details-footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.875rem;
}

.detail-row.discount {
  color: #10b981;
}

.detail-row.total {
  font-weight: 600;
  font-size: 1rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-cancel,
.btn-reorder {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
}

.btn-cancel {
  background: #fee2e2;
  color: #991b1b;
}

.btn-reorder {
  background: #3b82f6;
  color: white;
}

/* Additional styles */
.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.back-link {
  font-size: 0.875rem;
  color: #6b7280;
  text-decoration: none;
}

.back-link:hover {
  color: #3b82f6;
}

.tracking-info {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 8px;
}

.tracking-info p {
  margin: 0 0 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tracking-info code {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  letter-spacing: 0.05em;
}

.btn-copy {
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-copy:hover {
  background: #f3f4f6;
}

.btn-track-external {
  display: inline-block;
  margin-top: 0.5rem;
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
}

.btn-track-external:hover {
  text-decoration: underline;
}

.tracking-modal {
  max-width: 480px;
}
</style>
