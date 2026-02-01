<template>
  <div class="template-preview">
    <div class="preview-header">
      <h3>{{ template.name }}</h3>
      <button class="btn-close" @click="$emit('close')">×</button>
    </div>

    <div class="preview-info">
      <div class="info-item">
        <span class="label">Tipo:</span>
        <span class="value">{{ template.productType }}</span>
      </div>
      <div class="info-item">
        <span class="label">Formato:</span>
        <span class="value">{{ formatName }}</span>
      </div>
      <div class="info-item">
        <span class="label">Páginas:</span>
        <span class="value">{{ template.config?.pages || 'N/A' }}</span>
      </div>
      <div class="info-item">
        <span class="label">Layouts:</span>
        <span class="value">{{ selectedLayouts.length }}</span>
      </div>
    </div>

    <div class="preview-layouts">
      <h4>Layouts Incluídos</h4>
      
      <div class="layouts-grid">
        <div
          v-for="(layout, index) in selectedLayouts"
          :key="layout.id"
          class="layout-preview-card"
        >
          <div class="card-number">{{ index + 1 }}</div>
          
          <div class="layout-preview-canvas">
            <div
              v-for="element in layout.elements"
              :key="element.id"
              :class="['preview-element', element.type]"
              :style="{
                left: `${(element.x / 800) * 100}%`,
                top: `${(element.y / 600) * 100}%`,
                width: `${(element.width / 800) * 100}%`,
                height: `${(element.height / 600) * 100}%`
              }"
            >
              <span v-if="element.type === 'image'">🖼️</span>
              <span v-if="element.type === 'text'">T</span>
            </div>
          </div>
          
          <div class="layout-info">
            <h5>{{ layout.name }}</h5>
            <span class="layout-type">{{ getPageTypeLabel(layout.pageType) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="preview-actions">
      <button class="btn-secondary" @click="$emit('close')">
        Fechar
      </button>
      <button class="btn-primary" @click="$emit('edit')">
        ✏️ Editar Template
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatsStore } from '@/stores/formats'
import { useLayoutsStore } from '@/stores/layouts'

interface Props {
  template: any
}

const props = defineProps<Props>()
const emit = defineEmits(['close', 'edit'])

const formatsStore = useFormatsStore()
const layoutsStore = useLayoutsStore()

const formatName = computed(() => {
  if (!props.template.formatId) return 'N/A'
  const format = formatsStore.getFormatById(props.template.formatId)
  return format ? format.name : 'Formato não encontrado'
})

const selectedLayouts = computed(() => {
  if (!props.template.layoutIds || !Array.isArray(props.template.layoutIds)) {
    return []
  }
  
  return props.template.layoutIds
    .map((id: number | string) => layoutsStore.getLayoutById(id))
    .filter((layout: any) => layout !== undefined)
})

const getPageTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    cover: 'Capa',
    page: 'Página',
    back: 'Contracapa'
  }
  return labels[type] || type
}
</script>

<style scoped>
.template-preview {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.preview-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.btn-close {
  width: 36px;
  height: 36px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.btn-close:hover {
  background: #e5e7eb;
  color: #111827;
}

.preview-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.info-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.preview-layouts {
  margin-bottom: 2rem;
}

.preview-layouts h4 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1.125rem;
}

.layouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.layout-preview-card {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: white;
  position: relative;
  transition: all 0.2s;
}

.layout-preview-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.card-number {
  position: absolute;
  top: -12px;
  left: 12px;
  width: 28px;
  height: 28px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.layout-preview-canvas {
  position: relative;
  width: 100%;
  padding-bottom: 75%;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.preview-element {
  position: absolute;
  border: 2px dashed #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(59, 130, 246, 0.05);
}

.preview-element.image {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.preview-element.text {
  background: rgba(16, 185, 129, 0.1);
  border-color: #10b981;
  font-weight: bold;
  color: #10b981;
}

.layout-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.layout-info h5 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.layout-type {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

/* Responsive */
@media (max-width: 768px) {
  .template-preview {
    padding: 1rem;
  }

  .preview-info {
    grid-template-columns: 1fr;
  }

  .layouts-grid {
    grid-template-columns: 1fr;
  }

  .preview-actions {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
