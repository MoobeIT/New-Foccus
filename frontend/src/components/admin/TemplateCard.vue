<template>
  <div class="template-card bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
    <!-- Template Preview -->
    <div class="aspect-w-4 aspect-h-3 bg-gray-200 rounded-t-lg overflow-hidden relative">
      <img 
        v-if="template.thumbnail"
        :src="template.thumbnail" 
        :alt="template.name"
        class="w-full h-48 object-cover"
      >
      <div v-else class="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
        <svg class="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
        </svg>
      </div>
      
      <!-- Status Badges -->
      <div class="absolute top-2 left-2 flex space-x-1">
        <span 
          v-if="template.isPremium"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
        >
          Premium
        </span>
        <span 
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :class="statusClasses"
        >
          {{ statusLabel }}
        </span>
      </div>

      <!-- Menu Button -->
      <div class="absolute top-2 right-2">
        <div class="relative">
          <button
            @click="showMenu = !showMenu"
            class="p-1 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
          
          <!-- Dropdown Menu -->
          <div 
            v-if="showMenu"
            class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10"
          >
            <button
              @click="handlePreview"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Visualizar
            </button>
            <button
              @click="handleEdit"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Editar
            </button>
            <button
              @click="handleDuplicate"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Duplicar
            </button>
            <button
              @click="handleDownload"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Download
            </button>
            <button
              @click="handleToggleVisibility"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              {{ template.isPublic ? 'Tornar Privado' : 'Tornar Público' }}
            </button>
            <div class="border-t border-gray-100"></div>
            <button
              @click="handleDelete"
              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>

      <!-- Quick Actions Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 hover:opacity-100">
        <div class="flex space-x-2">
          <button
            @click="handlePreview"
            class="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          <button
            @click="handleEdit"
            class="p-2 bg-white rounded-full text-gray-700 hover:text-green-600 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Template Info -->
    <div class="p-4">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold text-gray-900 truncate">{{ template.name }}</h3>
        <div class="flex items-center space-x-1">
          <!-- Rating -->
          <div class="flex items-center">
            <svg class="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <span class="text-sm text-gray-600 ml-1">{{ template.rating || 0 }}</span>
          </div>
        </div>
      </div>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ template.description }}</p>

      <!-- Template Stats -->
      <div class="flex justify-between items-center mb-3">
        <div class="text-sm text-gray-500">
          <span class="font-medium">{{ template.downloads || 0 }}</span> downloads
        </div>
        <div class="text-sm text-gray-500">
          <span class="font-medium">{{ template.pages?.length || 0 }}</span> páginas
        </div>
      </div>

      <!-- Category and Type -->
      <div class="flex justify-between items-center mb-4">
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {{ getCategoryLabel(template.category) }}
        </span>
        <div class="text-sm text-gray-500">
          {{ formatDate(template.createdAt) }}
        </div>
      </div>

      <!-- Tags -->
      <div v-if="template.metadata?.tags && template.metadata.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="tag in template.metadata.tags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
        >
          {{ tag }}
        </span>
        <span v-if="template.metadata.tags.length > 3" class="text-xs text-gray-500">
          +{{ template.metadata.tags.length - 3 }} mais
        </span>
      </div>

      <!-- Actions -->
      <div class="flex space-x-2">
        <button
          @click="handlePreview"
          class="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          Visualizar
        </button>
        <button
          @click="handleUse"
          class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Usar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  isPublic: boolean;
  isPremium: boolean;
  rating?: number;
  downloads?: number;
  pages?: any[];
  metadata?: {
    tags?: string[];
    author?: string;
  };
  createdAt: Date;
}

interface Props {
  template: Template;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  preview: [template: Template];
  edit: [template: Template];
  delete: [template: Template];
  duplicate: [template: Template];
  download: [template: Template];
  use: [template: Template];
  'toggle-visibility': [template: Template];
}>();

// State
const showMenu = ref(false);

// Computed
const statusClasses = computed(() => {
  return props.template.isPublic 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';
});

const statusLabel = computed(() => {
  return props.template.isPublic ? 'Público' : 'Privado';
});

// Methods
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'familia': 'Família',
    'casamento': 'Casamento',
    'criativo': 'Criativo',
    'corporativo': 'Corporativo',
    'geral': 'Geral'
  };
  return labels[category] || category;
};

const handlePreview = (): void => {
  emit('preview', props.template);
  showMenu.value = false;
};

const handleEdit = (): void => {
  emit('edit', props.template);
  showMenu.value = false;
};

const handleDelete = (): void => {
  emit('delete', props.template);
  showMenu.value = false;
};

const handleDuplicate = (): void => {
  emit('duplicate', props.template);
  showMenu.value = false;
};

const handleDownload = (): void => {
  emit('download', props.template);
  showMenu.value = false;
};

const handleUse = (): void => {
  emit('use', props.template);
  showMenu.value = false;
};

const handleToggleVisibility = (): void => {
  emit('toggle-visibility', props.template);
  showMenu.value = false;
};

const handleClickOutside = (event: MouseEvent): void => {
  const target = event.target as HTMLElement;
  if (!target.closest('.relative')) {
    showMenu.value = false;
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
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.aspect-w-4 {
  position: relative;
  padding-bottom: 75%; /* 4:3 aspect ratio */
}

.aspect-w-4 > * {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>