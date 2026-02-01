<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full text-center">
      <div class="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-8">
        <svg class="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        Acesso Negado
      </h1>
      
      <p class="text-lg text-gray-600 mb-8">
        Você não tem permissão para acessar esta página.
      </p>
      
      <div class="space-y-4">
        <div v-if="!isAuthenticated" class="text-sm text-gray-500 mb-6">
          Você precisa fazer login para acessar esta área.
        </div>
        
        <div v-else class="text-sm text-gray-500 mb-6">
          Esta área é restrita a administradores.
        </div>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            v-if="!isAuthenticated"
            @click="goToLogin"
            class="btn-primary"
          >
            Fazer Login
          </button>
          
          <button
            @click="goHome"
            class="btn-secondary"
          >
            Voltar ao Início
          </button>
          
          <button
            v-if="isAuthenticated && !isAdmin"
            @click="contactSupport"
            class="btn-outline"
          >
            Solicitar Acesso
          </button>
        </div>
      </div>
      
      <!-- Informações adicionais -->
      <div class="mt-12 p-6 bg-blue-50 rounded-lg">
        <h3 class="text-lg font-semibold text-blue-900 mb-2">
          Precisa de acesso administrativo?
        </h3>
        <p class="text-blue-700 text-sm mb-4">
          Entre em contato com o administrador do sistema para solicitar as permissões necessárias.
        </p>
        <div class="text-xs text-blue-600">
          <p>📧 Email: admin@editorprodutos.com</p>
          <p>📱 WhatsApp: (11) 99999-9999</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';

const router = useRouter();
const authStore = useAuthStore();
const notificationsStore = useNotificationStore();

// Computed
const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);

// Métodos
const goToLogin = (): void => {
  router.push('/login');
};

const goHome = (): void => {
  router.push('/');
};

const contactSupport = (): void => {
  // Simular envio de solicitação
  notificationsStore.addNotification({
    type: 'info',
    title: 'Solicitação Enviada',
    message: 'Sua solicitação de acesso foi enviada para o administrador. Você receberá uma resposta em breve.',
    duration: 5000,
  });
  
  // Redirecionar para home
  setTimeout(() => {
    router.push('/');
  }, 2000);
};
</script>

<style scoped>
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid #2563eb;
  border-radius: 6px;
  background: transparent;
  color: #2563eb;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-outline:hover {
  background: #2563eb;
  color: white;
}

@media (max-width: 640px) {
  .btn-primary,
  .btn-secondary,
  .btn-outline {
    width: 100%;
  }
}
</style>