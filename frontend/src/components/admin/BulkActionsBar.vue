<template>
  <div class="bulk-actions-bar bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between">
      <!-- Selection Info -->
      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm font-medium text-blue-900">
            {{ selectedCount }} {{ selectedCount === 1 ? 'item selecionado' : 'itens selecionados' }}
          </span>
        </div>
        
        <button
          @click="$emit('clear-selection')"
          class="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Limpar seleção
        </button>
      </div>

      <!-- Bulk Actions -->
      <div class="flex items-center space-x-2">
        <button
          v-for="action in actions"
          :key="action.id"
          @click="$emit('action', action.id)"
          class="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="getActionClasses(action.type)"
          :disabled="action.disabled"
        >
          <component :is="getActionIcon(action.icon)" class="w-4 h-4 mr-2" />
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface BulkAction {
  id: string;
  label: string;
  icon: string;
  type: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
}

interface Props {
  selectedCount: number;
  actions?: BulkAction[];
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [
    {
      id: 'delete',
      label: 'Excluir',
      icon: 'trash',
      type: 'danger'
    },
    {
      id: 'export',
      label: 'Exportar',
      icon: 'download',
      type: 'secondary'
    },
    {
      id: 'duplicate',
      label: 'Duplicar',
      icon: 'duplicate',
      type: 'secondary'
    }
  ]
});

defineEmits<{
  'clear-selection': [];
  'action': [actionId: string];
}>();

// Methods
const getActionClasses = (type: BulkAction['type']): string => {
  const classes = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400'
  };
  return classes[type];
};

const getActionIcon = (iconName: string) => {
  const icons: Record<string, any> = {
    trash: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
        </svg>
      `
    },
    download: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      `
    },
    duplicate: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
      `
    },
    edit: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      `
    },
    archive: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l4 4 4-4m6-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0v8a2 2 0 01-2 2H7a2 2 0 01-2-2V8m14 0H5m9 8h3m-3 0h-3m-2-3h5a2 2 0 012 2v1a2 2 0 01-2 2H9a2 2 0 01-2-2v-1a2 2 0 012-2z"></path>
        </svg>
      `
    },
    publish: {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
      `
    }
  };

  return icons[iconName] || icons.edit;
};
</script>

<style scoped>
.bulk-actions-bar {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>