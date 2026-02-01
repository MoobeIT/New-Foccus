<template>
  <div class="template-preview-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 shadow-xl max-h-screen overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Preview: {{ template?.name }}</h2>
        <button
          @click="$emit('close')"
          class="text-gray-500 hover:text-gray-700"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="bg-gray-100 rounded-lg p-8 text-center">
        <div class="w-full h-96 bg-white rounded-lg shadow-sm flex items-center justify-center">
          <div class="text-center text-gray-500">
            <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <p class="text-lg font-medium">Preview do Template</p>
            <p class="text-sm">{{ template?.name }}</p>
          </div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <strong>Categoria:</strong> {{ template?.category }}
        </div>
        <div>
          <strong>Criado em:</strong> {{ formatDate(template?.createdAt) }}
        </div>
        <div class="col-span-2">
          <strong>Descrição:</strong> {{ template?.description || 'Sem descrição' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  template: any;
}

defineProps<Props>();

defineEmits<{
  close: [];
}>();

const formatDate = (date: Date): string => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR');
};
</script>