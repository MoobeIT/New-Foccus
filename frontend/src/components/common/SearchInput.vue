<template>
  <div class="search-input relative">
    <div class="relative">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      
      <input
        :value="modelValue"
        @input="handleInput"
        @keydown.enter="handleEnter"
        @keydown.escape="handleEscape"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        :class="inputClasses"
      >
      
      <!-- Clear Button -->
      <div 
        v-if="modelValue && clearable"
        class="absolute inset-y-0 right-0 pr-3 flex items-center"
      >
        <button
          @click="handleClear"
          type="button"
          class="text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Search Suggestions -->
    <div 
      v-if="showSuggestions && suggestions.length > 0"
      class="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        @click="selectSuggestion(suggestion)"
        class="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
      >
        {{ suggestion }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  modelValue: string;
  placeholder?: string;
  type?: 'text' | 'search';
  disabled?: boolean;
  clearable?: boolean;
  suggestions?: string[];
  showSuggestions?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Buscar...',
  type: 'search',
  disabled: false,
  clearable: true,
  suggestions: () => [],
  showSuggestions: false,
  size: 'md'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'search': [value: string];
  'clear': [];
  'enter': [value: string];
  'escape': [];
}>();

// Computed
const inputClasses = computed(() => {
  const sizeClasses = {
    sm: 'text-sm py-1.5',
    md: 'text-sm py-2',
    lg: 'text-base py-3'
  };
  
  return sizeClasses[props.size];
});

// Methods
const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
  emit('search', target.value);
};

const handleClear = (): void => {
  emit('update:modelValue', '');
  emit('clear');
};

const handleEnter = (): void => {
  emit('enter', props.modelValue);
};

const handleEscape = (): void => {
  emit('escape');
};

const selectSuggestion = (suggestion: string): void => {
  emit('update:modelValue', suggestion);
  emit('search', suggestion);
};
</script>

<style scoped>
.search-input {
  min-width: 200px;
}

@media (max-width: 640px) {
  .search-input {
    min-width: 150px;
  }
}
</style>