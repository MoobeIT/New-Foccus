<template>
  <div id="app">
    <router-view />
    <NotificationToast />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'
import NotificationToast from './components/common/NotificationToast.vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.initialize()
})
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import './assets/styles/design-system.css';

#app {
  min-height: 100vh;
}

/* Garantir que inputs tenham texto escuro em fundo claro */
input,
select,
textarea {
  color: var(--gray-900) !important;
  background-color: white !important;
  -webkit-text-fill-color: var(--gray-900) !important;
}

input::placeholder,
textarea::placeholder {
  color: var(--gray-400) !important;
  -webkit-text-fill-color: var(--gray-400) !important;
}

select option {
  color: var(--gray-900) !important;
  background-color: white !important;
}

/* Scrollbar personalizada */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--gray-100);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb {
  background: var(--gray-300);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--gray-400);
}

/* Animações suaves */
* {
  transition: color var(--transition-fast), 
              background-color var(--transition-fast), 
              border-color var(--transition-fast);
}

/* Focus ring personalizado */
*:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
</style>
