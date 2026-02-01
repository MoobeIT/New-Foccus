<template>
  <div class="tag-input" :class="{ 'is-focused': isFocused }">
    <div class="tags-container">
      <div
        v-for="(tag, index) in tags"
        :key="index"
        class="tag-item"
      >
        <span class="tag-text">{{ tag }}</span>
        <button
          class="tag-remove"
          @click="removeTag(index)"
          :aria-label="`Remover tag ${tag}`"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <input
        ref="input"
        v-model="inputValue"
        type="text"
        class="tag-input-field"
        :placeholder="tags.length === 0 ? placeholder : ''"
        @keydown="handleKeydown"
        @focus="isFocused = true"
        @blur="handleBlur"
        @paste="handlePaste"
      />
    </div>
    
    <div v-if="suggestions.length > 0 && showSuggestions" class="suggestions-dropdown">
      <div
        v-for="(suggestion, index) in suggestions"
        :key="index"
        class="suggestion-item"
        :class="{ 'is-highlighted': highlightedIndex === index }"
        @click="selectSuggestion(suggestion)"
        @mouseenter="highlightedIndex = index"
      >
        {{ suggestion }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

interface Props {
  modelValue: string[];
  placeholder?: string;
  separator?: string;
  allowDuplicates?: boolean;
  maxTags?: number;
  suggestions?: string[];
  validateTag?: (tag: string) => boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Digite e pressione Enter para adicionar tags',
  separator: ',',
  allowDuplicates: false,
  maxTags: 0, // 0 = sem limite
  suggestions: () => [],
});

const emit = defineEmits<{
  'update:modelValue': [tags: string[]];
  'tag-added': [tag: string];
  'tag-removed': [tag: string, index: number];
}>();

// Estado
const input = ref<HTMLInputElement>();
const inputValue = ref('');
const isFocused = ref(false);
const showSuggestions = ref(false);
const highlightedIndex = ref(-1);

// Computed
const tags = computed(() => props.modelValue);

const suggestions = computed(() => {
  if (!inputValue.value || !props.suggestions.length) return [];
  
  const query = inputValue.value.toLowerCase();
  return props.suggestions
    .filter(suggestion => 
      suggestion.toLowerCase().includes(query) &&
      !tags.value.includes(suggestion)
    )
    .slice(0, 5); // Limitar a 5 sugestões
});

// Métodos
const addTag = (tagText: string): void => {
  const tag = tagText.trim();
  
  if (!tag) return;
  
  // Validação customizada
  if (props.validateTag && !props.validateTag(tag)) {
    return;
  }
  
  // Verificar duplicatas
  if (!props.allowDuplicates && tags.value.includes(tag)) {
    return;
  }
  
  // Verificar limite máximo
  if (props.maxTags > 0 && tags.value.length >= props.maxTags) {
    return;
  }
  
  const newTags = [...tags.value, tag];
  emit('update:modelValue', newTags);
  emit('tag-added', tag);
  
  inputValue.value = '';
  highlightedIndex.value = -1;
  showSuggestions.value = false;
};

const removeTag = (index: number): void => {
  const tag = tags.value[index];
  const newTags = [...tags.value];
  newTags.splice(index, 1);
  
  emit('update:modelValue', newTags);
  emit('tag-removed', tag, index);
  
  // Focar no input após remover
  nextTick(() => {
    input.value?.focus();
  });
};

const handleKeydown = (event: KeyboardEvent): void => {
  switch (event.key) {
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0 && suggestions.value.length > 0) {
        selectSuggestion(suggestions.value[highlightedIndex.value]);
      } else {
        addTag(inputValue.value);
      }
      break;
      
    case props.separator:
      event.preventDefault();
      addTag(inputValue.value);
      break;
      
    case 'Backspace':
      if (!inputValue.value && tags.value.length > 0) {
        removeTag(tags.value.length - 1);
      }
      break;
      
    case 'ArrowDown':
      event.preventDefault();
      if (suggestions.value.length > 0) {
        showSuggestions.value = true;
        highlightedIndex.value = Math.min(
          highlightedIndex.value + 1,
          suggestions.value.length - 1
        );
      }
      break;
      
    case 'ArrowUp':
      event.preventDefault();
      if (suggestions.value.length > 0) {
        showSuggestions.value = true;
        highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      }
      break;
      
    case 'Escape':
      showSuggestions.value = false;
      highlightedIndex.value = -1;
      break;
  }
  
  // Mostrar sugestões quando começar a digitar
  if (event.key.length === 1) {
    showSuggestions.value = true;
    highlightedIndex.value = -1;
  }
};

const handleBlur = (): void => {
  // Delay para permitir clique nas sugestões
  setTimeout(() => {
    isFocused.value = false;
    showSuggestions.value = false;
    highlightedIndex.value = -1;
    
    // Adicionar tag se houver texto no input
    if (inputValue.value.trim()) {
      addTag(inputValue.value);
    }
  }, 150);
};

const handlePaste = (event: ClipboardEvent): void => {
  event.preventDefault();
  
  const pastedText = event.clipboardData?.getData('text') || '';
  const tags = pastedText
    .split(new RegExp(`[${props.separator}\\n]`))
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  tags.forEach(tag => addTag(tag));
};

const selectSuggestion = (suggestion: string): void => {
  addTag(suggestion);
  showSuggestions.value = false;
  input.value?.focus();
};
</script>

<style scoped>
.tag-input {
  position: relative;
  width: 100%;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: text;
  transition: all 0.2s;
}

.tags-container:hover {
  border-color: #9ca3af;
}

.is-focused .tags-container {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 0.875rem;
  max-width: 200px;
}

.tag-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tag-remove {
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
  flex-shrink: 0;
}

.tag-remove:hover {
  background: rgba(99, 102, 241, 0.2);
}

.tag-input-field {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.875rem;
  padding: 0.25rem 0;
}

.tag-input-field::placeholder {
  color: #9ca3af;
}

.suggestions-dropdown {
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
  max-height: 12rem;
  overflow-y: auto;
}

.suggestion-item {
  padding: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.suggestion-item:hover,
.suggestion-item.is-highlighted {
  background: #f3f4f6;
}

.suggestion-item:first-child {
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}

.suggestion-item:last-child {
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
}

/* Scrollbar */
.suggestions-dropdown::-webkit-scrollbar {
  width: 6px;
}

.suggestions-dropdown::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.suggestions-dropdown::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.suggestions-dropdown::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Responsive */
@media (max-width: 768px) {
  .tag-item {
    max-width: 150px;
  }
  
  .tag-input-field {
    min-width: 100px;
  }
}
</style>