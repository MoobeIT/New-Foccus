<template>
  <button
    @click="$emit('click')"
    class="action-card w-full p-6 bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-blue-300 transition-all duration-200 text-left group"
  >
    <div class="flex items-start space-x-4">
      <!-- Ícone -->
      <div class="flex-shrink-0">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <component :is="iconComponent" class="w-6 h-6 text-blue-600" />
        </div>
      </div>

      <!-- Conteúdo -->
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
          {{ title }}
        </h3>
        <p class="text-sm text-gray-600 mb-3">
          {{ description }}
        </p>

        <!-- Badge ou status (opcional) -->
        <div v-if="badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="badgeClasses">
          {{ badge }}
        </div>

        <!-- Estatística rápida (opcional) -->
        <div v-if="stat" class="flex items-center space-x-2 mt-2">
          <span class="text-sm text-gray-500">{{ stat.label }}:</span>
          <span class="text-sm font-medium text-gray-900">{{ stat.value }}</span>
        </div>
      </div>

      <!-- Seta -->
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>

    <!-- Barra de progresso (opcional) -->
    <div v-if="progress !== undefined" class="mt-4">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-gray-600">Progresso</span>
        <span class="font-medium text-gray-900">{{ progress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-blue-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${Math.min(progress, 100)}%` }"
        ></div>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Stat {
  label: string;
  value: string | number;
}

interface Props {
  title: string;
  description: string;
  icon?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
  stat?: Stat;
  progress?: number;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'plus',
  badgeColor: 'blue'
});

defineEmits<{
  click: [];
}>();

// Classes para o badge
const badgeClasses = computed(() => {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };
  return colorMap[props.badgeColor];
});

// Mapeamento de ícones
const iconComponent = computed(() => {
  const icons: Record<string, any> = {
    'plus': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
        </svg>
      `
    },
    'upload': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
      `
    },
    'cog': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        </svg>
      `
    },
    'chart-bar': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
      `
    },
    'cube': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
        </svg>
      `
    },
    'template': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
        </svg>
      `
    },
    'currency-dollar': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    }
  };

  return icons[props.icon] || icons['plus'];
});
</script>

<style scoped>
.action-card {
  transform: translateY(0);
}

.action-card:hover {
  transform: translateY(-2px);
}

.action-card:active {
  transform: translateY(0);
}
</style>