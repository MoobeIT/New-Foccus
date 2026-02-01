<template>
  <div class="orders-management">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gerenciamento de Pedidos</h1>
        <p class="text-gray-600">Acompanhe e gerencie todos os pedidos</p>
      </div>
      <div class="flex space-x-3">
        <button 
          @click="exportOrders"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Exportar
        </button>
        <button 
          @click="refreshOrders"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Atualizar
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Pedidos Hoje"
        :value="stats.ordersToday"
        icon="shopping-bag"
        color="blue"
        :change="stats.ordersChange"
      />
      <StatsCard
        title="Receita Hoje"
        :value="formatCurrency(stats.revenueToday)"
        icon="currency-dollar"
        color="green"
        :change="stats.revenueChange"
      />
      <StatsCard
        title="Pendentes"
        :value="stats.pendingOrders"
        icon="clock"
        color="yellow"
      />
      <StatsCard
        title="Taxa de Conversão"
        :value="`${stats.conversionRate}%`"
        icon="chart-line"
        color="purple"
        :change="stats.conversionChange"
      />
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Buscar por ID, cliente ou produto..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        <select
          v-model="filters.status"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="processing">Processando</option>
          <option value="production">Em Produção</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          v-model="filters.period"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="today">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="all">Todos</option>
        </select>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pedido
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produtos
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="order in filteredOrders" :key="order.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">#{{ order.id }}</div>
                  <div class="text-sm text-gray-500">{{ order.paymentMethod }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ order.customer.name }}</div>
                  <div class="text-sm text-gray-500">{{ order.customer.email }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ order.items.length }} {{ order.items.length === 1 ? 'item' : 'itens' }}
                </div>
                <div class="text-sm text-gray-500">
                  {{ order.items.map(item => item.name).join(', ').substring(0, 30) }}...
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ formatCurrency(order.total) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusClasses(order.status)"
                >
                  {{ getStatusLabel(order.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(order.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button 
                    @click="viewOrder(order)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    Ver
                  </button>
                  <button 
                    @click="updateOrderStatus(order)"
                    class="text-green-600 hover:text-green-900"
                  >
                    Atualizar
                  </button>
                  <button 
                    v-if="order.status === 'pending'"
                    @click="cancelOrder(order.id)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Cancelar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-4xl max-h-screen overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">Detalhes do Pedido #{{ selectedOrder.id }}</h2>
          <button 
            @click="selectedOrder = null"
            class="text-gray-500 hover:text-gray-700"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Customer Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold mb-3">Informações do Cliente</h3>
            <div class="space-y-2 text-sm">
              <div><strong>Nome:</strong> {{ selectedOrder.customer.name }}</div>
              <div><strong>Email:</strong> {{ selectedOrder.customer.email }}</div>
              <div><strong>Telefone:</strong> {{ selectedOrder.customer.phone }}</div>
            </div>
          </div>

          <!-- Order Info -->
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold mb-3">Informações do Pedido</h3>
            <div class="space-y-2 text-sm">
              <div><strong>Status:</strong> 
                <span :class="getStatusClasses(selectedOrder.status)" class="ml-2 px-2 py-1 rounded-full text-xs">
                  {{ getStatusLabel(selectedOrder.status) }}
                </span>
              </div>
              <div><strong>Total:</strong> {{ formatCurrency(selectedOrder.total) }}</div>
              <div><strong>Pagamento:</strong> {{ selectedOrder.paymentMethod }}</div>
              <div><strong>Data:</strong> {{ formatDate(selectedOrder.createdAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Order Items -->
        <div class="mt-6">
          <h3 class="font-semibold mb-3">Itens do Pedido</h3>
          <div class="space-y-3">
            <div 
              v-for="item in selectedOrder.items" 
              :key="item.id"
              class="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div class="font-medium">{{ item.name }}</div>
                <div class="text-sm text-gray-500">Quantidade: {{ item.quantity }}</div>
              </div>
              <div class="text-right">
                <div class="font-medium">{{ formatCurrency(item.price * item.quantity) }}</div>
                <div class="text-sm text-gray-500">{{ formatCurrency(item.price) }} cada</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import StatsCard from './StatsCard.vue';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer: Customer;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'production' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  createdAt: Date;
}

const emit = defineEmits<{
  'order-updated': [];
}>();

// Estado
const orders = ref<Order[]>([]);
const selectedOrder = ref<Order | null>(null);
const filters = ref({
  search: '',
  status: '',
  period: 'all'
});

const stats = ref({
  ordersToday: 24,
  ordersChange: 12,
  revenueToday: 2450.80,
  revenueChange: 8,
  pendingOrders: 7,
  conversionRate: 3.2,
  conversionChange: -0.5
});

// Computed
const filteredOrders = computed(() => {
  return orders.value.filter(order => {
    const matchesSearch = !filters.value.search || 
      order.id.includes(filters.value.search) ||
      order.customer.name.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(filters.value.search.toLowerCase());
    
    const matchesStatus = !filters.value.status || order.status === filters.value.status;
    
    // Filtro de período (simplificado)
    let matchesPeriod = true;
    if (filters.value.period !== 'all') {
      const now = new Date();
      const orderDate = order.createdAt;
      
      switch (filters.value.period) {
        case 'today':
          matchesPeriod = orderDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesPeriod = orderDate >= weekAgo;
          break;
        case 'month':
          matchesPeriod = orderDate.getMonth() === now.getMonth() && 
                         orderDate.getFullYear() === now.getFullYear();
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });
});

// Methods
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusLabel = (status: Order['status']): string => {
  const labels = {
    pending: 'Pendente',
    processing: 'Processando',
    production: 'Em Produção',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado'
  };
  return labels[status];
};

const getStatusClasses = (status: Order['status']): string => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    production: 'bg-purple-100 text-purple-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return classes[status];
};

const viewOrder = (order: Order): void => {
  selectedOrder.value = order;
};

const updateOrderStatus = (order: Order): void => {
  // Implementar atualização de status
  console.log('Atualizando status do pedido:', order.id);
  emit('order-updated');
};

const cancelOrder = (orderId: string): void => {
  if (confirm('Tem certeza que deseja cancelar este pedido?')) {
    const order = orders.value.find(o => o.id === orderId);
    if (order) {
      order.status = 'cancelled';
      emit('order-updated');
    }
  }
};

const exportOrders = (): void => {
  // Implementar exportação
  console.log('Exportando pedidos...');
};

const refreshOrders = (): void => {
  // Implementar atualização
  console.log('Atualizando pedidos...');
};

// Inicializar dados mock
onMounted(() => {
  orders.value = [
    {
      id: '2024001',
      customer: {
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999'
      },
      items: [
        {
          id: '1',
          name: 'Fotolivro A4 - 20 páginas',
          quantity: 1,
          price: 49.90
        }
      ],
      total: 49.90,
      status: 'processing',
      paymentMethod: 'PIX',
      createdAt: new Date()
    },
    {
      id: '2024002',
      customer: {
        id: '2',
        name: 'Maria Santos',
        email: 'maria@email.com',
        phone: '(11) 88888-8888'
      },
      items: [
        {
          id: '2',
          name: 'Calendário 2024',
          quantity: 2,
          price: 29.90
        }
      ],
      total: 59.80,
      status: 'pending',
      paymentMethod: 'Cartão de Crédito',
      createdAt: new Date(Date.now() - 86400000) // 1 dia atrás
    }
  ];
});
</script>