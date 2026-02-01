<template>
  <div 
    ref="editorContainer"
    class="mobile-editor"
    :class="editorClasses"
  >
    <!-- Header móvel -->
    <MobileHeader
      :project="project"
      :is-saving="isSaving"
      :zoom-level="zoomLevel"
      @save="handleSave"
      @undo="handleUndo"
      @redo="handleRedo"
      @zoom-in="handleZoomIn"
      @zoom-out="handleZoomOut"
      @fit-to-screen="handleFitToScreen"
    />

    <!-- Canvas principal -->
    <div class="editor-canvas-container">
      <div 
        ref="canvasWrapper"
        class="canvas-wrapper"
        :style="canvasStyle"
      >
        <canvas
          ref="fabricCanvas"
          class="fabric-canvas"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        />
        
        <!-- Overlay para gestos -->
        <div 
          class="gesture-overlay"
          @touchstart="onGestureStart"
          @touchmove="onGestureMove"
          @touchend="onGestureEnd"
        />
      </div>
    </div>

    <!-- Toolbar móvel -->
    <MobileToolbar
      :active-tool="activeTool"
      :selected-object="selectedObject"
      @tool-change="handleToolChange"
      @add-text="handleAddText"
      @add-image="handleAddImage"
      @add-shape="handleAddShape"
      @delete-object="handleDeleteObject"
    />

    <!-- Painel de propriedades deslizante -->
    <MobilePropertiesPanel
      v-model:visible="showPropertiesPanel"
      :selected-object="selectedObject"
      @update-properties="handleUpdateProperties"
    />

    <!-- Galeria de assets -->
    <MobileAssetGallery
      v-model:visible="showAssetGallery"
      @asset-selected="handleAssetSelected"
    />

    <!-- Indicadores de performance -->
    <PerformanceIndicator
      v-if="showPerformanceIndicator"
      :metrics="performanceMetrics"
      :suggestions="performanceSuggestions"
    />

    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Carregando...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { fabric } from 'fabric';
import { useTouch } from '../../composables/useTouch';
import { useResponsive } from '../../composables/useResponsive';
import { usePerformance } from '../../composables/usePerformance';
import MobileHeader from './MobileHeader.vue';
import MobileToolbar from './MobileToolbar.vue';
import MobilePropertiesPanel from './MobilePropertiesPanel.vue';
import MobileAssetGallery from './MobileAssetGallery.vue';
import PerformanceIndicator from './PerformanceIndicator.vue';

// Props
interface Props {
  project?: any;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

// Emits
const emit = defineEmits<{
  save: [project: any];
  change: [project: any];
  error: [error: Error];
}>();

// Composables
const { isMobile, isTablet, viewport, deviceInfo } = useResponsive();
const { 
  metrics: performanceMetrics, 
  suggestions: performanceSuggestions,
  startRenderMeasurement,
  endRenderMeasurement,
  measureInteraction,
  debounce,
  throttle,
} = usePerformance();

// Refs
const editorContainer = ref<HTMLElement>();
const canvasWrapper = ref<HTMLElement>();
const fabricCanvas = ref<HTMLCanvasElement>();

// Estado do editor
const canvas = ref<fabric.Canvas>();
const zoomLevel = ref(1);
const activeTool = ref<'select' | 'text' | 'image' | 'shape'>('select');
const selectedObject = ref<fabric.Object | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);

// Estado da interface
const showPropertiesPanel = ref(false);
const showAssetGallery = ref(false);
const showPerformanceIndicator = ref(false);

// Configuração de gestos
const { emit: touchEmit } = useTouch(canvasWrapper, {
  enablePan: true,
  enablePinch: true,
  enableRotate: false,
  enableSwipe: true,
  threshold: {
    tap: 10,
    pan: 5,
    pinch: 0.1,
    swipe: 50,
  },
});

// Computed properties
const editorClasses = computed(() => [
  'mobile-editor',
  {
    'mobile-editor--mobile': isMobile.value,
    'mobile-editor--tablet': isTablet.value,
    'mobile-editor--portrait': viewport.value.height > viewport.value.width,
    'mobile-editor--landscape': viewport.value.width >= viewport.value.height,
    'mobile-editor--touch': deviceInfo.value.touchSupport,
    'mobile-editor--readonly': props.readonly,
  },
]);

const canvasStyle = computed(() => ({
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: 'center center',
}));

// Canvas management
const initializeCanvas = async (): Promise<void> => {
  if (!fabricCanvas.value) return;

  startRenderMeasurement();

  try {
    canvas.value = new fabric.Canvas(fabricCanvas.value, {
      width: viewport.value.width,
      height: viewport.value.height - 120, // Account for header and toolbar
      backgroundColor: '#ffffff',
      selection: !props.readonly,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      skipTargetFind: false,
    });

    // Configurar eventos do canvas
    setupCanvasEvents();

    // Carregar projeto se fornecido
    if (props.project) {
      await loadProject(props.project);
    }

    // Ajustar zoom inicial
    handleFitToScreen();

  } catch (error) {
    console.error('Erro ao inicializar canvas:', error);
    emit('error', error as Error);
  } finally {
    endRenderMeasurement();
  }
};

const setupCanvasEvents = (): void => {
  if (!canvas.value) return;

  // Seleção de objetos
  canvas.value.on('selection:created', (e) => {
    selectedObject.value = e.selected?.[0] || null;
    if (selectedObject.value && isMobile.value) {
      showPropertiesPanel.value = true;
    }
  });

  canvas.value.on('selection:updated', (e) => {
    selectedObject.value = e.selected?.[0] || null;
  });

  canvas.value.on('selection:cleared', () => {
    selectedObject.value = null;
    showPropertiesPanel.value = false;
  });

  // Modificações de objetos
  canvas.value.on('object:modified', debounce(() => {
    handleCanvasChange();
  }, 300));

  canvas.value.on('object:added', () => {
    handleCanvasChange();
  });

  canvas.value.on('object:removed', () => {
    handleCanvasChange();
  });

  // Performance monitoring
  canvas.value.on('before:render', () => {
    startRenderMeasurement();
  });

  canvas.value.on('after:render', () => {
    endRenderMeasurement();
  });
};

const loadProject = async (project: any): Promise<void> => {
  if (!canvas.value || !project.data) return;

  isLoading.value = true;

  try {
    await new Promise<void>((resolve, reject) => {
      canvas.value!.loadFromJSON(project.data, () => {
        canvas.value!.renderAll();
        resolve();
      }, (error: any) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Erro ao carregar projeto:', error);
    emit('error', error as Error);
  } finally {
    isLoading.value = false;
  }
};

// Gesture handlers
const onGestureStart = (event: TouchEvent): void => {
  const startTime = performance.now();
  
  touchEmit('panStart', {
    x: event.touches[0].clientX,
    y: event.touches[0].clientY,
  });
};

const onGestureMove = throttle((event: TouchEvent) => {
  if (!canvas.value) return;

  const touch = event.touches[0];
  const rect = canvasWrapper.value?.getBoundingClientRect();
  
  if (rect) {
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    touchEmit('pan', {
      deltaX: x,
      deltaY: y,
      velocity: { x: 0, y: 0 },
    });
  }
}, 16); // 60fps

const onGestureEnd = (event: TouchEvent): void => {
  const endTime = performance.now();
  measureInteraction(endTime - 100); // Approximate start time
  
  touchEmit('panEnd', {
    x: event.changedTouches[0].clientX,
    y: event.changedTouches[0].clientY,
    velocity: { x: 0, y: 0 },
  });
};

// Touch event handlers
const handleTouchStart = (event: TouchEvent): void => {
  if (event.touches.length === 2) {
    // Pinch gesture
    event.preventDefault();
  }
};

const handleTouchMove = (event: TouchEvent): void => {
  if (event.touches.length === 2) {
    // Handle pinch zoom
    event.preventDefault();
    handlePinchZoom(event);
  }
};

const handleTouchEnd = (event: TouchEvent): void => {
  // Handle tap gestures
  if (event.changedTouches.length === 1 && event.touches.length === 0) {
    const touch = event.changedTouches[0];
    handleTap(touch.clientX, touch.clientY);
  }
};

const handlePinchZoom = (event: TouchEvent): void => {
  if (!canvas.value || event.touches.length !== 2) return;

  const touch1 = event.touches[0];
  const touch2 = event.touches[1];
  
  const distance = Math.sqrt(
    Math.pow(touch2.clientX - touch1.clientX, 2) +
    Math.pow(touch2.clientY - touch1.clientY, 2)
  );

  // Store initial distance on first pinch
  if (!canvas.value.getContext('pinchDistance')) {
    canvas.value.getContext('pinchDistance', distance);
    return;
  }

  const initialDistance = canvas.value.getContext('pinchDistance');
  const scale = distance / initialDistance;
  
  setZoomLevel(zoomLevel.value * scale);
};

const handleTap = (x: number, y: number): void => {
  if (!canvas.value) return;

  const pointer = canvas.value.getPointer({ clientX: x, clientY: y } as any);
  const target = canvas.value.findTarget({ clientX: x, clientY: y } as any, false);

  if (target) {
    canvas.value.setActiveObject(target);
    canvas.value.renderAll();
  } else {
    canvas.value.discardActiveObject();
    canvas.value.renderAll();
  }
};

// Tool handlers
const handleToolChange = (tool: string): void => {
  activeTool.value = tool as any;
  
  if (canvas.value) {
    canvas.value.isDrawingMode = tool === 'draw';
    canvas.value.selection = tool === 'select';
  }
};

const handleAddText = (): void => {
  if (!canvas.value) return;

  const text = new fabric.IText('Clique para editar', {
    left: viewport.value.width / 2,
    top: viewport.value.height / 2,
    fontSize: isMobile.value ? 24 : 20,
    fontFamily: 'Arial',
    fill: '#000000',
  });

  canvas.value.add(text);
  canvas.value.setActiveObject(text);
  canvas.value.renderAll();
};

const handleAddImage = (): void => {
  showAssetGallery.value = true;
};

const handleAddShape = (shape: string): void => {
  if (!canvas.value) return;

  let object: fabric.Object;

  switch (shape) {
    case 'rectangle':
      object = new fabric.Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#ff0000',
      });
      break;
    case 'circle':
      object = new fabric.Circle({
        left: 100,
        top: 100,
        radius: 50,
        fill: '#00ff00',
      });
      break;
    default:
      return;
  }

  canvas.value.add(object);
  canvas.value.setActiveObject(object);
  canvas.value.renderAll();
};

const handleDeleteObject = (): void => {
  if (!canvas.value || !selectedObject.value) return;

  canvas.value.remove(selectedObject.value);
  canvas.value.renderAll();
};

// Zoom handlers
const handleZoomIn = (): void => {
  setZoomLevel(Math.min(zoomLevel.value * 1.2, 5));
};

const handleZoomOut = (): void => {
  setZoomLevel(Math.max(zoomLevel.value / 1.2, 0.1));
};

const handleFitToScreen = (): void => {
  if (!canvas.value || !canvasWrapper.value) return;

  const containerWidth = canvasWrapper.value.clientWidth;
  const containerHeight = canvasWrapper.value.clientHeight;
  const canvasWidth = canvas.value.getWidth();
  const canvasHeight = canvas.value.getHeight();

  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding

  setZoomLevel(scale);
};

const setZoomLevel = (level: number): void => {
  zoomLevel.value = Math.max(0.1, Math.min(5, level));
  
  if (canvas.value) {
    canvas.value.setZoom(zoomLevel.value);
    canvas.value.renderAll();
  }
};

// Project handlers
const handleSave = async (): Promise<void> => {
  if (!canvas.value || isSaving.value) return;

  isSaving.value = true;

  try {
    const projectData = {
      ...props.project,
      data: canvas.value.toJSON(),
      lastModified: Date.now(),
    };

    emit('save', projectData);
  } catch (error) {
    console.error('Erro ao salvar projeto:', error);
    emit('error', error as Error);
  } finally {
    isSaving.value = false;
  }
};

const handleUndo = (): void => {
  // Implement undo functionality
  console.log('Undo');
};

const handleRedo = (): void => {
  // Implement redo functionality
  console.log('Redo');
};

const handleCanvasChange = (): void => {
  if (!canvas.value) return;

  const projectData = {
    ...props.project,
    data: canvas.value.toJSON(),
    lastModified: Date.now(),
  };

  emit('change', projectData);
};

// Asset handlers
const handleAssetSelected = (asset: any): void => {
  if (!canvas.value) return;

  fabric.Image.fromURL(asset.url, (img) => {
    // Scale image to fit mobile screen
    const maxWidth = viewport.value.width * 0.8;
    const maxHeight = viewport.value.height * 0.6;
    
    if (img.width! > maxWidth) {
      img.scaleToWidth(maxWidth);
    }
    
    if (img.height! > maxHeight) {
      img.scaleToHeight(maxHeight);
    }

    img.set({
      left: viewport.value.width / 2 - (img.getScaledWidth() / 2),
      top: viewport.value.height / 2 - (img.getScaledHeight() / 2),
    });

    canvas.value!.add(img);
    canvas.value!.setActiveObject(img);
    canvas.value!.renderAll();
  });

  showAssetGallery.value = false;
};

const handleUpdateProperties = (properties: any): void => {
  if (!canvas.value || !selectedObject.value) return;

  selectedObject.value.set(properties);
  canvas.value.renderAll();
  handleCanvasChange();
};

// Resize handler
const handleResize = debounce(() => {
  if (!canvas.value || !fabricCanvas.value) return;

  const newWidth = viewport.value.width;
  const newHeight = viewport.value.height - 120;

  canvas.value.setDimensions({
    width: newWidth,
    height: newHeight,
  });

  canvas.value.renderAll();
}, 300);

// Lifecycle
onMounted(async () => {
  await nextTick();
  await initializeCanvas();
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleResize);
});

onUnmounted(() => {
  if (canvas.value) {
    canvas.value.dispose();
  }
  
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleResize);
});
</script>

<style scoped>
.mobile-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f5f5f5;
  position: relative;
}

.editor-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.fabric-canvas {
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
  touch-action: none;
}

.gesture-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
  touch-action: none;
}

.mobile-editor--mobile .gesture-overlay {
  pointer-events: auto;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .mobile-editor {
    font-size: 14px;
  }
  
  .fabric-canvas {
    border-width: 0;
  }
}

@media (orientation: landscape) and (max-height: 500px) {
  .mobile-editor {
    font-size: 12px;
  }
}

/* Touch-specific styles */
.mobile-editor--touch .fabric-canvas {
  cursor: grab;
}

.mobile-editor--touch .fabric-canvas:active {
  cursor: grabbing;
}

/* Platform-specific adjustments */
.mobile-editor--ios {
  /* iOS specific styles */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
}

.mobile-editor--android {
  /* Android specific styles */
  overscroll-behavior: none;
}
</style>