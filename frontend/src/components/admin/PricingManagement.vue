<template>
  <div class="pricing-management">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gerenciamento de Preços</h1>
        <p class="text-gray-600">Configure regras de precificação e descontos</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Nova Regra de Preço
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Regras Ativas"
        :value="stats.activeRules"
        icon="currency-dollar"
        color="blue"
      />
      <StatsCard
        title="Descontos Aplicados"
        :value="stats.discountsApplied"
        icon="chart-bar"
        color="green"
      />
      <StatsCard
        title="Receita Média"
        :value="formatCurrency(stats.averageRevenue)"
        icon="chart-line"
        color="purple"
      />
      <StatsCard
        title="Margem de Lucro"
        :value="`${stats.profitMargin}%`"
        icon="trending-up"
        color="indigo"
      />
    </div>

    <!-- Price Simulator -->
    <div class="mb-8">
      <PriceSimulator />
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow-sm border p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-64">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Buscar regras de preço..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>
        <select
          v-model="filters.type"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos os tipos</option>
          <option value="base">Preço Base</option>
          <option value="discount">Desconto</option>
          <option value="bulk">Desconto por Volume</option>
          <option value="seasonal">Sazonal</option>
        </select>
        <select
          v-model="filters.status"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="scheduled">Agendado</option>
        </select>
      </div>
    </div>

    <!-- Pricing Rules Table -->
    <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Regra
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produtos
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Período
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="rule in filteredRules" :key="rule.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ rule.name }}</div>
                  <div class="text-sm text-gray-500">{{ rule.description }}</div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getTypeClasses(rule.type)"
                >
                  {{ getTypeLabel(rule.type) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {{ rule.applicableProducts.length }} produtos
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span v-if="rule.type === 'discount'">
                  {{ rule.discountType === 'percentage' ? `${rule.value}%` : formatCurrency(rule.value) }}
                </span>
                <span v-else>
                  {{ formatCurrency(rule.value) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div v-if="rule.startDate && rule.endDate">
                  {{ formatDate(rule.startDate) }} - {{ formatDate(rule.endDate) }}
                </div>
                <div v-else>Permanente</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getStatusClasses(rule.status)"
                >
                  {{ getStatusLabel(rule.status) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex space-x-2">
                  <button 
                    @click="editRule(rule)"
                    class="text-blue-600 hover:text-blue-900"
                  >
                    Editar
                  </button>
                  <button 
                    @click="toggleRuleStatus(rule)"
                    class="text-green-600 hover:text-green-900"
                  >
                    {{ rule.status === 'active' ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button 
                    @click="deleteRule(rule.id)"
                    class="text-red-600 hover:text-red-900"
                  >
                    Excluir
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showCreateModal || editingRule" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 class="text-xl font-bold mb-4">
          {{ editingRule ? 'Editar Regra de Preço' : 'Nova Regra de Preço' }}
        </h2>
        
        <form @submit.prevent="saveRule" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome da Regra</label>
            <input
              v-model="ruleForm.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              v-model="ruleForm.description"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                v-model="ruleForm.type"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="base">Preço Base</option>
                <option value="discount">Desconto</option>
                <option value="bulk">Desconto por Volume</option>
                <option value="seasonal">Sazonal</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                v-model="ruleForm.status"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="scheduled">Agendado</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              @click="cancelEdit"
              class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {{ editingRule ? 'Atualizar' : 'Criar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import StatsCard from './StatsCard.vue';
import PriceSimulator from './PriceSimulator.vue';

interface PricingRule {
  id: string;
  name: string;
  description: string;
  type: 'base' | 'discount' | 'bulk' | 'seasonal';
  value: number;
  discountType?: 'percentage' | 'fixed';
  applicableProducts: string[];
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'inactive' | 'scheduled';
  createdAt: Date;
}

const emit = defineEmits<{
  'pricing-updated': [];
}>();

// Estado
const pricingRules = ref<PricingRule[]>([]);
const showCreateModal = ref(false);
const editingRule = ref<PricingRule | null>(null);
const filters = ref({
  search: '',
  type: '',
  status: ''
});

const stats = ref({
  activeRules: 12,
  discountsApplied: 45,
  averageRevenue: 89.50,
  profitMargin: 35
});

const ruleForm = ref({
  name: '',
  description: '',
  type: 'base' as PricingRule['type'],
  value: 0,
  status: 'active' as PricingRule['status']
});

// Computed
const filteredRules = computed(() => {
  return pricingRules.value.filter(rule => {
    const matchesSearch = !filters.value.search || 
      rule.name.toLowerCase().includes(filters.value.search.toLowerCase()) ||
      rule.description.toLowerCase().includes(filters.value.search.toLowerCase());
    
    const matchesType = !filters.value.type || rule.type === filters.value.type;
    const matchesStatus = !filters.value.status || rule.status === filters.value.status;
    
    return matchesSearch && matchesType && matchesStatus;
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
  return date.toLocaleDateString('pt-BR');
};

const getTypeLabel = (type: PricingRule['type']): string => {
  const labels = {
    base: 'Preço Base',
    discount: 'Desconto',
    bulk: 'Volume',
    seasonal: 'Sazonal'
  };
  return labels[type];
};

const getTypeClasses = (type: PricingRule['type']): string => {
  const classes = {
    base: 'bg-blue-100 text-blue-800',
    discount: 'bg-green-100 text-green-800',
    bulk: 'bg-purple-100 text-purple-800',
    seasonal: 'bg-yellow-100 text-yellow-800'
  };
  return classes[type];
};

const getStatusLabel = (status: PricingRule['status']): string => {
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    scheduled: 'Agendado'
  };
  return labels[status];
};

const getStatusClasses = (status: PricingRule['status']): string => {
  const classes = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-yellow-100 text-yellow-800'
  };
  return classes[status];
};

const editRule = (rule: PricingRule): void => {
  editingRule.value = rule;
  ruleForm.value = {
    name: rule.name,
    description: rule.description,
    type: rule.type,
    value: rule.value,
    status: rule.status
  };
};

const cancelEdit = (): void => {
  showCreateModal.value = false;
  editingRule.value = null;
  ruleForm.value = {
    name: '',
    description: '',
    type: 'base',
    value: 0,
    status: 'active'
  };
};

const saveRule = (): void => {
  // Implementar salvamento
  console.log('Salvando regra:', ruleForm.value);
  cancelEdit();
  emit('pricing-updated');
};

const toggleRuleStatus = (rule: PricingRule): void => {
  rule.status = rule.status === 'active' ? 'inactive' : 'active';
  emit('pricing-updated');
};

const deleteRule = (id: string): void => {
  if (confirm('Tem certeza que deseja excluir esta regra?')) {
    const index = pricingRules.value.findIndex(r => r.id === id);
    if (index > -1) {
      pricingRules.value.splice(index, 1);
      emit('pricing-updated');
    }
  }
};

// Inicializar dados mock
onMounted(() => {
  pricingRules.value = [
    {
      id: '1',
      name: 'Desconto Black Friday',
      description: 'Desconto especial para Black Friday',
      type: 'discount',
      value: 20,
      discountType: 'percentage',
      applicableProducts: ['1', '2', '3'],
      startDate: new Date('2024-11-24'),
      endDate: new Date('2024-11-30'),
      status: 'scheduled',
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'Preço Base Fotolivro A4',
      description: 'Preço padrão para fotolivros A4',
      type: 'base',
      value: 49.90,
      applicableProducts: ['1'],
      status: 'active',
      createdAt: new Date()
    }
  ];
});
</script>