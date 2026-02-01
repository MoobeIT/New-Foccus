<template>
  <div v-if="isLoading" class="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
  
  <div v-else-if="hasAccess">
    <slot />
  </div>
  
  <div v-else class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="text-center">
      <div class="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-8">
        <svg class="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <h1 class="text-2xl font-bold text-gray-900 mb-4">
        {{ title }}
      </h1>
      
      <p class="text-gray-600 mb-8">
        {{ message }}
      </p>
      
      <div class="space-x-4">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

interface Props {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

const props = withDefaults(defineProps<Props>(), {
  requireAuth: false,
  requireAdmin: false,
  redirectTo: '/login',
});

const router = useRouter();
const authStore = useAuthStore();

// Computed
const isLoading = computed(() => authStore.isLoading);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const isAdmin = computed(() => authStore.isAdmin);

const hasAccess = computed(() => {
  if (props.requireAdmin) {
    return isAuthenticated.value && isAdmin.value;
  }
  
  if (props.requireAuth) {
    return isAuthenticated.value;
  }
  
  return true;
});

const title = computed(() => {
  if (props.requireAdmin && !isAuthenticated.value) {
    return 'Login Necessário';
  }
  
  if (props.requireAdmin && !isAdmin.value) {
    return 'Acesso Restrito';
  }
  
  if (props.requireAuth && !isAuthenticated.value) {
    return 'Login Necessário';
  }
  
  return 'Acesso Negado';
});

const message = computed(() => {
  if (props.requireAdmin && !isAuthenticated.value) {
    return 'Você precisa fazer login para acessar o painel administrativo.';
  }
  
  if (props.requireAdmin && !isAdmin.value) {
    return 'Esta área é restrita a administradores do sistema.';
  }
  
  if (props.requireAuth && !isAuthenticated.value) {
    return 'Você precisa fazer login para acessar esta área.';
  }
  
  return 'Você não tem permissão para acessar esta página.';
});

// Métodos
const goToLogin = (): void => {
  router.push(props.redirectTo);
};

const goHome = (): void => {
  router.push('/');
};

// Lifecycle
onMounted(() => {
  // Verificar se precisa redirecionar automaticamente
  if (!hasAccess.value && !isLoading.value) {
    if (props.requireAuth && !isAuthenticated.value) {
      // Salvar a rota atual para redirecionar após login
      const currentRoute = router.currentRoute.value.fullPath;
      router.push(`${props.redirectTo}?redirect=${encodeURIComponent(currentRoute)}`);
    }
  }
});
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
</style>