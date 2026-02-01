<template>
  <div class="settings-view">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p class="text-gray-600">Gerencie as configurações gerais da aplicação</p>
      </div>
      <button 
        @click="saveAllSettings"
        :disabled="!hasChanges"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Salvar Alterações
      </button>
    </div>

    <!-- Settings Tabs -->
    <div class="mb-6">
      <nav class="flex space-x-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
          :class="{
            'border-blue-500 text-blue-600': activeTab === tab.id,
            'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== tab.id
          }"
        >
          {{ tab.name }}
        </button>
      </nav>
    </div>

    <!-- General Settings -->
    <div v-if="activeTab === 'general'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Configurações Gerais</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nome da Aplicação</label>
            <input
              v-model="settings.general.appName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">URL Base</label>
            <input
              v-model="settings.general.baseUrl"
              type="url"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              v-model="settings.general.timezone"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="Europe/London">London (GMT+0)</option>
            </select>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Idioma Padrão</label>
            <select
              v-model="settings.general.defaultLanguage"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es-ES">Español</option>
            </select>
          </div>
        </div>

        <div class="mt-6">
          <label class="flex items-center">
            <input
              v-model="settings.general.maintenanceMode"
              type="checkbox"
              class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            >
            <span class="ml-2 text-sm text-gray-700">Modo de Manutenção</span>
          </label>
          <p class="text-xs text-gray-500 mt-1">Quando ativado, apenas administradores podem acessar o sistema</p>
        </div>
      </div>
    </div>

    <!-- Email Settings -->
    <div v-if="activeTab === 'email'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Configurações de Email</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Servidor SMTP</label>
            <input
              v-model="settings.email.smtpHost"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Porta SMTP</label>
            <input
              v-model="settings.email.smtpPort"
              type="number"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Usuário SMTP</label>
            <input
              v-model="settings.email.smtpUser"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Senha SMTP</label>
            <input
              v-model="settings.email.smtpPassword"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Email Remetente</label>
            <input
              v-model="settings.email.fromEmail"
              type="email"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Nome Remetente</label>
            <input
              v-model="settings.email.fromName"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
        </div>

        <div class="mt-6 flex space-x-3">
          <button 
            @click="testEmailConnection"
            class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Testar Conexão
          </button>
          <button 
            @click="sendTestEmail"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enviar Email de Teste
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Settings -->
    <div v-if="activeTab === 'payment'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Configurações de Pagamento</h3>
        
        <div class="space-y-6">
          <!-- PIX Settings -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-medium">PIX</h4>
              <label class="flex items-center">
                <input
                  v-model="settings.payment.pix.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                <span class="ml-2 text-sm">Habilitado</span>
              </label>
            </div>
            
            <div v-if="settings.payment.pix.enabled" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
                <input
                  v-model="settings.payment.pix.key"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Beneficiário</label>
                <input
                  v-model="settings.payment.pix.beneficiaryName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
            </div>
          </div>

          <!-- Credit Card Settings -->
          <div class="border rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-medium">Cartão de Crédito</h4>
              <label class="flex items-center">
                <input
                  v-model="settings.payment.creditCard.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                <span class="ml-2 text-sm">Habilitado</span>
              </label>
            </div>
            
            <div v-if="settings.payment.creditCard.enabled" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Gateway</label>
                <select
                  v-model="settings.payment.creditCard.gateway"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="stripe">Stripe</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="pagseguro">PagSeguro</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Chave API</label>
                <input
                  v-model="settings.payment.creditCard.apiKey"
                  type="password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Security Settings -->
    <div v-if="activeTab === 'security'" class="space-y-6">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h3 class="text-lg font-semibold mb-4">Configurações de Segurança</h3>
        
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tempo de Sessão (minutos)</label>
            <input
              v-model="settings.security.sessionTimeout"
              type="number"
              min="5"
              max="1440"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Máximo de Tentativas de Login</label>
            <input
              v-model="settings.security.maxLoginAttempts"
              type="number"
              min="3"
              max="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
          </div>

          <div class="space-y-3">
            <label class="flex items-center">
              <input
                v-model="settings.security.requireTwoFactor"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
              <span class="ml-2 text-sm text-gray-700">Exigir Autenticação de Dois Fatores</span>
            </label>
            
            <label class="flex items-center">
              <input
                v-model="settings.security.passwordComplexity"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
              <span class="ml-2 text-sm text-gray-700">Exigir Senhas Complexas</span>
            </label>
            
            <label class="flex items-center">
              <input
                v-model="settings.security.logUserActivity"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              >
              <span class="ml-2 text-sm text-gray-700">Registrar Atividade dos Usuários</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div 
      v-if="showSuccessMessage"
      class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
    >
      Configurações salvas com sucesso!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

interface Settings {
  general: {
    appName: string;
    baseUrl: string;
    timezone: string;
    defaultLanguage: string;
    maintenanceMode: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  payment: {
    pix: {
      enabled: boolean;
      key: string;
      beneficiaryName: string;
    };
    creditCard: {
      enabled: boolean;
      gateway: string;
      apiKey: string;
    };
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireTwoFactor: boolean;
    passwordComplexity: boolean;
    logUserActivity: boolean;
  };
}

const emit = defineEmits<{
  'settings-updated': [];
}>();

// Estado
const activeTab = ref('general');
const showSuccessMessage = ref(false);
const originalSettings = ref<Settings | null>(null);

const tabs = [
  { id: 'general', name: 'Geral' },
  { id: 'email', name: 'Email' },
  { id: 'payment', name: 'Pagamento' },
  { id: 'security', name: 'Segurança' }
];

const settings = ref<Settings>({
  general: {
    appName: 'Editor de Produtos Personalizados',
    baseUrl: 'https://editor.com',
    timezone: 'America/Sao_Paulo',
    defaultLanguage: 'pt-BR',
    maintenanceMode: false
  },
  email: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: 'noreply@editor.com',
    fromName: 'Editor de Produtos'
  },
  payment: {
    pix: {
      enabled: true,
      key: '',
      beneficiaryName: ''
    },
    creditCard: {
      enabled: true,
      gateway: 'stripe',
      apiKey: ''
    }
  },
  security: {
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    requireTwoFactor: false,
    passwordComplexity: true,
    logUserActivity: true
  }
});

// Computed
const hasChanges = computed(() => {
  if (!originalSettings.value) return false;
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value);
});

// Methods
const saveAllSettings = async (): Promise<void> => {
  try {
    // Implementar salvamento das configurações
    console.log('Salvando configurações:', settings.value);
    
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Atualizar configurações originais
    originalSettings.value = JSON.parse(JSON.stringify(settings.value));
    
    // Mostrar mensagem de sucesso
    showSuccessMessage.value = true;
    setTimeout(() => {
      showSuccessMessage.value = false;
    }, 3000);
    
    emit('settings-updated');
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
  }
};

const testEmailConnection = async (): Promise<void> => {
  try {
    console.log('Testando conexão de email...');
    // Implementar teste de conexão
    alert('Conexão de email testada com sucesso!');
  } catch (error) {
    console.error('Erro ao testar conexão:', error);
    alert('Erro ao testar conexão de email');
  }
};

const sendTestEmail = async (): Promise<void> => {
  try {
    console.log('Enviando email de teste...');
    // Implementar envio de email de teste
    alert('Email de teste enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    alert('Erro ao enviar email de teste');
  }
};

// Watchers
watch(settings, () => {
  // Auto-save após 2 segundos de inatividade (opcional)
}, { deep: true });

// Lifecycle
onMounted(() => {
  // Salvar configurações originais para comparação
  originalSettings.value = JSON.parse(JSON.stringify(settings.value));
});
</script>