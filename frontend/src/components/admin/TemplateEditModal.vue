<template>
  <div class="template-edit-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-xl">
      <h2 class="text-xl font-bold mb-4">Editar Template</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Nome</label>
          <input
            v-model="editForm.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
          <select
            v-model="editForm.category"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="geral">Geral</option>
            <option value="familia">Família</option>
            <option value="casamento">Casamento</option>
            <option value="criativo">Criativo</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Descrição</label>
          <textarea
            v-model="editForm.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
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
  template: any;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  save: [template: any];
  close: [];
}>();

const editForm = ref({
  name: '',
  category: 'geral',
  description: ''
});

const handleSave = (): void => {
  emit('save', { ...props.template, ...editForm.value });
  emit('close');
};

onMounted(() => {
  if (props.template) {
    editForm.value = {
      name: props.template.name || '',
      category: props.template.category || 'geral',
      description: props.template.description || ''
    };
  }
});
</script>