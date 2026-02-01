<template>
  <div class="variants-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 shadow-xl max-h-screen overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Gerenciar Variantes: {{ product?.name }}</h2>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Add Variant Form -->
      <div class="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 class="font-medium mb-3">Nova Variante</h3>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              v-model="newVariant.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 20 páginas"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Preço</label>
            <input
              v-model="newVariant.price"
              type="number"
              step="0.01"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            >
          </div>
        </div>
        <button
          @click="addVariant"
          class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Adicionar Variante
        </button>
      </div>

      <!-- Existing Variants -->
      <div class="space-y-3">
        <h3 class="font-medium">Variantes Existentes</h3>
        <div
          v-for="(variant, index) in variants"
          :key="index"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div>
            <div class="font-medium">{{ variant.name }}</div>
            <div class="text-sm text-gray-500">{{ formatCurrency(variant.price) }}</div>
          </div>
          <button
            @click="removeVariant(index)"
            class="text-red-600 hover:text-red-800"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="flex justify-end space-x-3 mt-6">
        <button
          @click="$emit('close')"
          class="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="handleSave"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  product: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  save: [variants: any[]];
  close: [];
}>();

const variants = ref<any[]>([]);
const newVariant = ref({
  name: '',
  price: 0
});

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const addVariant = (): void => {
  if (newVariant.value.name && newVariant.value.price > 0) {
    variants.value.push({
      id: Date.now().toString(),
      name: newVariant.value.name,
      price: newVariant.value.price
    });
    
    newVariant.value = { name: '', price: 0 };
  }
};

const removeVariant = (index: number): void => {
  variants.value.splice(index, 1);
};

const handleSave = (): void => {
  emit('save', variants.value);
  emit('close');
};

onMounted(() => {
  if (props.product?.variants) {
    variants.value = [...props.product.variants];
  }
});
</script>