<template>
  <div class="professional-editor">
    <!-- Informações do Formato -->
    <div v-if="selectedFormat" class="format-info">
      <div class="info-card">
        <strong>📐 Formato:</strong> {{ selectedFormat.name }}
      </div>
      <div class="info-card">
        <strong>📏 Dimensões:</strong> {{ selectedFormat.width }}cm × {{ selectedFormat.height }}cm
      </div>
      <div class="info-card">
        <strong>📄 Tipo:</strong> {{ pageTypeLabel }}
      </div>
      <div class="info-card">
        <strong>🎯 Escala:</strong> {{ scale }}%
      </div>
    </div>

    <!-- Toolbar -->
    <div class="editor-toolbar">
      <button type="button" class="tool-btn" @click="addElement('image')" title="Adicionar Imagem">
        🖼️ Imagem
      </button>
      <button type="button" class="tool-btn" @click="addElement('text')" title="Adicionar Texto">
        📝 Texto
      </button>
      <div class="separator"></div>
      <button type="button" class="tool-btn" @click="zoomIn" title="Aumentar Zoom">
        🔍+
      </button>
      <button type="button" class="tool-btn" @click="zoomOut" title="Diminuir Zoom">
        🔍-
      </button>
      <button type="button" class="tool-btn" @click="resetZoom" title="Zoom 100%">
        ↺ 100%
      </button>
      <div class="separator"></div>
      <label class="tool-checkbox">
        <input type="checkbox" v-model="showGrid" />
        Grade
      </label>
      <label class="tool-checkbox">
        <input type="checkbox" v-model="showRulers" />
        Réguas
      </label>
      <label class="tool-checkbox">
        <input type="checkbox" v-model="snapToGrid" />
        Snap
      </label>
    </div>

    <!-- Editor Canvas -->
    <div class="editor-container">
      <!-- Régua Horizontal -->
      <div v-if="showRulers" class="ruler ruler-horizontal">
        <div
          v-for="i in Math.ceil(canvasWidth / 10)"
          :key="`h-${i}`"
          class="ruler-mark"
          :style="{ left: `${i * 10 * pixelsPerMm}px` }"
        >
          <span class="ruler-label">{{ i * 10 }}</span>
        </div>
      </div>

      <!-- Régua Vertical -->
      <div v-if="showRulers" class="ruler ruler-vertical">
        <div
          v-for="i in Math.ceil(canvasHeight / 10)"
          :key="`v-${i}`"
          class="ruler-mark"
          :style="{ top: `${i * 10 * pixelsPerMm}px` }"
        >
          <span class="ruler-label">{{ i * 10 }}</span>
        </div>
      </div>

      <!-- Canvas Principal -->
      <div
        class="canvas-wrapper"
        :style="{ marginLeft: showRulers ? '30px' : '0', marginTop: showRulers ? '30px' : '0' }"
      >
        <div
          ref="canvasRef"
          class="canvas"
          :class="{ 'show-grid': showGrid }"
          :style="{
            width: `${canvasWidth * pixelsPerMm}px`,
            height: `${canvasHeight * pixelsPerMm}px`,
            transform: `scale(${scale / 100})`
          }"
          @click="deselectAll"
        >

          <!-- Elementos -->
          <div
            v-for="(element, index) in elements"
            :key="element.id"
            :class="['element', element.type, { selected: selectedElement === element.id }]"
            :style="{
              left: `${element.x * pixelsPerMm}px`,
              top: `${element.y * pixelsPerMm}px`,
              width: `${element.width * pixelsPerMm}px`,
              height: `${element.height * pixelsPerMm}px`
            }"
            @click.stop="selectElement(element.id)"
            @mousedown="startDrag($event, element)"
          >
            <div class="element-content">
              <span v-if="element.type === 'image'" class="element-icon">🖼️</span>
              <span v-if="element.type === 'text'" class="element-icon">T</span>
              <div class="element-label">
                {{ element.type === 'image' ? 'Imagem' : 'Texto' }}
                <br />
                <small>{{ element.width }}×{{ element.height }}mm</small>
              </div>
            </div>

            <!-- Handles de Redimensionamento -->
            <div v-if="selectedElement === element.id" class="resize-handles">
              <div class="handle nw" @mousedown.stop="startResize($event, element, 'nw')"></div>
              <div class="handle ne" @mousedown.stop="startResize($event, element, 'ne')"></div>
              <div class="handle sw" @mousedown.stop="startResize($event, element, 'sw')"></div>
              <div class="handle se" @mousedown.stop="startResize($event, element, 'se')"></div>
            </div>

            <!-- Botão Remover -->
            <button
              v-if="selectedElement === element.id"
              class="btn-remove"
              @click.stop="removeElement(index)"
              title="Remover"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Propriedades do Elemento Selecionado -->
    <div v-if="selectedElementData" class="properties-panel">
      <h4>
        {{ selectedElementData.type === 'image' ? '🖼️ Propriedades da Imagem' : '📝 Propriedades do Texto' }}
      </h4>

      <div class="property-group">
        <label>Posição</label>
        <div class="property-row">
          <div class="property-field">
            <span>X:</span>
            <input
              v-model.number="selectedElementData.x"
              type="number"
              step="1"
              min="0"
              :max="canvasWidth - selectedElementData.width"
            />
            <span>mm</span>
          </div>
          <div class="property-field">
            <span>Y:</span>
            <input
              v-model.number="selectedElementData.y"
              type="number"
              step="1"
              min="0"
              :max="canvasHeight - selectedElementData.height"
            />
            <span>mm</span>
          </div>
        </div>
      </div>

      <div class="property-group">
        <label>Dimensões</label>
        <div class="property-row">
          <div class="property-field">
            <span>Largura:</span>
            <input
              v-model.number="selectedElementData.width"
              type="number"
              step="1"
              min="10"
              :max="canvasWidth"
            />
            <span>mm</span>
          </div>
          <div class="property-field">
            <span>Altura:</span>
            <input
              v-model.number="selectedElementData.height"
              type="number"
              step="1"
              min="10"
              :max="canvasHeight"
            />
            <span>mm</span>
          </div>
        </div>
      </div>

      <div class="property-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="selectedElementData.required" />
          Obrigatório (usuário deve preencher)
        </label>
        <label class="checkbox-label">
          <input type="checkbox" v-model="selectedElementData.locked" />
          Bloqueado (usuário não pode mover)
        </label>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useFormatsStore, type AlbumFormat } from '@/stores/formats'
import type { LayoutElement } from '@/stores/layouts'

interface Props {
  formatId: string | number
  pageType: string
  initialElements?: LayoutElement[]
}

const props = defineProps<Props>()
const emit = defineEmits(['update:elements'])

const formatsStore = useFormatsStore()

// Estado
const canvasRef = ref<HTMLElement | null>(null)
const selectedElement = ref<string | null>(null)
const showGrid = ref(true)
const showRulers = ref(true)
const snapToGrid = ref(true)
const scale = ref(100)
const elements = ref<LayoutElement[]>(props.initialElements || [])

// Drag & Resize
const isDragging = ref(false)
const isResizing = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const resizeHandle = ref<string>('')
const resizeStart = ref({ x: 0, y: 0, width: 0, height: 0 })

// Constantes
const pixelsPerMm = 3.7795275591 // 96 DPI
const gridSize = 5 // 5mm

// Computed
const selectedFormat = computed((): AlbumFormat | undefined => {
  return formatsStore.getFormatById(props.formatId)
})

const canvasWidth = computed(() => {
  return selectedFormat.value ? selectedFormat.value.width * 10 : 200 // mm
})

const canvasHeight = computed(() => {
  return selectedFormat.value ? selectedFormat.value.height * 10 : 200 // mm
})

const pageTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    cover: 'Capa',
    page: 'Página',
    back: 'Contracapa'
  }
  return labels[props.pageType] || props.pageType
})

const selectedElementData = computed(() => {
  if (!selectedElement.value) return null
  return elements.value.find(e => e.id === selectedElement.value)
})


// Métodos
const addElement = (type: 'image' | 'text') => {
  const newElement: LayoutElement = {
    id: `el-${Date.now()}`,
    type,
    x: 20,
    y: 20,
    width: type === 'image' ? 80 : 60,
    height: type === 'image' ? 60 : 20,
    required: false,
    locked: false
  }

  elements.value.push(newElement)
  selectedElement.value = newElement.id
  emitUpdate()
}

const removeElement = (index: number) => {
  const element = elements.value[index]
  if (selectedElement.value === element.id) {
    selectedElement.value = null
  }
  elements.value.splice(index, 1)
  emitUpdate()
}

const selectElement = (id: string) => {
  selectedElement.value = id
}

const deselectAll = () => {
  selectedElement.value = null
}

const snapToGridValue = (value: number): number => {
  if (!snapToGrid.value) return value
  return Math.round(value / gridSize) * gridSize
}

// Drag
const startDrag = (event: MouseEvent, element: LayoutElement) => {
  if (element.locked) return

  isDragging.value = true
  dragStart.value = {
    x: event.clientX - element.x * pixelsPerMm * (scale.value / 100),
    y: event.clientY - element.y * pixelsPerMm * (scale.value / 100)
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (event: MouseEvent) => {
  if (!isDragging.value || !selectedElementData.value) return

  const scaleFactor = scale.value / 100
  let newX = (event.clientX - dragStart.value.x) / (pixelsPerMm * scaleFactor)
  let newY = (event.clientY - dragStart.value.y) / (pixelsPerMm * scaleFactor)

  newX = snapToGridValue(Math.max(0, Math.min(newX, canvasWidth.value - selectedElementData.value.width)))
  newY = snapToGridValue(Math.max(0, Math.min(newY, canvasHeight.value - selectedElementData.value.height)))

  selectedElementData.value.x = newX
  selectedElementData.value.y = newY
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  emitUpdate()
}


// Resize
const startResize = (event: MouseEvent, element: LayoutElement, handle: string) => {
  if (element.locked) return

  isResizing.value = true
  resizeHandle.value = handle
  resizeStart.value = {
    x: event.clientX,
    y: event.clientY,
    width: element.width,
    height: element.height
  }

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (event: MouseEvent) => {
  if (!isResizing.value || !selectedElementData.value) return

  const scaleFactor = scale.value / 100
  const deltaX = (event.clientX - resizeStart.value.x) / (pixelsPerMm * scaleFactor)
  const deltaY = (event.clientY - resizeStart.value.y) / (pixelsPerMm * scaleFactor)

  let newWidth = resizeStart.value.width
  let newHeight = resizeStart.value.height
  let newX = selectedElementData.value.x
  let newY = selectedElementData.value.y

  switch (resizeHandle.value) {
    case 'se': // Sudeste
      newWidth = resizeStart.value.width + deltaX
      newHeight = resizeStart.value.height + deltaY
      break
    case 'sw': // Sudoeste
      newWidth = resizeStart.value.width - deltaX
      newHeight = resizeStart.value.height + deltaY
      newX = selectedElementData.value.x + deltaX
      break
    case 'ne': // Nordeste
      newWidth = resizeStart.value.width + deltaX
      newHeight = resizeStart.value.height - deltaY
      newY = selectedElementData.value.y + deltaY
      break
    case 'nw': // Noroeste
      newWidth = resizeStart.value.width - deltaX
      newHeight = resizeStart.value.height - deltaY
      newX = selectedElementData.value.x + deltaX
      newY = selectedElementData.value.y + deltaY
      break
  }

  // Limites mínimos e máximos
  newWidth = snapToGridValue(Math.max(10, Math.min(newWidth, canvasWidth.value - newX)))
  newHeight = snapToGridValue(Math.max(10, Math.min(newHeight, canvasHeight.value - newY)))

  selectedElementData.value.width = newWidth
  selectedElementData.value.height = newHeight
  selectedElementData.value.x = newX
  selectedElementData.value.y = newY
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  emitUpdate()
}

// Zoom
const zoomIn = () => {
  scale.value = Math.min(200, scale.value + 10)
}

const zoomOut = () => {
  scale.value = Math.max(50, scale.value - 10)
}

const resetZoom = () => {
  scale.value = 100
}

// Emit
const emitUpdate = () => {
  emit('update:elements', elements.value)
}

// Watch
watch(() => props.initialElements, (newVal) => {
  if (newVal) {
    elements.value = JSON.parse(JSON.stringify(newVal))
  }
}, { deep: true })

// Lifecycle
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})
</script>


<style scoped>
.professional-editor {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1.5rem;
}

/* Format Info */
.format-info {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.info-card {
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.875rem;
}

.info-card strong {
  color: #1f2937;
  margin-right: 0.5rem;
}

/* Toolbar */
.editor-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}

.separator {
  width: 1px;
  height: 24px;
  background: #d1d5db;
  margin: 0 0.5rem;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.tool-checkbox input {
  cursor: pointer;
}

/* Editor Container */
.editor-container {
  position: relative;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  overflow: auto;
  margin-bottom: 1rem;
}

/* Rulers */
.ruler {
  position: absolute;
  background: #f3f4f6;
  z-index: 10;
}

.ruler-horizontal {
  top: 0;
  left: 30px;
  right: 0;
  height: 30px;
  border-bottom: 1px solid #d1d5db;
}

.ruler-vertical {
  left: 0;
  top: 30px;
  bottom: 0;
  width: 30px;
  border-right: 1px solid #d1d5db;
}

.ruler-mark {
  position: absolute;
  font-size: 10px;
  color: #6b7280;
}

.ruler-horizontal .ruler-mark {
  border-left: 1px solid #9ca3af;
  height: 100%;
  padding-left: 2px;
  padding-top: 2px;
}

.ruler-vertical .ruler-mark {
  border-top: 1px solid #9ca3af;
  width: 100%;
  padding-left: 2px;
  padding-top: 2px;
}

.ruler-label {
  font-size: 9px;
  font-weight: 600;
}

/* Canvas */
.canvas-wrapper {
  display: inline-block;
  padding: 2rem;
}

.canvas {
  position: relative;
  background: white;
  border: 2px solid #3b82f6;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transform-origin: top left;
  transition: transform 0.2s;
}

.canvas.show-grid {
  background-image:
    repeating-linear-gradient(0deg, transparent, transparent calc(5 * 3.7795275591px - 1px), #e5e7eb calc(5 * 3.7795275591px)),
    repeating-linear-gradient(90deg, transparent, transparent calc(5 * 3.7795275591px - 1px), #e5e7eb calc(5 * 3.7795275591px));
}


/* Elements */
.element {
  position: absolute;
  border: 2px dashed #9ca3af;
  cursor: move;
  transition: border-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.element.image {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.element.text {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
}

.element.selected {
  border-style: solid;
  border-width: 2px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  z-index: 100;
}

.element-content {
  text-align: center;
  pointer-events: none;
}

.element-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.25rem;
}

.element-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

.element-label small {
  font-size: 0.65rem;
  color: #6b7280;
}

/* Resize Handles */
.resize-handles {
  position: absolute;
  inset: -6px;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.handle.nw {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.handle.ne {
  top: 0;
  right: 0;
  cursor: ne-resize;
}

.handle.sw {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}

.handle.se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}

/* Remove Button */
.btn-remove {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-remove:hover {
  background: #dc2626;
}

/* Properties Panel */
.properties-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
}

.properties-panel h4 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1rem;
}

.property-group {
  margin-bottom: 1.5rem;
}

.property-group:last-child {
  margin-bottom: 0;
}

.property-group > label {
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.property-row {
  display: flex;
  gap: 1rem;
}

.property-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.property-field span {
  color: #6b7280;
  white-space: nowrap;
}

.property-field input[type="number"] {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.property-field input[type="number"]:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Responsive */
@media (max-width: 768px) {
  .format-info {
    flex-direction: column;
  }

  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tool-btn {
    width: 100%;
  }

  .property-row {
    flex-direction: column;
  }
}
</style>
