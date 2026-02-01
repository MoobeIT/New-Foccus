<template>
  <div class="template-upload-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl">
      <h2 class="text-xl font-bold mb-4">Upload de Template</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nome do Template</label>
          <input
            v-model="templateName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Digite o nome do template"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Arquivo do Template</label>
          <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-gray-600">Clique para selecionar ou arraste o arquivo aqui</p>
            <input type="file" class="hidden" accept=".json,.zip">
          </div>
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
          @click="handleUpload"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  upload: [template: any];
  close: [];
}>();

const templateName = ref('');

const handleUpload = (): void => {
  // Mock upload
  const mockTemplate = {
    id: Date.now().toString(),
    name: templateName.value || 'Novo Template',
    category: 'geral',
    createdAt: new Date()
  };
  
  emit('upload', mockTemplate);
  emit('close');
};
</script>