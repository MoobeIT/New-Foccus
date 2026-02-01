<template>
  <div class="loading-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-xl">
      <!-- Spinner -->
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      
      <!-- Loading Text -->
      <div>
        <p class="text-lg font-medium text-gray-900">{{ title }}</p>
        <p v-if="message" class="text-sm text-gray-500">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'Carregando...',
  message: ''
});
</script>

<style scoped>
.loading-overlay {
  backdrop-filter: blur(2px);
}
</style>