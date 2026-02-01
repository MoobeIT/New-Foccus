<template>
  <div class="filter-dropdown relative">
    <button
      @click="isOpen = !isOpen"
      class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      :class="{ 'ring-2 ring-blue-500 border-blue-500': isOpen }"
    >
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
      </svg>
      
      {{ buttonText }}
      
      <svg class="w-4 h-4 ml-2 transition-transform" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <div 
      v-if="isOpen"
      class="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-lg shadow-lg"
      :class="dropdownPosition"
    >
      <div class="p-4">
        <!-- Search within filters -->
        <div v-if="searchable" class="mb-3">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar filtros..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <!-- Filter Options -->
        <div class="space-y-2 max-h-60 overflow-y-auto">
          <div
            v-for="option in filteredOptions"
            :key="option.value"
            class="flex items-center"
          >
            <input
              :id="`filter-${option.value}`"
              v-model="selectedValues"
              :value="option.value"
              type="checkbox"
              class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <label
              :for="`filter-${option.value}`"
              class="ml-2 text-sm text-gray-700 cursor-pointer flex-1"
            >
              {{ option.label }}
              <span v-if="option.count !== undefined" class="text-gray-500 ml-1">({{ option.count }})</span>
            </label>
          </div>
        </div>

        <!-- No results -->
        <div v-if="filteredOptions.length === 0" class="text-sm text-gray-500 text-center py-4">
          Nenhum filtro encontrado
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
          <button
            @click="clearAll"
            class="text-sm text-gray-600 hover:text-gray-800"
          >
            Limpar tudo
          </button>
          
          <div class="flex space-x-2">
            <button
              @click="cancel"
              class="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancelar
            </button>
            <button
              @click="apply"
              class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  modelValue: string[];
  options: FilterOption[];
  placeholder?: string;
  searchable?: boolean;
  position?: 'left' | 'right';
  multiple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Filtros',
  searchable: true,
  position: 'left',
  multiple: true
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
  'change': [value: string[]];
}>();

// State
const isOpen = ref(false);
const searchQuery = ref('');
const selectedValues = ref<string[]>([...props.modelValue]);

// Computed
const buttonText = computed(() => {
  if (selectedValues.value.length === 0) {
    return props.placeholder;
  }
  
  if (selectedValues.value.length === 1) {
    const option = props.options.find(opt => opt.value === selectedValues.value[0]);
    return option?.label || selectedValues.value[0];
  }
  
  return `${selectedValues.value.length} filtros selecionados`;
});

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) {
    return props.options;
  }
  
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option => 
    option.label.toLowerCase().includes(query) ||
    option.value.toLowerCase().includes(query)
  );
});

const dropdownPosition = computed(() => {
  return props.position === 'right' ? 'right-0' : 'left-0';
});

// Methods
const apply = (): void => {
  emit('update:modelValue', [...selectedValues.value]);
  emit('change', [...selectedValues.value]);
  isOpen.value = false;
};

const cancel = (): void => {
  selectedValues.value = [...props.modelValue];
  isOpen.value = false;
};

const clearAll = (): void => {
  selectedValues.value = [];
};

const handleClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  if (!target.closest('.filter-dropdown')) {
    cancel();
  }
};

// Watchers
watch(() => props.modelValue, (newValue) => {
  selectedValues.value = [...newValue];
});

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.filter-dropdown {
  min-width: 120px;
}
</style>