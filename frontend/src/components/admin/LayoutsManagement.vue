<template>
  <div class="layouts-management">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>Gestão de Layouts</h1>
        <p>Crie e gerencie layouts de páginas para seus produtos</p>
      </div>
      
      <button class="btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '❌ Cancelar' : '✨ Criar Novo Layout' }}
      </button>
    </div>

    <!-- Formulário de Criação/Edição -->
    <div v-if="showCreateForm" class="create-form">
      <h2>{{ editingLayoutId ? '✏️ Editar Layout' : '✨ Criar Novo Layout' }}</h2>
      
      <form @submit.prevent="handleCreate">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome do Layout *</label>
            <input
              v-model="newLayout.name"
              type="text"
              placeholder="Ex: Capa com Título"
              required
            />
          </div>

          <div class="form-group">
            <label>Formato *</label>
            <select v-model="newLayout.formatId" required>
              <option value="">Selecione...</option>
              <option 
                v-for="format in formats" 
                :key="format.id" 
                :value="format.id"
              >
                {{ format.name }} ({{ format.width }}x{{ format.height }}cm)
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Tipo de Página *</label>
            <select v-model="newLayout.pageType" required>
              <option value="cover">Capa</option>
              <option value="page">Página</option>
              <option value="back">Contracapa</option>
            </select>
          </div>
        </div>

        <!-- Editor Profissional -->
        <ProfessionalLayoutEditor
          v-if="newLayout.formatId"
          :formatId="newLayout.formatId"
          :pageType="newLayout.pageType"
          :initialElements="newLayout.elements"
          @update:elements="newLayout.elements = $event"
        />
        
        <div v-else class="editor-placeholder">
          <p>⚠️ Selecione um formato para começar a criar o layout</p>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="resetForm">
            Limpar
          </button>
          <button type="submit" class="btn-primary" :disabled="isCreating || newLayout.elements.length === 0">
            {{ isCreating ? '⏳ Salvando...' : (editingLayoutId ? '✅ Atualizar Layout' : '✅ Criar Layout') }}
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Layouts -->
    <div class="layouts-section">
      <div class="section-header">
        <h2>Layouts Existentes ({{ layouts.length }})</h2>
        
        <!-- Filtros -->
        <div class="filters">
          <select v-model="filterFormat" class="filter-select">
            <option value="">Todos os formatos</option>
            <option v-for="format in formats" :key="format.id" :value="format.id">
              {{ format.name }}
            </option>
          </select>
          
          <select v-model="filterType" class="filter-select">
            <option value="">Todos os tipos</option>
            <option value="cover">Capa</option>
            <option value="page">Página</option>
            <option value="back">Contracapa</option>
          </select>
        </div>
      </div>

      <!-- Grid de Layouts -->
      <div v-if="filteredLayouts.length > 0" class="layouts-grid">
        <div
          v-for="layout in filteredLayouts"
          :key="layout.id"
          class="layout-card"
        >
          <div class="layout-preview">
            <div class="preview-canvas">
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
          </div>
          
          <div class="layout-info">
            <h3>{{ layout.name }}</h3>
            <div class="meta">
              <span class="badge">{{ getPageTypeLabel(layout.pageType) }}</span>
              <span class="badge">{{ getFormatName(layout.formatId) }}</span>
              <span class="element-count">{{ layout.elements.length }} elementos</span>
            </div>
          </div>
          
          <div class="layout-actions">
            <button class="btn-icon" @click="editLayout(layout)" title="Editar">
              ✏️
            </button>
            <button class="btn-icon danger" @click="deleteLayout(layout)" title="Excluir">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">🎨</div>
        <h3>Nenhum layout encontrado</h3>
        <p>Crie seu primeiro layout clicando no botão acima</p>
      </div>
    </div>

    <!-- Notificação -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useLayoutsStore, type LayoutElement } from '@/stores/layouts'
import { useFormatsStore } from '@/stores/formats'
import ProfessionalLayoutEditor from './ProfessionalLayoutEditor.vue'

const layoutsStore = useLayoutsStore()
const formatsStore = useFormatsStore()

// Estado
const showCreateForm = ref(false)
const isCreating = ref(false)
const filterFormat = ref('')
const filterType = ref('')
const notification = ref<{ type: string; message: string } | null>(null)
const editingLayoutId = ref<number | string | null>(null)

const newLayout = reactive({
  name: '',
  formatId: '',
  pageType: 'page',
  elements: [] as LayoutElement[]
})

// Computed
const layouts = computed(() => layoutsStore.layouts)
const formats = computed(() => formatsStore.activeFormats())

const filteredLayouts = computed(() => {
  let result = layouts.value

  if (filterFormat.value) {
    result = result.filter(l => l.formatId === filterFormat.value)
  }

  if (filterType.value) {
    result = result.filter(l => l.pageType === filterType.value)
  }

  return result
})



// Métodos

const handleCreate = () => {
  if (!newLayout.name || !newLayout.formatId || newLayout.elements.length === 0) {
    showNotification('error', 'Preencha todos os campos e adicione pelo menos um elemento')
    return
  }

  isCreating.value = true

  try {
    if (editingLayoutId.value) {
      // Atualizar layout existente
      const success = layoutsStore.updateLayout(editingLayoutId.value, {
        name: newLayout.name,
        formatId: newLayout.formatId,
        pageType: newLayout.pageType as 'cover' | 'page' | 'back',
        elements: [...newLayout.elements],
        active: true
      })

      if (success) {
        showNotification('success', `Layout "${newLayout.name}" atualizado com sucesso!`)
      } else {
        showNotification('error', 'Erro ao atualizar layout')
      }
    } else {
      // Criar novo layout
      layoutsStore.addLayout({
        name: newLayout.name,
        formatId: newLayout.formatId,
        pageType: newLayout.pageType as 'cover' | 'page' | 'back',
        elements: [...newLayout.elements],
        active: true
      })

      showNotification('success', `Layout "${newLayout.name}" criado com sucesso!`)
    }
    
    resetForm()
    showCreateForm.value = false
  } catch (error) {
    console.error('❌ Erro ao salvar layout:', error)
    showNotification('error', 'Erro ao salvar layout')
  } finally {
    isCreating.value = false
  }
}

const resetForm = () => {
  newLayout.name = ''
  newLayout.formatId = ''
  newLayout.pageType = 'page'
  newLayout.elements = []
  selectedElement.value = null
  editingLayoutId.value = null
}

const editLayout = (layout: any) => {
  // Preencher o formulário com os dados do layout
  newLayout.name = layout.name
  newLayout.formatId = layout.formatId
  newLayout.pageType = layout.pageType
  newLayout.elements = JSON.parse(JSON.stringify(layout.elements)) // Deep copy
  
  // Mostrar o formulário
  showCreateForm.value = true
  
  // Guardar o ID para atualização
  editingLayoutId.value = layout.id
  
  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' })
  
  showNotification('info', 'Editando layout. Faça as alterações e clique em Salvar.')
}

const deleteLayout = (layout: any) => {
  if (!confirm(`Deseja realmente excluir "${layout.name}"?`)) {
    return
  }

  try {
    layoutsStore.deleteLayout(layout.id)
    showNotification('success', 'Layout excluído com sucesso')
  } catch (error) {
    console.error('❌ Erro ao excluir:', error)
    showNotification('error', 'Erro ao excluir layout')
  }
}

const getPageTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    cover: 'Capa',
    page: 'Página',
    back: 'Contracapa'
  }
  return labels[type] || type
}

const getFormatName = (formatId: number | string) => {
  const format = formatsStore.getFormatById(formatId)
  return format ? format.name : 'Desconhecido'
}

const showNotification = (type: string, message: string) => {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}
</script>

<style scoped>
.layouts-management {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

.header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.header p {
  color: #6b7280;
  margin: 0;
}

/* Formulário */
.create-form {
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.create-form h2 {
  margin: 0 0 1.5rem 0;
  color: #1f2937;
  font-size: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Editor Visual */
.visual-editor {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.editor-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.125rem;
}

.element-buttons {
  display: flex;
  gap: 0.5rem;
}

.editor-canvas {
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  background: white;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.canvas-element {
  position: absolute;
  border: 2px solid #9ca3af;
  cursor: move;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-element:hover {
  border-color: #3b82f6;
  z-index: 10;
}

.canvas-element.selected {
  border-color: #3b82f6;
  border-width: 3px;
  z-index: 20;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.canvas-element.image {
  background: rgba(59, 130, 246, 0.1);
}

.canvas-element.text {
  background: rgba(16, 185, 129, 0.1);
}

.element-content {
  font-size: 2rem;
  pointer-events: none;
}

.remove-element {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: 2px solid white;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
}

.canvas-element:hover .remove-element,
.canvas-element.selected .remove-element {
  display: flex;
}

/* Propriedades do Elemento */
.element-properties {
  padding: 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.element-properties h4 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1rem;
}

.properties-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.property label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.property input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.property.checkbox {
  display: flex;
  align-items: center;
}

.property.checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  cursor: pointer;
}

.property.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

/* Seção de Layouts */
.layouts-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
}

.layouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.layout-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  background: white;
}

.layout-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.layout-preview {
  background: #f9fafb;
  padding: 1rem;
}

.preview-canvas {
  position: relative;
  width: 100%;
  padding-bottom: 75%;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
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
  padding: 1rem;
}

.layout-info h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.element-count {
  color: #6b7280;
  font-size: 0.75rem;
}

.layout-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* Botões */
.btn-primary,
.btn-secondary,
.btn-icon {
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

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-icon {
  padding: 0.5rem;
  background: #f3f4f6;
  font-size: 1.25rem;
}

.btn-icon:hover {
  background: #e5e7eb;
}

.btn-icon.danger:hover {
  background: #fee2e2;
  color: #dc2626;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  color: #374151;
  margin: 0 0 0.5rem 0;
}

/* Notificação */
.notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease;
  z-index: 1000;
}

.notification.success {
  background: #10b981;
  color: white;
}

.notification.error {
  background: #ef4444;
  color: white;
}

.notification.info {
  background: #3b82f6;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .layouts-management {
    padding: 1rem;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .layouts-grid {
    grid-template-columns: 1fr;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters {
    width: 100%;
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }
}

.editor-placeholder {
  padding: 3rem;
  text-align: center;
  background: #fef3c7;
  border: 2px dashed #f59e0b;
  border-radius: 8px;
  color: #92400e;
  font-weight: 600;
}

.editor-placeholder p {
  margin: 0;
  font-size: 1rem;
}
</style>

