<template>
  <Transition name="slide-up">
    <div v-if="showPrompt" class="pwa-install-prompt">
      <div class="prompt-content">
        <div class="prompt-icon">
          📱
        </div>
        
        <div class="prompt-text">
          <h3>Instalar Editor PWA</h3>
          <p>Adicione o Editor à sua tela inicial para acesso rápido e experiência nativa</p>
        </div>
        
        <div class="prompt-actions">
          <button 
            class="btn-secondary" 
            @click="dismissPrompt"
          >
            Agora não
          </button>
          <button 
            class="btn-primary" 
            @click="installApp"
            :disabled="installing"
          >
            <span v-if="installing" class="loading-spinner"></span>
            {{ installing ? 'Instalando...' : 'Instalar' }}
          </button>
        </div>
      </div>
      
      <button 
        class="close-button" 
        @click="dismissPrompt"
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePWA } from '../composables/usePWA';

// Props
interface Props {
  autoShow?: boolean;
  showAfterDelay?: number;
  hideAfterDismiss?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoShow: true,
  showAfterDelay: 3000,
  hideAfterDismiss: true,
});

// Emits
const emit = defineEmits<{
  install: [success: boolean];
  dismiss: [];
}>();

// Composables
const { canInstall, installPWA, isInstalled } = usePWA();

// Estado local
const showPrompt = ref(false);
const installing = ref(false);
const dismissed = ref(false);

// Computed
const shouldShow = computed(() => 
  canInstall.value && 
  !isInstalled.value && 
  !dismissed.value &&
  showPrompt.value
);

// Métodos
const installApp = async (): Promise<void> => {
  installing.value = true;
  
  try {
    const success = await installPWA();
    emit('install', success);
    
    if (success) {
      showPrompt.value = false;
    }
  } catch (error) {
    console.error('Erro ao instalar PWA:', error);
    emit('install', false);
  } finally {
    installing.value = false;
  }
};

const dismissPrompt = (): void => {
  showPrompt.value = false;
  dismissed.value = props.hideAfterDismiss;
  emit('dismiss');
  
  // Salvar preferência no localStorage
  if (props.hideAfterDismiss) {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }
};

const checkShouldShow = (): void => {
  // Verificar se foi dispensado recentemente
  const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  if (dismissedTime) {
    const daysSinceDismissed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < 7) { // Não mostrar por 7 dias
      dismissed.value = true;
      return;
    }
  }
  
  // Verificar se deve mostrar automaticamente
  if (props.autoShow && canInstall.value && !isInstalled.value) {
    setTimeout(() => {
      showPrompt.value = true;
    }, props.showAfterDelay);
  }
};

// Lifecycle
onMounted(() => {
  checkShouldShow();
});

// Expor métodos para uso externo
defineExpose({
  show: () => { showPrompt.value = true; },
  hide: () => { showPrompt.value = false; },
  install: installApp,
});
</script>

<style scoped>
.pwa-install-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  max-width: 400px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  border: 1px solid #e2e8f0;
}

.prompt-content {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.prompt-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.prompt-text {
  flex: 1;
}

.prompt-text h3 {
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a202c;
}

.prompt-text p {
  margin: 0;
  font-size: 0.9rem;
  color: #4a5568;
  line-height: 1.4;
}

.prompt-actions {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.btn-primary,
.btn-secondary {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background: #f1f5f9;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-button:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Transições */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Responsivo */
@media (min-width: 640px) {
  .pwa-install-prompt {
    left: auto;
    right: 20px;
    max-width: 380px;
  }
  
  .prompt-actions {
    flex-direction: row;
  }
}

@media (max-width: 480px) {
  .pwa-install-prompt {
    left: 10px;
    right: 10px;
    bottom: 10px;
  }
  
  .prompt-content {
    padding: 16px;
    gap: 12px;
  }
  
  .prompt-icon {
    font-size: 1.5rem;
  }
  
  .prompt-text h3 {
    font-size: 1rem;
  }
  
  .prompt-text p {
    font-size: 0.85rem;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .pwa-install-prompt {
    background: #1f2937;
    border-color: #374151;
  }
  
  .prompt-text h3 {
    color: #f9fafb;
  }
  
  .prompt-text p {
    color: #d1d5db;
  }
  
  .btn-secondary {
    background: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }
  
  .btn-secondary:hover {
    background: #4b5563;
  }
  
  .close-button {
    color: #9ca3af;
  }
  
  .close-button:hover {
    background: #374151;
    color: #d1d5db;
  }
}
</style>