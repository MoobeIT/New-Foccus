<template>
  <aside class="admin-sidebar bg-gray-900 text-white w-64 min-h-screen">
    <div class="p-4">
      <!-- Menu Principal -->
      <nav class="space-y-2">
        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Principal
          </h2>
          
          <SidebarItem
            icon="chart-bar"
            label="Dashboard"
            :active="activeSection === 'dashboard'"
            @click="navigate('dashboard')"
          />
          
          <SidebarItem
            icon="cube"
            label="Produtos"
            :active="activeSection === 'products'"
            @click="navigate('products')"
          />
          
          <SidebarItem
            icon="template"
            label="Templates"
            :active="activeSection === 'templates'"
            @click="navigate('templates')"
          />
          
          <SidebarItem
            icon="shopping-bag"
            label="Pedidos"
            :active="activeSection === 'orders'"
            @click="navigate('orders')"
            :badge="pendingOrdersCount"
          />
        </div>

        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Produção
          </h2>
          
          <SidebarItem
            icon="cog"
            label="Produção"
            :active="activeSection === 'production'"
            @click="navigate('production')"
            :badge="productionJobsCount"
          />
          
          <SidebarItem
            icon="truck"
            label="Envios"
            :active="activeSection === 'shipping'"
            @click="navigate('shipping')"
          />
          
          <SidebarItem
            icon="chart-line"
            label="Relatórios"
            :active="activeSection === 'reports'"
            @click="navigate('reports')"
          />
        </div>

        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Sistema
          </h2>
          
          <SidebarItem
            icon="users"
            label="Usuários"
            :active="activeSection === 'users'"
            @click="navigate('users')"
          />
          
          <SidebarItem
            icon="shield-check"
            label="Segurança"
            :active="activeSection === 'security'"
            @click="navigate('security')"
          />
          
          <SidebarItem
            icon="cog-6-tooth"
            label="Configurações"
            :active="activeSection === 'settings'"
            @click="navigate('settings')"
          />
        </div>

        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Suporte
          </h2>
          
          <SidebarItem
            icon="question-mark-circle"
            label="Ajuda"
            :active="activeSection === 'help'"
            @click="navigate('help')"
          />
          
          <SidebarItem
            icon="bug-ant"
            label="Logs"
            :active="activeSection === 'logs'"
            @click="navigate('logs')"
          />
        </div>
      </nav>
    </div>

    <!-- Status do Sistema -->
    <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
      <div class="flex items-center space-x-3">
        <div 
          class="w-3 h-3 rounded-full"
          :class="{
            'bg-green-500': systemStatus === 'online',
            'bg-yellow-500': systemStatus === 'warning',
            'bg-red-500': systemStatus === 'error'
          }"
        ></div>
        <div>
          <p class="text-sm font-medium">Sistema {{ systemStatusText }}</p>
          <p class="text-xs text-gray-400">{{ lastUpdate }}</p>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import SidebarItem from './SidebarItem.vue';

interface Props {
  activeSection: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  navigate: [section: string];
}>();

// Estado local
const systemStatus = ref<'online' | 'warning' | 'error'>('online');
const pendingOrdersCount = ref(5);
const productionJobsCount = ref(12);

// Computed
const systemStatusText = computed(() => {
  const statusMap = {
    online: 'Online',
    warning: 'Atenção',
    error: 'Erro'
  };
  return statusMap[systemStatus.value];
});

const lastUpdate = computed(() => {
  return new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Methods
const navigate = (section: string): void => {
  console.log('🔄 AdminSidebar: Navegando para seção:', section);
  emit('navigate', section);
};

// Simular verificação de status do sistema
const checkSystemStatus = (): void => {
  // Aqui você faria uma chamada real para verificar o status
  // Por enquanto, vamos simular
  const statuses: Array<'online' | 'warning' | 'error'> = ['online', 'warning', 'error'];
  const weights = [0.8, 0.15, 0.05]; // 80% online, 15% warning, 5% error
  
  const random = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < statuses.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      systemStatus.value = statuses[i];
      break;
    }
  }
};

onMounted(() => {
  checkSystemStatus();
  
  // Verificar status a cada 30 segundos
  setInterval(checkSystemStatus, 30000);
});
</script>

<style scoped>
.admin-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}

/* Scrollbar customizada */
.admin-sidebar::-webkit-scrollbar {
  width: 4px;
}

.admin-sidebar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.admin-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.admin-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>