<template>
  <div 
    class="stats-card bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
    :class="cardClasses"
  >
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-600 mb-1">{{ title }}</p>
        <p class="text-2xl font-bold" :class="valueClasses">{{ displayValue }}</p>
        
        <!-- Mudança percentual -->
        <div v-if="change !== undefined" class="flex items-center mt-2">
          <component :is="changeIcon" class="w-4 h-4 mr-1" :class="changeIconClasses" />
          <span class="text-sm font-medium" :class="changeTextClasses">
            {{ Math.abs(change) }}%
          </span>
          <span class="text-sm text-gray-500 ml-1">vs. período anterior</span>
        </div>

        <!-- Descrição adicional -->
        <p v-if="description" class="text-sm text-gray-500 mt-1">{{ description }}</p>
      </div>

      <!-- Ícone -->
      <div class="flex-shrink-0 ml-4">
        <div 
          class="w-12 h-12 rounded-lg flex items-center justify-center"
          :class="iconBackgroundClasses"
        >
          <component :is="iconComponent" class="w-6 h-6" :class="iconClasses" />
        </div>
      </div>
    </div>

    <!-- Barra de progresso (opcional) -->
    <div v-if="progress !== undefined" class="mt-4">
      <div class="flex items-center justify-between text-sm mb-1">
        <span class="text-gray-600">Progresso</span>
        <span class="font-medium" :class="valueClasses">{{ progress }}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="h-2 rounded-full transition-all duration-300"
          :class="progressBarClasses"
          :style="{ width: `${Math.min(progress, 100)}%` }"
        ></div>
      </div>
    </div>

    <!-- Ações rápidas (opcional) -->
    <div v-if="actions && actions.length > 0" class="mt-4 flex space-x-2">
      <button
        v-for="action in actions"
        :key="action.label"
        @click="action.handler"
        class="text-sm px-3 py-1 rounded-md transition-colors"
        :class="actionButtonClasses"
      >
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Action {
  label: string;
  handler: () => void;
}

interface Props {
  title: string;
  value: string | number;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'gray';
  change?: number;
  description?: string;
  progress?: number;
  actions?: Action[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'chart-bar',
  color: 'blue',
  loading: false
});

// Computed properties para classes CSS
const cardClasses = computed(() => ({
  'animate-pulse': props.loading
}));

const valueClasses = computed(() => {
  const colorMap = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    gray: 'text-gray-600'
  };
  return colorMap[props.color];
});

const iconBackgroundClasses = computed(() => {
  const colorMap = {
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
    purple: 'bg-purple-100',
    indigo: 'bg-indigo-100',
    gray: 'bg-gray-100'
  };
  return colorMap[props.color];
});

const iconClasses = computed(() => {
  const colorMap = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    gray: 'text-gray-600'
  };
  return colorMap[props.color];
});

const progressBarClasses = computed(() => {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    gray: 'bg-gray-500'
  };
  return colorMap[props.color];
});

const actionButtonClasses = computed(() => {
  const colorMap = {
    blue: 'text-blue-600 hover:bg-blue-50',
    green: 'text-green-600 hover:bg-green-50',
    yellow: 'text-yellow-600 hover:bg-yellow-50',
    red: 'text-red-600 hover:bg-red-50',
    purple: 'text-purple-600 hover:bg-purple-50',
    indigo: 'text-indigo-600 hover:bg-indigo-50',
    gray: 'text-gray-600 hover:bg-gray-50'
  };
  return colorMap[props.color];
});

const changeIconClasses = computed(() => {
  if (props.change === undefined) return '';
  return props.change >= 0 ? 'text-green-500' : 'text-red-500';
});

const changeTextClasses = computed(() => {
  if (props.change === undefined) return '';
  return props.change >= 0 ? 'text-green-600' : 'text-red-600';
});

const changeIcon = computed(() => {
  if (props.change === undefined) return null;
  
  return props.change >= 0 ? {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l9.2-9.2M17 17V7H7"></path>
      </svg>
    `
  } : {
    template: `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7l-9.2 9.2M7 7v10h10"></path>
      </svg>
    `
  };
});

const displayValue = computed(() => {
  if (props.loading) return '---';
  return props.value;
});

// Mapeamento de ícones
const iconComponent = computed(() => {
  const icons: Record<string, any> = {
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
    'shopping-bag': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 12H6L5 9z"></path>
        </svg>
      `
    },
    'currency-dollar': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    },
    'users': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      `
    },
    'clock': {
      template: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      `
    }
  };

  return icons[props.icon] || icons['chart-bar'];
});
</script>

<style scoped>
.stats-card {
  transition: all 0.2s ease-in-out;
}

.stats-card:hover {
  transform: translateY(-1px);
}
</style>