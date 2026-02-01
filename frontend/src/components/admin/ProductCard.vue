<template>
  <div class="product-card bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
    <!-- Product Image -->
    <div class="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg overflow-hidden">
      <img 
        v-if="product.image"
        :src="product.image" 
        :alt="product.name"
        class="w-full h-48 object-cover"
      >
      <div v-else class="w-full h-48 flex items-center justify-center bg-gray-100">
        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      </div>
      
      <!-- Status Badge -->
      <div class="absolute top-2 right-2">
        <span 
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
          :class="statusClasses"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Product Info -->
    <div class="p-4">
      <div class="flex justify-between items-start mb-2">
        <h3 class="text-lg font-semibold text-gray-900 truncate">{{ product.name }}</h3>
        <div class="flex items-center space-x-1">
          <!-- Favorite Button -->
          <button
            @click="toggleFavorite"
            class="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg class="w-4 h-4" :class="{ 'text-red-500 fill-current': product.isFavorite }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
          </button>
          
          <!-- Menu Button -->
          <div class="relative">
            <button
              @click="showMenu = !showMenu"
              class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
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
                @click="handleManageVariants"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Gerenciar Variantes
              </button>
              <button
                @click="handleToggleStatus"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {{ product.status === 'active' ? 'Desativar' : 'Ativar' }}
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
      </div>

      <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ product.description }}</p>

      <!-- Product Stats -->
      <div class="flex justify-between items-center mb-3">
        <div class="text-sm text-gray-500">
          <span class="font-medium">{{ product.variants?.length || 0 }}</span> variantes
        </div>
        <div class="text-sm text-gray-500">
          <span class="font-medium">{{ product.sales || 0 }}</span> vendas
        </div>
      </div>

      <!-- Price Range -->
      <div class="flex justify-between items-center mb-4">
        <div>
          <span class="text-lg font-bold text-gray-900">{{ formatPrice(product.basePrice) }}</span>
          <span v-if="product.maxPrice && product.maxPrice !== product.basePrice" class="text-sm text-gray-500">
            - {{ formatPrice(product.maxPrice) }}
          </span>
        </div>
        <div class="text-sm text-gray-500">
          {{ formatDate(product.createdAt) }}
        </div>
      </div>

      <!-- Tags -->
      <div v-if="product.tags && product.tags.length > 0" class="flex flex-wrap gap-1 mb-3">
        <span
          v-for="tag in product.tags.slice(0, 3)"
          :key="tag"
          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
        >
          {{ tag }}
        </span>
        <span v-if="product.tags.length > 3" class="text-xs text-gray-500">
          +{{ product.tags.length - 3 }} mais
        </span>
      </div>

      <!-- Actions -->
      <div class="flex space-x-2">
        <button
          @click="handleView"
          class="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          Ver Detalhes
        </button>
        <button
          @click="handleEdit"
          class="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Editar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  maxPrice?: number;
  image?: string;
  status: 'active' | 'inactive' | 'draft';
  variants?: any[];
  tags?: string[];
  sales?: number;
  isFavorite?: boolean;
  createdAt: Date;
}

interface Props {
  product: Product;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  edit: [product: Product];
  delete: [product: Product];
  duplicate: [product: Product];
  'toggle-status': [product: Product];
  'manage-variants': [product: Product];
  view: [product: Product];
  'toggle-favorite': [product: Product];
}>();

// State
const showMenu = ref(false);

// Computed
const statusClasses = computed(() => {
  const classes = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    draft: 'bg-yellow-100 text-yellow-800'
  };
  return classes[props.product.status];
});

const statusLabel = computed(() => {
  const labels = {
    active: 'Ativo',
    inactive: 'Inativo',
    draft: 'Rascunho'
  };
  return labels[props.product.status];
});

// Methods
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const handleView = (): void => {
  emit('view', props.product);
  showMenu.value = false;
};

const handleEdit = (): void => {
  emit('edit', props.product);
  showMenu.value = false;
};

const handleDelete = (): void => {
  emit('delete', props.product);
  showMenu.value = false;
};

const handleDuplicate = (): void => {
  emit('duplicate', props.product);
  showMenu.value = false;
};

const handleToggleStatus = (): void => {
  emit('toggle-status', props.product);
  showMenu.value = false;
};

const handleManageVariants = (): void => {
  emit('manage-variants', props.product);
  showMenu.value = false;
};

const toggleFavorite = (): void => {
  emit('toggle-favorite', props.product);
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

.aspect-w-16 {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
}

.aspect-w-16 > * {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>