<template>
  <header class="mobile-header" :class="headerClasses">
    <!-- Botão de menu/voltar -->
    <button class="header-button header-back" @click="handleBack">
      <i class="fas fa-arrow-left" />
    </button>

    <!-- Título do projeto -->
    <div class="header-title">
      <h1 class="project-name">{{ projectName }}</h1>
      <div class="project-status">
        <span v-if="isSaving" class="status-saving">
          <i class="fas fa-spinner fa-spin" />
          Salvando...
        </span>
        <span v-else class="status-saved">
          <i class="fas fa-check" />
          Salvo
        </span>
      </div>
    </div>

    <!-- Controles de zoom -->
    <div class="header-zoom">
      <button 
        class="zoom-button" 
        @click="$emit('zoom-out')"
        :disabled="zoomLevel <= 0.1"
      >
        <i class="fas fa-search-minus" />
      </button>
      
      <span class="zoom-level">{{ zoomPercentage }}%</span>
      
      <button 
        class="zoom-button" 
        @click="$emit('zoom-in')"
        :disabled="zoomLevel >= 5"
      >
        <i class="fas fa-search-plus" />
      </button>
      
      <button class="zoom-button" @click="$emit('fit-to-screen')">
        <i class="fas fa-expand-arrows-alt" />
      </button>
    </div>

    <!-- Ações principais -->
    <div class="header-actions">
      <button class="header-button" @click="$emit('undo')">
        <i class="fas fa-undo" />
      </button>
      
      <button class="header-button" @click="$emit('redo')">
        <i class="fas fa-redo" />
      </button>
      
      <button 
        class="header-button header-save" 
        @click="$emit('save')"
        :disabled="isSaving"
      >
        <i class="fas fa-save" />
      </button>
      
      <button class="header-button header-menu" @click="toggleMenu">
        <i class="fas fa-ellipsis-v" />
      </button>
    </div>

    <!-- Menu dropdown -->
    <Transition name="fade">
      <div v-if="showMenu" class="header-menu-dropdown">
        <div class="menu-overlay" @click="closeMenu" />
        <div class="menu-content">
          <button class="menu-item" @click="handleExport">
            <i class="fas fa-download" />
            <span>Exportar</span>
          </button>
          
          <button class="menu-item" @click="handleShare">
            <i class="fas fa-share" />
            <span>Compartilhar</span>
          </button>
          
          <button class="menu-item" @click="handleDuplicate">
            <i class="fas fa-copy" />
            <span>Duplicar</span>
          </button>
          
          <div class="menu-separator" />
          
          <button class="menu-item" @click="handleSettings">
            <i class="fas fa-cog" />
            <span>Configurações</span>
          </button>
          
          <button class="menu-item menu-item--danger" @click="handleDelete">
            <i class="fas fa-trash" />
            <span>Excluir Projeto</span>
          </button>
        </div>
      </div>
    </Transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useResponsive } from '../../composables/useResponsive';
import { useRouter } from 'vue-router';

// Props
interface Props {
  project?: any;
  isSaving?: boolean;
  zoomLevel?: number;
}

const props = withDefaults(defineProps<Props>(), {
  isSaving: false,
  zoomLevel: 1,
});

// Emits
const emit = defineEmits<{
  save: [];
  undo: [];
  redo: [];
  'zoom-in': [];
  'zoom-out': [];
  'fit-to-screen': [];
}>();

// Composables
const { isMobile, isTablet } = useResponsive();
const router = useRouter();

// Estado local
const showMenu = ref(false);

// Computed properties
const headerClasses = computed(() => [
  'mobile-header',
  {
    'mobile-header--mobile': isMobile.value,
    'mobile-header--tablet': isTablet.value,
    'mobile-header--menu-open': showMenu.value,
  },
]);

const projectName = computed(() => {
  return props.project?.name || 'Novo Projeto';
});

const zoomPercentage = computed(() => {
  return Math.round(props.zoomLevel * 100);
});

// Métodos
const handleBack = (): void => {
  router.back();
};

const toggleMenu = (): void => {
  showMenu.value = !showMenu.value;
};

const closeMenu = (): void => {
  showMenu.value = false;
};

const handleExport = (): void => {
  // Implementar exportação
  console.log('Export project');
  closeMenu();
};

const handleShare = (): void => {
  // Implementar compartilhamento
  if (navigator.share) {
    navigator.share({
      title: projectName.value,
      text: 'Confira meu projeto no Editor!',
      url: window.location.href,
    });
  }
  closeMenu();
};

const handleDuplicate = (): void => {
  // Implementar duplicação
  console.log('Duplicate project');
  closeMenu();
};

const handleSettings = (): void => {
  // Abrir configurações
  console.log('Open settings');
  closeMenu();
};

const handleDelete = (): void => {
  // Confirmar e excluir projeto
  if (confirm('Tem certeza que deseja excluir este projeto?')) {
    console.log('Delete project');
  }
  closeMenu();
};
</script>

<style scoped>
.mobile-header {
  display: flex;
  align-items: center;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 8px 16px;
  min-height: 60px;
  position: relative;
  z-index: 200;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a5568;
}

.header-button:hover {
  background: #f5f5f5;
}

.header-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.header-back {
  margin-right: 12px;
}

.header-title {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 0 12px;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
  line-height: 1.2;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-status {
  font-size: 12px;
  color: #4a5568;
  margin-top: 2px;
}

.status-saving {
  color: #f59e0b;
}

.status-saved {
  color: #10b981;
}

.status-saving i,
.status-saved i {
  margin-right: 4px;
}

.header-zoom {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 12px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 4px;
}

.zoom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  color: #4a5568;
}

.zoom-button:hover {
  background: white;
}

.zoom-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-level {
  font-size: 12px;
  font-weight: 500;
  color: #4a5568;
  min-width: 40px;
  text-align: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-save {
  background: #2563eb;
  color: white;
}

.header-save:hover {
  background: #1d4ed8;
}

.header-save:disabled {
  background: #9ca3af;
}

.header-menu {
  margin-left: 8px;
}

/* Menu dropdown */
.header-menu-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
}

.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  z-index: -1;
}

.menu-content {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 180px;
  margin-top: 8px;
  margin-right: 16px;
}

.menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
  color: #4a5568;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item--danger {
  color: #dc2626;
}

.menu-item--danger:hover {
  background: #fef2f2;
}

.menu-item i {
  margin-right: 12px;
  width: 16px;
  text-align: center;
}

.menu-separator {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile specific */
@media (max-width: 768px) {
  .mobile-header {
    padding: 6px 12px;
    min-height: 56px;
  }
  
  .header-button {
    width: 36px;
    height: 36px;
  }
  
  .project-name {
    font-size: 14px;
    max-width: 150px;
  }
  
  .project-status {
    font-size: 11px;
  }
  
  .header-zoom {
    display: none; /* Hide zoom controls on very small screens */
  }
  
  .zoom-button {
    width: 28px;
    height: 28px;
  }
  
  .zoom-level {
    font-size: 11px;
    min-width: 35px;
  }
}

/* Landscape mobile */
@media (orientation: landscape) and (max-height: 500px) {
  .mobile-header {
    min-height: 48px;
    padding: 4px 12px;
  }
  
  .project-status {
    display: none;
  }
  
  .header-zoom {
    margin-right: 8px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .header-button:hover,
  .zoom-button:hover,
  .menu-item:hover {
    background: transparent;
  }
  
  .header-button:active {
    background: #f5f5f5;
    transform: scale(0.95);
  }
  
  .zoom-button:active {
    background: white;
    transform: scale(0.95);
  }
  
  .menu-item:active {
    background: #f5f5f5;
  }
  
  .menu-item--danger:active {
    background: #fef2f2;
  }
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .mobile-header {
    border-bottom-width: 0.5px;
  }
}

/* Safe area insets for notched devices */
@supports (padding: max(0px)) {
  .mobile-header {
    padding-left: max(16px, env(safe-area-inset-left));
    padding-right: max(16px, env(safe-area-inset-right));
  }
  
  @media (max-width: 768px) {
    .mobile-header {
      padding-left: max(12px, env(safe-area-inset-left));
      padding-right: max(12px, env(safe-area-inset-right));
    }
  }
}
</style>