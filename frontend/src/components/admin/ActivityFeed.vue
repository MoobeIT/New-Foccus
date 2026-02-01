<template>
  <div class="activity-feed">
    <div v-if="activities.length === 0" class="text-center py-8">
      <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
      </svg>
      <p class="text-gray-500">Nenhuma atividade recente</p>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="activity in activities" 
        :key="activity.id"
        class="activity-item flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <!-- Avatar ou Ícone -->
        <div class="flex-shrink-0">
          <div 
            v-if="activity.user?.avatar"
            class="w-8 h-8 rounded-full overflow-hidden"
          >
            <img 
              :src="activity.user.avatar" 
              :alt="activity.user.name"
              class="w-full h-full object-cover"
            >
          </div>
          <div 
            v-else
            class="w-8 h-8 rounded-full flex items-center justify-center"
            :class="activityIconClasses(activity.type)"
          >
            <component :is="getActivityIcon(activity.type)" class="w-4 h-4" />
          </div>
        </div>

        <!-- Conteúdo -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2">
            <p class="text-sm font-medium text-gray-900">
              {{ activity.user?.name || 'Sistema' }}
            </p>
            <span 
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="activityBadgeClasses(activity.type)"
            >
              {{ getActivityTypeLabel(activity.type) }}
            </span>
          </div>
          
          <p class="text-sm text-gray-600 mt-1">
            {{ activity.description }}
          </p>

          <!-- Metadados adicionais -->
          <div v-if="activity.metadata" class="mt-2 text-xs text-gray-500">
            <span v-if="activity.metadata.entity">
              {{ activity.metadata.entity }}
            </span>
            <span v-if="activity.metadata.changes" class="ml-2">
              {{ activity.metadata.changes }} alterações
            </span>
          </div>

          <!-- Timestamp -->
          <p class="text-xs text-gray-400 mt-2">
            {{ formatTime(activity.timestamp) }}
          </p>
        </div>

        <!-- Ações (opcional) -->
        <div v-if="activity.actions && activity.actions.length > 0" class="flex-shrink-0">
          <div class="flex space-x-1">
            <button
              v-for="action in activity.actions"
              :key="action.label"
              @click="action.handler"
              class="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Botão para carregar mais -->
    <div v-if="hasMore" class="text-center mt-6">
      <button 
        @click="$emit('load-more')"
        :disabled="loading"
        class="text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400 transition-colors"
      >
        {{ loading ? 'Carregando...' : 'Carregar mais atividades' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface ActivityAction {
  label: string;
  handler: () => void;
}

interface Activity {
  id: string;
  type: 'create' | 'update' | 'delete' | 'login' | 'upload' | 'order' | 'system';
  description: string;
  user?: User;
  timestamp: Date;
  metadata?: {
    entity?: string;
    changes?: number;
    [key: string]: any;
  };
  actions?: ActivityAction[];
}

interface Props {
  activities: Activity[];
  hasMore?: boolean;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hasMore: false,
  loading: false
});

defineEmits<{
  'load-more': [];
}>();

// Métodos para formatação
const formatTime = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Agora mesmo';
  if (minutes < 60) return `${minutes} min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getActivityTypeLabel = (type: Activity['type']): string => {
  const labels = {
    create: 'Criado',
    update: 'Atualizado',
    delete: 'Excluído',
    login: 'Login',
    upload: 'Upload',
    order: 'Pedido',
    system: 'Sistema'
  };
  return labels[type];
};

const activityIconClasses = (type: Activity['type']): string => {
  const classes = {
    create: 'bg-green-100 text-green-600',
    update: 'bg-blue-100 text-blue-600',
    delete: 'bg-red-100 text-red-600',
    login: 'bg-purple-100 text-purple-600',
    upload: 'bg-yellow-100 text-yellow-600',
    order: 'bg-indigo-100 text-indigo-600',
    system: 'bg-gray-100 text-gray-600'
  };
  return classes[type];
};

const activityBadgeClasses = (type: Activity['type']): string => {
  const classes = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    upload: 'bg-yellow-100 text-yellow-800',
    order: 'bg-indigo-100 text-indigo-800',
    system: 'bg-gray-100 text-gray-800'
  };
  return classes[type];
};

const getActivityIcon = (type: Activity['type']) => {
  const icons = {
    create: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
      `
    },
    update: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      `
    },
    delete: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      `
    },
    login: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
        </svg>
      `
    },
    upload: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
      `
    },
    order: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"></path>
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
</script>

<style scoped>
.activity-item {
  border-left: 3px solid transparent;
}

.activity-item:hover {
  border-left-color: #3b82f6;
}
</style>