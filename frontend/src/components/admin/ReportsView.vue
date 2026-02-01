<template>
  <div class="reports-view">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p class="text-gray-600">Análises e métricas do sistema</p>
      </div>
      <div class="flex space-x-3">
        <select
          v-model="selectedPeriod"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="today">Hoje</option>
          <option value="week">Esta Semana</option>
          <option value="month">Este Mês</option>
          <option value="quarter">Este Trimestre</option>
          <option value="year">Este Ano</option>
        </select>
        <button 
          @click="exportReport"
          class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Exportar
        </button>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Receita Total"
        :value="formatCurrency(metrics.totalRevenue)"
        icon="currency-dollar"
        color="green"
        :change="metrics.revenueChange"
      />
      <StatsCard
        title="Pedidos"
        :value="metrics.totalOrders"
        icon="shopping-bag"
        color="blue"
        :change="metrics.ordersChange"
      />
      <StatsCard
        title="Novos Usuários"
        :value="metrics.newUsers"
        icon="users"
        color="purple"
        :change="metrics.usersChange"
      />
      <StatsCard
        title="Taxa de Conversão"
        :value="`${metrics.conversionRate}%`"
        icon="chart-line"
        color="indigo"
        :change="metrics.conversionChange"
      />
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Revenue Chart -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Receita por Período</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
            <p>Gráfico de Receita</p>
            <p class="text-sm">(Implementação futura)</p>
          </div>
        </div>
      </div>

      <!-- Orders Chart -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Pedidos por Categoria</h3>
        <div class="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div class="text-center text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
            </svg>
            <p>Gráfico de Pizza</p>
            <p class="text-sm">(Implementação futura)</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Products -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Produtos Mais Vendidos</h3>
        <div class="space-y-4">
          <div 
            v-for="(product, index) in topProducts" 
            :key="product.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-blue-600">{{ index + 1 }}</span>
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ product.name }}</div>
                <div class="text-sm text-gray-500">{{ product.sales }} vendas</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-gray-900">{{ formatCurrency(product.revenue) }}</div>
              <div class="text-sm text-gray-500">{{ product.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Atividade Recente</h3>
        <div class="space-y-4">
          <div 
            v-for="activity in recentActivity" 
            :key="activity.id"
            class="flex items-start space-x-3"
          >
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center"
              :class="getActivityIconClasses(activity.type)"
            >
              <component :is="getActivityIcon(activity.type)" class="w-4 h-4" />
            </div>
            <div class="flex-1">
              <p class="text-sm text-gray-900">{{ activity.description }}</p>
              <p class="text-xs text-gray-500">{{ formatTime(activity.timestamp) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Tables -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold">Relatório Detalhado</h3>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pedidos
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receita
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket Médio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversão
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="row in reportData" :key="row.period" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ row.period }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ row.orders }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(row.revenue) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ formatCurrency(row.averageTicket) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ row.conversion }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import StatsCard from './StatsCard.vue';

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  percentage: number;
}

interface Activity {
  id: string;
  type: 'order' | 'user' | 'product' | 'system';
  description: string;
  timestamp: Date;
}

interface ReportRow {
  period: string;
  orders: number;
  revenue: number;
  averageTicket: number;
  conversion: number;
}

// Estado
const selectedPeriod = ref('month');
const metrics = ref({
  totalRevenue: 45280.50,
  revenueChange: 12.5,
  totalOrders: 156,
  ordersChange: 8.3,
  newUsers: 42,
  usersChange: 15.2,
  conversionRate: 3.8,
  conversionChange: -0.5
});

const topProducts = ref<TopProduct[]>([]);
const recentActivity = ref<Activity[]>([]);
const reportData = ref<ReportRow[]>([]);

// Methods
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `${minutes} min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days}d atrás`;
};

const getActivityIconClasses = (type: Activity['type']): string => {
  const classes = {
    order: 'bg-green-100 text-green-600',
    user: 'bg-blue-100 text-blue-600',
    product: 'bg-purple-100 text-purple-600',
    system: 'bg-gray-100 text-gray-600'
  };
  return classes[type];
};

const getActivityIcon = (type: Activity['type']) => {
  const icons = {
    order: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"></path>
        </svg>
      `
    },
    user: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      `
    },
    product: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
      `
    },
    system: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      `
    }
  };

  return icons[type];
};

const exportReport = (): void => {
  // Implementar exportação
  console.log('Exportando relatório...');
};

// Inicializar dados mock
onMounted(() => {
  topProducts.value = [
    {
      id: '1',
      name: 'Fotolivro A4',
      sales: 45,
      revenue: 2245.50,
      percentage: 35
    },
    {
      id: '2',
      name: 'Calendário 2024',
      sales: 32,
      revenue: 956.80,
      percentage: 25
    },
    {
      id: '3',
      name: 'Cartões Personalizados',
      sales: 28,
      revenue: 277.20,
      percentage: 20
    }
  ];

  recentActivity.value = [
    {
      id: '1',
      type: 'order',
      description: 'Novo pedido #2024001 criado',
      timestamp: new Date(Date.now() - 300000) // 5 min atrás
    },
    {
      id: '2',
      type: 'user',
      description: 'Novo usuário registrado: João Silva',
      timestamp: new Date(Date.now() - 900000) // 15 min atrás
    },
    {
      id: '3',
      type: 'product',
      description: 'Produto "Fotolivro Premium" atualizado',
      timestamp: new Date(Date.now() - 1800000) // 30 min atrás
    }
  ];

  reportData.value = [
    {
      period: 'Hoje',
      orders: 12,
      revenue: 580.40,
      averageTicket: 48.37,
      conversion: 3.2
    },
    {
      period: 'Ontem',
      orders: 18,
      revenue: 892.60,
      averageTicket: 49.59,
      conversion: 4.1
    },
    {
      period: 'Esta Semana',
      orders: 89,
      revenue: 4234.80,
      averageTicket: 47.58,
      conversion: 3.8
    },
    {
      period: 'Semana Passada',
      orders: 76,
      revenue: 3567.20,
      averageTicket: 46.94,
      conversion: 3.5
    }
  ];
});
</script>