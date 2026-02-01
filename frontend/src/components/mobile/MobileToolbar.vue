<template>
  <div class="mobile-toolbar" :class="toolbarClasses">
    <!-- Ferramentas principais -->
    <div class="toolbar-section toolbar-main">
      <button
        v-for="tool in mainTools"
        :key="tool.id"
        class="toolbar-button"
        :class="{ 'toolbar-button--active': activeTool === tool.id }"
        @click="handleToolClick(tool.id)"
        @touchstart="handleTouchStart"
      >
        <i :class="tool.icon" />
        <span class="toolbar-button-label">{{ tool.label }}</span>
      </button>
    </div>

    <!-- Separador -->
    <div class="toolbar-separator" />

    <!-- Ações de objeto -->
    <div class="toolbar-section toolbar-actions">
      <button
        v-for="action in objectActions"
        :key="action.id"
        class="toolbar-button toolbar-button--action"
        :disabled="action.disabled"
        @click="handleActionClick(action.id)"
        @touchstart="handleTouchStart"
      >
        <i :class="action.icon" />
        <span class="toolbar-button-label">{{ action.label }}</span>
      </button>
    </div>

    <!-- Menu expandido -->
    <Transition name="slide-up">
      <div v-if="showExpandedMenu" class="expanded-menu">
        <div class="expanded-menu-content">
          <!-- Formas -->
          <div v-if="activeTool === 'shape'" class="tool-options">
            <h4>Formas</h4>
            <div class="shape-grid">
              <button
                v-for="shape in shapes"
                :key="shape.id"
                class="shape-button"
                @click="handleShapeSelect(shape.id)"
              >
                <i :class="shape.icon" />
                <span>{{ shape.label }}</span>
              </button>
            </div>
          </div>

          <!-- Texto -->
          <div v-if="activeTool === 'text'" class="tool-options">
            <h4>Texto</h4>
            <div class="text-options">
              <button class="option-button" @click="addText('heading')">
                <i class="fas fa-heading" />
                <span>Título</span>
              </button>
              <button class="option-button" @click="addText('body')">
                <i class="fas fa-font" />
                <span>Texto</span>
              </button>
              <button class="option-button" @click="addText('caption')">
                <i class="fas fa-text-height" />
                <span>Legenda</span>
              </button>
            </div>
          </div>

          <!-- Propriedades do objeto selecionado -->
          <div v-if="selectedObject && showObjectProperties" class="tool-options">
            <h4>Propriedades</h4>
            <div class="property-controls">
              <!-- Cor -->
              <div class="property-group">
                <label>Cor</label>
                <div class="color-picker">
                  <input
                    type="color"
                    :value="objectColor"
                    @input="updateObjectColor"
                  />
                  <div class="color-presets">
                    <button
                      v-for="color in colorPresets"
                      :key="color"
                      class="color-preset"
                      :style="{ backgroundColor: color }"
                      @click="setObjectColor(color)"
                    />
                  </div>
                </div>
              </div>

              <!-- Opacidade -->
              <div class="property-group">
                <label>Opacidade</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  :value="objectOpacity"
                  @input="updateObjectOpacity"
                  class="opacity-slider"
                />
              </div>

              <!-- Tamanho (para texto) -->
              <div v-if="isTextObject" class="property-group">
                <label>Tamanho</label>
                <input
                  type="range"
                  min="8"
                  max="72"
                  :value="fontSize"
                  @input="updateFontSize"
                  class="size-slider"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Botão para fechar menu -->
        <button class="close-menu-button" @click="closeExpandedMenu">
          <i class="fas fa-times" />
        </button>
      </div>
    </Transition>

    <!-- Indicador de toque -->
    <div
      v-if="showTouchIndicator"
      class="touch-indicator"
      :style="touchIndicatorStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useResponsive } from '../../composables/useResponsive';
import { usePerformance } from '../../composables/usePerformance';

// Props
interface Props {
  activeTool: string;
  selectedObject?: any;
}

const props = defineProps<Props>();

// Emits
const emit = defineEmits<{
  toolChange: [tool: string];
  addText: [type?: string];
  addImage: [];
  addShape: [shape: string];
  deleteObject: [];
  updateProperties: [properties: any];
}>();

// Composables
const { isMobile, isTablet } = useResponsive();
const { debounce } = usePerformance();

// Estado local
const showExpandedMenu = ref(false);
const showObjectProperties = ref(false);
const showTouchIndicator = ref(false);
const touchIndicatorPosition = ref({ x: 0, y: 0 });

// Configuração de ferramentas
const mainTools = [
  { id: 'select', icon: 'fas fa-mouse-pointer', label: 'Selecionar' },
  { id: 'text', icon: 'fas fa-font', label: 'Texto' },
  { id: 'image', icon: 'fas fa-image', label: 'Imagem' },
  { id: 'shape', icon: 'fas fa-shapes', label: 'Formas' },
];

const shapes = [
  { id: 'rectangle', icon: 'fas fa-square', label: 'Retângulo' },
  { id: 'circle', icon: 'fas fa-circle', label: 'Círculo' },
  { id: 'triangle', icon: 'fas fa-play', label: 'Triângulo' },
  { id: 'star', icon: 'fas fa-star', label: 'Estrela' },
  { id: 'heart', icon: 'fas fa-heart', label: 'Coração' },
  { id: 'arrow', icon: 'fas fa-arrow-right', label: 'Seta' },
];

const colorPresets = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
];

// Computed properties
const toolbarClasses = computed(() => [
  'mobile-toolbar',
  {
    'mobile-toolbar--mobile': isMobile.value,
    'mobile-toolbar--tablet': isTablet.value,
    'mobile-toolbar--expanded': showExpandedMenu.value,
  },
]);

const objectActions = computed(() => [
  {
    id: 'properties',
    icon: 'fas fa-cog',
    label: 'Propriedades',
    disabled: !props.selectedObject,
  },
  {
    id: 'duplicate',
    icon: 'fas fa-copy',
    label: 'Duplicar',
    disabled: !props.selectedObject,
  },
  {
    id: 'delete',
    icon: 'fas fa-trash',
    label: 'Excluir',
    disabled: !props.selectedObject,
  },
]);

const isTextObject = computed(() => {
  return props.selectedObject?.type === 'i-text' || props.selectedObject?.type === 'text';
});

const objectColor = computed(() => {
  return props.selectedObject?.fill || '#000000';
});

const objectOpacity = computed(() => {
  return props.selectedObject?.opacity || 1;
});

const fontSize = computed(() => {
  return props.selectedObject?.fontSize || 20;
});

const touchIndicatorStyle = computed(() => ({
  left: `${touchIndicatorPosition.value.x}px`,
  top: `${touchIndicatorPosition.value.y}px`,
}));

// Métodos
const handleToolClick = (toolId: string): void => {
  if (props.activeTool === toolId && (toolId === 'text' || toolId === 'shape')) {
    // Toggle expanded menu for tools with options
    showExpandedMenu.value = !showExpandedMenu.value;
  } else {
    emit('toolChange', toolId);
    
    // Handle immediate actions
    if (toolId === 'image') {
      emit('addImage');
    } else if (toolId === 'text' || toolId === 'shape') {
      showExpandedMenu.value = true;
    } else {
      showExpandedMenu.value = false;
    }
  }
};

const handleActionClick = (actionId: string): void => {
  switch (actionId) {
    case 'properties':
      showObjectProperties.value = !showObjectProperties.value;
      showExpandedMenu.value = showObjectProperties.value;
      break;
    case 'duplicate':
      duplicateObject();
      break;
    case 'delete':
      emit('deleteObject');
      break;
  }
};

const handleShapeSelect = (shapeId: string): void => {
  emit('addShape', shapeId);
  closeExpandedMenu();
};

const addText = (type?: string): void => {
  emit('addText', type);
  closeExpandedMenu();
};

const duplicateObject = (): void => {
  if (!props.selectedObject) return;
  
  // Clone object with offset
  const cloned = { ...props.selectedObject };
  cloned.left = (cloned.left || 0) + 20;
  cloned.top = (cloned.top || 0) + 20;
  
  emit('updateProperties', cloned);
};

const closeExpandedMenu = (): void => {
  showExpandedMenu.value = false;
  showObjectProperties.value = false;
};

// Property update handlers
const updateObjectColor = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  setObjectColor(target.value);
};

const setObjectColor = (color: string): void => {
  emit('updateProperties', { fill: color });
};

const updateObjectOpacity = debounce((event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('updateProperties', { opacity: parseFloat(target.value) });
}, 100);

const updateFontSize = debounce((event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('updateProperties', { fontSize: parseInt(target.value) });
}, 100);

// Touch feedback
const handleTouchStart = (event: TouchEvent): void => {
  if (!isMobile.value) return;
  
  const touch = event.touches[0];
  touchIndicatorPosition.value = {
    x: touch.clientX,
    y: touch.clientY,
  };
  
  showTouchIndicator.value = true;
  
  setTimeout(() => {
    showTouchIndicator.value = false;
  }, 200);
};

// Watch for tool changes
watch(() => props.activeTool, (newTool) => {
  if (newTool !== 'text' && newTool !== 'shape') {
    showExpandedMenu.value = false;
  }
});

// Watch for object selection changes
watch(() => props.selectedObject, (newObject) => {
  if (!newObject) {
    showObjectProperties.value = false;
    showExpandedMenu.value = false;
  }
});
</script>

<style scoped>
.mobile-toolbar {
  display: flex;
  align-items: center;
  background: white;
  border-top: 1px solid #e0e0e0;
  padding: 8px 16px;
  min-height: 60px;
  position: relative;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-main {
  flex: 1;
}

.toolbar-actions {
  flex-shrink: 0;
}

.toolbar-separator {
  width: 1px;
  height: 32px;
  background: #e0e0e0;
  margin: 0 12px;
}

.toolbar-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 60px;
  position: relative;
}

.toolbar-button:hover {
  background: #f5f5f5;
}

.toolbar-button--active {
  background: #2563eb;
  color: white;
}

.toolbar-button--action {
  min-width: 48px;
}

.toolbar-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar-button i {
  font-size: 18px;
  margin-bottom: 2px;
}

.toolbar-button-label {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  line-height: 1;
}

/* Expanded menu */
.expanded-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  max-height: 300px;
  overflow-y: auto;
}

.expanded-menu-content {
  padding: 20px;
}

.close-menu-button {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.close-menu-button:hover {
  background: #e0e0e0;
}

.tool-options h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a202c;
}

/* Shape grid */
.shape-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 12px;
}

.shape-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.shape-button:hover {
  border-color: #2563eb;
  background: #f8faff;
}

.shape-button i {
  font-size: 24px;
  margin-bottom: 8px;
  color: #4a5568;
}

.shape-button span {
  font-size: 12px;
  color: #4a5568;
}

/* Text options */
.text-options {
  display: flex;
  gap: 12px;
}

.option-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
}

.option-button:hover {
  border-color: #2563eb;
  background: #f8faff;
}

.option-button i {
  font-size: 20px;
  margin-bottom: 4px;
  color: #4a5568;
}

.option-button span {
  font-size: 12px;
  color: #4a5568;
}

/* Property controls */
.property-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-group label {
  font-size: 14px;
  font-weight: 500;
  color: #4a5568;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker input[type="color"] {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.color-presets {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.color-preset {
  width: 24px;
  height: 24px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.color-preset:hover {
  transform: scale(1.1);
}

.opacity-slider,
.size-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e0e0e0;
  outline: none;
  cursor: pointer;
}

.opacity-slider::-webkit-slider-thumb,
.size-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
}

/* Touch indicator */
.touch-indicator {
  position: fixed;
  width: 40px;
  height: 40px;
  border: 2px solid #2563eb;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.2);
  pointer-events: none;
  z-index: 1000;
  animation: touch-ripple 0.2s ease-out;
  transform: translate(-50%, -50%);
}

@keyframes touch-ripple {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

/* Transitions */
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

/* Mobile specific */
@media (max-width: 768px) {
  .mobile-toolbar {
    padding: 6px 12px;
    min-height: 56px;
  }
  
  .toolbar-button {
    padding: 6px 8px;
    min-width: 50px;
  }
  
  .toolbar-button i {
    font-size: 16px;
  }
  
  .toolbar-button-label {
    font-size: 9px;
  }
  
  .expanded-menu-content {
    padding: 16px;
  }
  
  .shape-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Landscape mobile */
@media (orientation: landscape) and (max-height: 500px) {
  .mobile-toolbar {
    min-height: 48px;
  }
  
  .toolbar-button-label {
    display: none;
  }
  
  .expanded-menu {
    max-height: 200px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .toolbar-button:hover {
    background: transparent;
  }
  
  .toolbar-button:active {
    background: #f5f5f5;
    transform: scale(0.95);
  }
  
  .shape-button:hover,
  .option-button:hover {
    border-color: #e0e0e0;
    background: white;
  }
  
  .shape-button:active,
  .option-button:active {
    border-color: #2563eb;
    background: #f8faff;
    transform: scale(0.95);
  }
}
</style>