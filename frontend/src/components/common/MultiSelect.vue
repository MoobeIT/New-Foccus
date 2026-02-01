<template>
  <div class="multi-select" :class="{ 'is-open': isOpen }">
    <div
      class="multi-select-trigger"
      @click="toggleDropdown"
      @keydown.enter.prevent="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
      @keydown.escape="closeDropdown"
      tabindex="0"
    >
      <div class="selected-items">
        <div
          v-for="item in selectedItems"
          :key="getItemValue(item)"
          class="selected-item"
        >
          <span>{{ getItemLabel(item) }}</span>
          <button
            class="remove-item"
            @click.stop="removeItem(item)"
            :aria-label="`Remover ${getItemLabel(item)}`"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <span v-if="selectedItems.length === 0" class="placeholder">
          {{ placeholder }}
        </span>
      </div>
      
      <div class="dropdown-arrow">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <div v-if="searchable" class="search-container">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar..."
            @keydown.escape="closeDropdown"
          />
        </div>
        
        <div class="options-container">
          <div
            v-for="option in filteredOptions"
            :key="getItemValue(option)"
            class="option-item"
            :class="{ 'is-selected': isSelected(option) }"
            @click="toggleOption(option)"
          >
            <div class="option-checkbox">
              <input
                type="checkbox"
                :checked="isSelected(option)"
                @change="toggleOption(option)"
                tabindex="-1"
              />
            </div>
            
            <span class="option-label">{{ getItemLabel(option) }}</span>
          </div>
          
          <div v-if="filteredOptions.length === 0" class="no-options">
            {{ searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma opção disponível' }}
          </div>
        </div>
        
        <div v-if="showSelectAll && filteredOptions.length > 0" class="dropdown-actions">
          <button
            class="action-button"
            @click="selectAll"
            :disabled="allSelected"
          >
            Selecionar Todos
          </button>
          
          <button
            class="action-button"
            @click="clearAll"
            :disabled="selectedItems.length === 0"
          >
            Limpar Todos
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';

type Option = string | { value: string; label: string; [key: string]: any };

interface Props {
  modelValue: string[];
  options: Option[];
  placeholder?: string;
  searchable?: boolean;
  showSelectAll?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Selecione as opções',
  searchable: true,
  showSelectAll: true,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

// Estado
const isOpen = ref(false);
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement>();

// Computed
const selectedItems = computed(() => {
  return props.options.filter(option => 
    props.modelValue.includes(getItemValue(option))
  );
});

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options;
  
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(option =>
    getItemLabel(option).toLowerCase().includes(query)
  );
});

const allSelected = computed(() => {
  return filteredOptions.value.length > 0 && 
         filteredOptions.value.every(option => isSelected(option));
});

// Métodos
const getItemValue = (item: Option): string => {
  return typeof item === 'string' ? item : item.value;
};

const getItemLabel = (item: Option): string => {
  return typeof item === 'string' ? item : item.label;
};

const isSelected = (option: Option): boolean => {
  return props.modelValue.includes(getItemValue(option));
};

const toggleDropdown = (): void => {
  if (props.disabled) return;
  
  isOpen.value = !isOpen.value;
  
  if (isOpen.value && props.searchable) {
    nextTick(() => {
      searchInput.value?.focus();
    });
  }
};

const closeDropdown = (): void => {
  isOpen.value = false;
  searchQuery.value = '';
};

const toggleOption = (option: Option): void => {
  const value = getItemValue(option);
  const newValue = [...props.modelValue];
  
  const index = newValue.indexOf(value);
  if (index > -1) {
    newValue.splice(index, 1);
  } else {
    newValue.push(value);
  }
  
  emit('update:modelValue', newValue);
};

const removeItem = (item: Option): void => {
  const value = getItemValue(item);
  const newValue = props.modelValue.filter(v => v !== value);
  emit('update:modelValue', newValue);
};

const selectAll = (): void => {
  const allValues = filteredOptions.value.map(getItemValue);
  const newValue = [...new Set([...props.modelValue, ...allValues])];
  emit('update:modelValue', newValue);
};

const clearAll = (): void => {
  const filteredValues = filteredOptions.value.map(getItemValue);
  const newValue = props.modelValue.filter(v => !filteredValues.includes(v));
  emit('update:modelValue', newValue);
};

const handleClickOutside = (event: Event): void => {
  const target = event.target as Element;
  const multiSelect = target.closest('.multi-select');
  
  if (!multiSelect && isOpen.value) {
    closeDropdown();
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.multi-select {
  position: relative;
  width: 100%;
}

.multi-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.multi-select-trigger:hover {
  border-color: #9ca3af;
}

.multi-select-trigger:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.is-open .multi-select-trigger {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.selected-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  flex: 1;
  min-height: 1.5rem;
  align-items: center;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 0.875rem;
}

.remove-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: none;
  color: #6366f1;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}

.remove-item:hover {
  background: rgba(99, 102, 241, 0.2);
}

.placeholder {
  color: #9ca3af;
  font-size: 0.875rem;
}

.dropdown-arrow {
  display: flex;
  align-items: center;
  color: #6b7280;
  transition: transform 0.2s;
}

.is-open .dropdown-arrow {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 0.25rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  max-height: 16rem;
  overflow: hidden;
}

.search-container {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.search-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}

.options-container {
  max-height: 12rem;
  overflow-y: auto;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.option-item:hover {
  background: #f9fafb;
}

.option-item.is-selected {
  background: #eff6ff;
  color: #1d4ed8;
}

.option-checkbox {
  display: flex;
  align-items: center;
}

.option-checkbox input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.option-label {
  flex: 1;
  font-size: 0.875rem;
}

.no-options {
  padding: 1rem;
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
}

.dropdown-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.action-button {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #374151;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}

/* Scrollbar */
.options-container::-webkit-scrollbar {
  width: 6px;
}

.options-container::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.options-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.options-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>