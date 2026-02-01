<template>
  <div class="editor-canvas-container" ref="containerRef">
    <!-- Rulers -->
    <div v-if="showRulers" class="ruler ruler-horizontal">
      <div 
        v-for="i in rulerMarks" 
        :key="`h-${i}`" 
        class="ruler-mark"
        :style="{ left: `${i * rulerScale * zoom}px` }"
      >
        <span v-if="i % 10 === 0">{{ i }}</span>
      </div>
    </div>
    <div v-if="showRulers" class="ruler ruler-vertical">
      <div 
        v-for="i in rulerMarksVertical" 
        :key="`v-${i}`" 
        class="ruler-mark"
        :style="{ top: `${i * rulerScale * zoom}px` }"
      >
        <span v-if="i % 10 === 0">{{ i }}</span>
      </div>
    </div>

    <!-- Canvas Wrapper with Zoom -->
    <div 
      class="canvas-wrapper"
      :style="{ transform: `scale(${zoom})`, transformOrigin: 'top left' }"
      @wheel.prevent="handleWheel"
    >
      <!-- Page Canvas -->
      <div 
        class="page-canvas"
        :style="pageStyle"
        @click="handleCanvasClick"
        @drop="handleDrop"
        @dragover.prevent
      >
        <!-- Bleed Area Overlay (Red) -->
        <div v-if="showBleed" class="overlay-bleed">
          <div class="bleed-area bleed-top" :style="bleedTopStyle"></div>
          <div class="bleed-area bleed-right" :style="bleedRightStyle"></div>
          <div class="bleed-area bleed-bottom" :style="bleedBottomStyle"></div>
          <div class="bleed-area bleed-left" :style="bleedLeftStyle"></div>
        </div>

        <!-- Safe Area Overlay (Green border) -->
        <div v-if="showSafeArea" class="overlay-safe-area" :style="safeAreaStyle"></div>

        <!-- Margin Guides (Blue lines) -->
        <div v-if="showMargins" class="overlay-margins">
          <div class="margin-line margin-top" :style="marginTopStyle"></div>
          <div class="margin-line margin-right" :style="marginRightStyle"></div>
          <div class="margin-line margin-bottom" :style="marginBottomStyle"></div>
          <div class="margin-line margin-left" :style="marginLeftStyle"></div>
        </div>

        <!-- Gutter Guide (for spread mode) -->
        <div v-if="showGutter && viewMode === 'spread'" class="overlay-gutter" :style="gutterStyle"></div>

        <!-- Elements -->
        <div
          v-for="element in elements"
          :key="element.id"
          :class="[
            'canvas-element',
            element.type,
            { 
              selected: selectedElement?.id === element.id,
              'low-dpi': element.type === 'image' && element.effectiveDPI < 150,
              'warning-dpi': element.type === 'image' && element.effectiveDPI >= 150 && element.effectiveDPI < 300,
              'safe-area-violation': isOutsideSafeArea(element)
            }
          ]"
          :style="getElementStyle(element)"
          @mousedown="startDrag($event, element)"
          @click.stop="selectElement(element)"
        >
          <!-- Image Element -->
          <template v-if="element.type === 'image'">
            <img 
              :src="element.src" 
              :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
              draggable="false"
            />
            <!-- DPI Indicator -->
            <div v-if="showDPIIndicator" class="dpi-indicator" :class="getDPIClass(element.effectiveDPI)">
              {{ Math.round(element.effectiveDPI) }} DPI
            </div>
          </template>

          <!-- Text Element -->
          <template v-if="element.type === 'text'">
            <div 
              class="text-content"
              :style="getTextStyle(element)"
              :contenteditable="selectedElement?.id === element.id"
              @blur="updateTextContent($event, element)"
            >
              {{ element.content }}
            </div>
            <!-- Overflow Indicator -->
            <div v-if="element.isOverflowing" class="overflow-indicator">⚠️</div>
          </template>

          <!-- Shape Element -->
          <template v-if="element.type === 'shape'">
            <div 
              class="shape-content"
              :style="getShapeStyle(element)"
            ></div>
          </template>

          <!-- Resize Handles -->
          <div v-if="selectedElement?.id === element.id" class="resize-handles">
            <div class="handle nw" @mousedown.stop="startResize($event, element, 'nw')"></div>
            <div class="handle n" @mousedown.stop="startResize($event, element, 'n')"></div>
            <div class="handle ne" @mousedown.stop="startResize($event, element, 'ne')"></div>
            <div class="handle e" @mousedown.stop="startResize($event, element, 'e')"></div>
            <div class="handle se" @mousedown.stop="startResize($event, element, 'se')"></div>
            <div class="handle s" @mousedown.stop="startResize($event, element, 's')"></div>
            <div class="handle sw" @mousedown.stop="startResize($event, element, 'sw')"></div>
            <div class="handle w" @mousedown.stop="startResize($event, element, 'w')"></div>
            <div class="handle rotate" @mousedown.stop="startRotate($event, element)">↻</div>
          </div>

          <!-- Safe Area Warning -->
          <div v-if="isOutsideSafeArea(element)" class="safe-area-warning">
            ⚠️ Fora da área segura
          </div>
        </div>

        <!-- Snap Guides -->
        <div v-if="snapGuides.vertical !== null" class="snap-guide snap-vertical" :style="{ left: `${snapGuides.vertical}px` }"></div>
        <div v-if="snapGuides.horizontal !== null" class="snap-guide snap-horizontal" :style="{ top: `${snapGuides.horizontal}px` }"></div>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// Props
const props = defineProps<{
  pageWidth: number // mm
  pageHeight: number // mm
  bleed: number // mm
  safeMargin: number // mm
  gutterMargin: number // mm
  elements: CanvasElement[]
  viewMode: 'single' | 'spread'
  zoom: number
  showBleed: boolean
  showSafeArea: boolean
  showMargins: boolean
  showGutter: boolean
  showRulers: boolean
  showDPIIndicator: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'element-select', element: CanvasElement | null): void
  (e: 'element-update', element: CanvasElement): void
  (e: 'element-add', type: string, x: number, y: number): void
  (e: 'zoom-change', zoom: number): void
}>()

// Types
interface CanvasElement {
  id: string
  type: 'image' | 'text' | 'shape'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  locked: boolean
  // Image specific
  src?: string
  effectiveDPI?: number
  // Text specific
  content?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  color?: string
  alignment?: string
  isOverflowing?: boolean
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'triangle'
  fillColor?: string
  strokeColor?: string
  strokeWidth?: number
}

// Constants - Convert mm to pixels (assuming 96 DPI screen, 1mm ≈ 3.78px)
const MM_TO_PX = 3.78

// State
const containerRef = ref<HTMLElement | null>(null)
const selectedElement = ref<CanvasElement | null>(null)
const isDragging = ref(false)
const isResizing = ref(false)
const isRotating = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const resizeHandle = ref('')
const snapGuides = ref<{ vertical: number | null; horizontal: number | null }>({ vertical: null, horizontal: null })

// Computed - Page dimensions in pixels
const pageWidthPx = computed(() => props.pageWidth * MM_TO_PX)
const pageHeightPx = computed(() => props.pageHeight * MM_TO_PX)
const bleedPx = computed(() => props.bleed * MM_TO_PX)
const safeMarginPx = computed(() => props.safeMargin * MM_TO_PX)
const gutterMarginPx = computed(() => props.gutterMargin * MM_TO_PX)

// Ruler marks
const rulerScale = computed(() => 10 * MM_TO_PX) // 10mm per mark
const rulerMarks = computed(() => Math.ceil(pageWidthPx.value / rulerScale.value) + 10)
const rulerMarksVertical = computed(() => Math.ceil(pageHeightPx.value / rulerScale.value) + 10)

// Page style
const pageStyle = computed(() => ({
  width: `${pageWidthPx.value + (2 * bleedPx.value)}px`,
  height: `${pageHeightPx.value + (2 * bleedPx.value)}px`,
  backgroundColor: '#ffffff',
  position: 'relative' as const,
  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
}))

// Bleed overlay styles
const bleedTopStyle = computed(() => ({
  top: '0',
  left: '0',
  right: '0',
  height: `${bleedPx.value}px`,
}))
const bleedRightStyle = computed(() => ({
  top: '0',
  right: '0',
  bottom: '0',
  width: `${bleedPx.value}px`,
}))
const bleedBottomStyle = computed(() => ({
  bottom: '0',
  left: '0',
  right: '0',
  height: `${bleedPx.value}px`,
}))
const bleedLeftStyle = computed(() => ({
  top: '0',
  left: '0',
  bottom: '0',
  width: `${bleedPx.value}px`,
}))

// Safe area style
const safeAreaStyle = computed(() => ({
  top: `${bleedPx.value + safeMarginPx.value}px`,
  left: `${bleedPx.value + safeMarginPx.value}px`,
  right: `${bleedPx.value + safeMarginPx.value}px`,
  bottom: `${bleedPx.value + safeMarginPx.value}px`,
}))

// Margin styles
const marginTopStyle = computed(() => ({
  top: `${bleedPx.value + safeMarginPx.value}px`,
  left: `${bleedPx.value}px`,
  right: `${bleedPx.value}px`,
}))
const marginRightStyle = computed(() => ({
  top: `${bleedPx.value}px`,
  right: `${bleedPx.value + safeMarginPx.value}px`,
  bottom: `${bleedPx.value}px`,
}))
const marginBottomStyle = computed(() => ({
  bottom: `${bleedPx.value + safeMarginPx.value}px`,
  left: `${bleedPx.value}px`,
  right: `${bleedPx.value}px`,
}))
const marginLeftStyle = computed(() => ({
  top: `${bleedPx.value}px`,
  left: `${bleedPx.value + safeMarginPx.value}px`,
  bottom: `${bleedPx.value}px`,
}))

// Gutter style (center of spread)
const gutterStyle = computed(() => ({
  left: `${(pageWidthPx.value + (2 * bleedPx.value)) / 2 - gutterMarginPx.value / 2}px`,
  width: `${gutterMarginPx.value}px`,
  top: '0',
  bottom: '0',
}))


// Methods
const getElementStyle = (element: CanvasElement) => ({
  position: 'absolute' as const,
  left: `${element.x * MM_TO_PX + bleedPx.value}px`,
  top: `${element.y * MM_TO_PX + bleedPx.value}px`,
  width: `${element.width * MM_TO_PX}px`,
  height: `${element.height * MM_TO_PX}px`,
  transform: `rotate(${element.rotation}deg)`,
  zIndex: element.zIndex,
  cursor: element.locked ? 'not-allowed' : 'move',
})

const getTextStyle = (element: CanvasElement) => ({
  fontSize: `${element.fontSize || 14}px`,
  fontFamily: element.fontFamily || 'Arial',
  fontWeight: element.fontWeight || 'normal',
  color: element.color || '#000000',
  textAlign: element.alignment || 'left',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
})

const getShapeStyle = (element: CanvasElement) => ({
  width: '100%',
  height: '100%',
  backgroundColor: element.background || element.fillColor || '#D4775C',
  border: element.strokeWidth ? `${element.strokeWidth}px solid ${element.strokeColor || '#000'}` : 'none',
  borderRadius: element.borderRadius || (element.shapeType === 'circle' ? '50%' : '0'),
})

const getDPIClass = (dpi: number | undefined) => {
  if (!dpi) return 'dpi-unknown'
  if (dpi < 150) return 'dpi-low'
  if (dpi < 300) return 'dpi-warning'
  return 'dpi-ok'
}

const isOutsideSafeArea = (element: CanvasElement): boolean => {
  const safeLeft = props.safeMargin
  const safeTop = props.safeMargin
  const safeRight = props.pageWidth - props.safeMargin
  const safeBottom = props.pageHeight - props.safeMargin

  return (
    element.x < safeLeft ||
    element.y < safeTop ||
    element.x + element.width > safeRight ||
    element.y + element.height > safeBottom
  )
}

const selectElement = (element: CanvasElement) => {
  if (element.locked) return
  selectedElement.value = element
  emit('element-select', element)
}

const handleCanvasClick = (e: MouseEvent) => {
  if (e.target === e.currentTarget) {
    selectedElement.value = null
    emit('element-select', null)
  }
}

const startDrag = (e: MouseEvent, element: CanvasElement) => {
  if (element.locked || isResizing.value) return
  
  isDragging.value = true
  selectedElement.value = element
  dragStart.value = {
    x: e.clientX - (element.x * MM_TO_PX),
    y: e.clientY - (element.y * MM_TO_PX),
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !selectedElement.value) return

  const newX = (e.clientX - dragStart.value.x) / MM_TO_PX
  const newY = (e.clientY - dragStart.value.y) / MM_TO_PX

  // Check for snap guides
  checkSnapGuides(newX, newY, selectedElement.value)

  selectedElement.value.x = snapGuides.value.vertical !== null 
    ? (snapGuides.value.vertical - bleedPx.value) / MM_TO_PX 
    : newX
  selectedElement.value.y = snapGuides.value.horizontal !== null 
    ? (snapGuides.value.horizontal - bleedPx.value) / MM_TO_PX 
    : newY

  emit('element-update', selectedElement.value)
}

const stopDrag = () => {
  isDragging.value = false
  snapGuides.value = { vertical: null, horizontal: null }
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

const startResize = (e: MouseEvent, element: CanvasElement, handle: string) => {
  if (element.locked) return
  
  isResizing.value = true
  selectedElement.value = element
  resizeHandle.value = handle
  dragStart.value = { x: e.clientX, y: e.clientY }

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value || !selectedElement.value) return

  const dx = (e.clientX - dragStart.value.x) / MM_TO_PX
  const dy = (e.clientY - dragStart.value.y) / MM_TO_PX
  const handle = resizeHandle.value

  if (handle.includes('e')) selectedElement.value.width += dx
  if (handle.includes('w')) {
    selectedElement.value.x += dx
    selectedElement.value.width -= dx
  }
  if (handle.includes('s')) selectedElement.value.height += dy
  if (handle.includes('n')) {
    selectedElement.value.y += dy
    selectedElement.value.height -= dy
  }

  // Ensure minimum size
  selectedElement.value.width = Math.max(10, selectedElement.value.width)
  selectedElement.value.height = Math.max(10, selectedElement.value.height)

  // Recalculate DPI for images
  if (selectedElement.value.type === 'image') {
    recalculateDPI(selectedElement.value)
  }

  dragStart.value = { x: e.clientX, y: e.clientY }
  emit('element-update', selectedElement.value)
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}

const startRotate = (e: MouseEvent, element: CanvasElement) => {
  if (element.locked) return
  
  isRotating.value = true
  selectedElement.value = element

  document.addEventListener('mousemove', onRotate)
  document.addEventListener('mouseup', stopRotate)
}

const onRotate = (e: MouseEvent) => {
  if (!isRotating.value || !selectedElement.value) return

  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return

  const centerX = selectedElement.value.x * MM_TO_PX + bleedPx.value + (selectedElement.value.width * MM_TO_PX) / 2
  const centerY = selectedElement.value.y * MM_TO_PX + bleedPx.value + (selectedElement.value.height * MM_TO_PX) / 2

  const angle = Math.atan2(
    e.clientY - rect.top - centerY,
    e.clientX - rect.left - centerX
  ) * (180 / Math.PI)

  // Snap to 15-degree increments
  selectedElement.value.rotation = Math.round(angle / 15) * 15

  emit('element-update', selectedElement.value)
}

const stopRotate = () => {
  isRotating.value = false
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', stopRotate)
}

const checkSnapGuides = (x: number, y: number, element: CanvasElement) => {
  const SNAP_THRESHOLD = 5 // mm
  snapGuides.value = { vertical: null, horizontal: null }

  // Check alignment with other elements
  for (const other of props.elements) {
    if (other.id === element.id) continue

    // Vertical alignment (left edges)
    if (Math.abs(x - other.x) < SNAP_THRESHOLD) {
      snapGuides.value.vertical = other.x * MM_TO_PX + bleedPx.value
    }
    // Vertical alignment (right edges)
    if (Math.abs(x + element.width - (other.x + other.width)) < SNAP_THRESHOLD) {
      snapGuides.value.vertical = (other.x + other.width) * MM_TO_PX + bleedPx.value
    }
    // Horizontal alignment (top edges)
    if (Math.abs(y - other.y) < SNAP_THRESHOLD) {
      snapGuides.value.horizontal = other.y * MM_TO_PX + bleedPx.value
    }
    // Horizontal alignment (bottom edges)
    if (Math.abs(y + element.height - (other.y + other.height)) < SNAP_THRESHOLD) {
      snapGuides.value.horizontal = (other.y + other.height) * MM_TO_PX + bleedPx.value
    }
  }

  // Check alignment with margins
  if (Math.abs(x - props.safeMargin) < SNAP_THRESHOLD) {
    snapGuides.value.vertical = props.safeMargin * MM_TO_PX + bleedPx.value
  }
  if (Math.abs(y - props.safeMargin) < SNAP_THRESHOLD) {
    snapGuides.value.horizontal = props.safeMargin * MM_TO_PX + bleedPx.value
  }
}

const recalculateDPI = (element: CanvasElement) => {
  // This would need the original image dimensions
  // For now, we'll emit an event to let the parent handle it
  emit('element-update', element)
}

const updateTextContent = (e: Event, element: CanvasElement) => {
  const target = e.target as HTMLElement
  element.content = target.innerText
  emit('element-update', element)
}

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(0.25, Math.min(3, props.zoom + delta))
    emit('zoom-change', newZoom)
  }
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (e.clientX - rect.left - bleedPx.value) / MM_TO_PX / props.zoom
  const y = (e.clientY - rect.top - bleedPx.value) / MM_TO_PX / props.zoom
  
  // Check if it's an image drop
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    emit('element-add', 'image', x, y)
  }
}

// Cleanup
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('mousemove', onRotate)
  document.removeEventListener('mouseup', stopRotate)
})
</script>


<style scoped>
.editor-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: #e5e7eb;
}

/* Rulers */
.ruler {
  position: absolute;
  background: #f3f4f6;
  z-index: 100;
}

.ruler-horizontal {
  top: 0;
  left: 30px;
  right: 0;
  height: 20px;
  border-bottom: 1px solid #d1d5db;
}

.ruler-vertical {
  top: 20px;
  left: 0;
  bottom: 0;
  width: 30px;
  border-right: 1px solid #d1d5db;
}

.ruler-mark {
  position: absolute;
  font-size: 8px;
  color: #6b7280;
}

.ruler-horizontal .ruler-mark {
  border-left: 1px solid #d1d5db;
  height: 100%;
  padding-left: 2px;
}

.ruler-vertical .ruler-mark {
  border-top: 1px solid #d1d5db;
  width: 100%;
  padding-top: 2px;
  writing-mode: vertical-rl;
}

/* Canvas Wrapper */
.canvas-wrapper {
  padding: 40px;
  min-width: fit-content;
  min-height: fit-content;
}

/* Page Canvas */
.page-canvas {
  position: relative;
  background: white;
  cursor: crosshair;
}

/* Bleed Overlay */
.bleed-area {
  position: absolute;
  background: rgba(239, 68, 68, 0.2);
  pointer-events: none;
  z-index: 50;
}

/* Safe Area Overlay */
.overlay-safe-area {
  position: absolute;
  border: 2px dashed rgba(34, 197, 94, 0.6);
  pointer-events: none;
  z-index: 51;
}

/* Margin Lines */
.overlay-margins {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 52;
}

.margin-line {
  position: absolute;
  background: rgba(59, 130, 246, 0.3);
}

.margin-top, .margin-bottom {
  height: 1px;
}

.margin-left, .margin-right {
  width: 1px;
}

/* Gutter Overlay */
.overlay-gutter {
  position: absolute;
  background: rgba(168, 85, 247, 0.15);
  border-left: 1px dashed rgba(168, 85, 247, 0.5);
  border-right: 1px dashed rgba(168, 85, 247, 0.5);
  pointer-events: none;
  z-index: 53;
}

/* Canvas Elements */
.canvas-element {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid transparent;
  transition: border-color 0.15s;
}

.canvas-element:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.canvas-element.selected {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.canvas-element.low-dpi {
  outline: 3px solid #ef4444;
  outline-offset: 2px;
}

.canvas-element.warning-dpi {
  outline: 3px solid #f59e0b;
  outline-offset: 2px;
}

.canvas-element.safe-area-violation {
  outline: 2px dashed #f59e0b;
  outline-offset: -2px;
}

/* DPI Indicator */
.dpi-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  color: white;
}

.dpi-indicator.dpi-low {
  background: #ef4444;
}

.dpi-indicator.dpi-warning {
  background: #f59e0b;
}

.dpi-indicator.dpi-ok {
  background: #22c55e;
}

.dpi-indicator.dpi-unknown {
  background: #6b7280;
}

/* Safe Area Warning */
.safe-area-warning {
  position: absolute;
  top: -24px;
  left: 0;
  padding: 2px 8px;
  font-size: 10px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  white-space: nowrap;
}

/* Overflow Indicator */
.overflow-indicator {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 14px;
}

/* Resize Handles */
.resize-handles {
  position: absolute;
  inset: -4px;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #3b82f6;
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.handle.nw { top: 0; left: 0; cursor: nw-resize; }
.handle.n { top: 0; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.handle.ne { top: 0; right: 0; cursor: ne-resize; }
.handle.e { top: 50%; right: 0; transform: translateY(-50%); cursor: e-resize; }
.handle.se { bottom: 0; right: 0; cursor: se-resize; }
.handle.s { bottom: 0; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.handle.sw { bottom: 0; left: 0; cursor: sw-resize; }
.handle.w { top: 50%; left: 0; transform: translateY(-50%); cursor: w-resize; }

.handle.rotate {
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  border-radius: 50%;
}

/* Snap Guides */
.snap-guide {
  position: absolute;
  background: #3b82f6;
  pointer-events: none;
  z-index: 100;
}

.snap-vertical {
  width: 1px;
  top: 0;
  bottom: 0;
}

.snap-horizontal {
  height: 1px;
  left: 0;
  right: 0;
}

/* Text Content */
.text-content {
  outline: none;
  word-wrap: break-word;
}

.text-content:focus {
  cursor: text;
}
</style>
