<template>
  <div class="templates-management">
    <!-- Header -->
    <div class="header">
      <div>
        <h1>Gestão de Templates</h1>
        <p>Crie e gerencie templates de produtos personalizados</p>
      </div>
      
      <button class="btn-primary" @click="showCreateForm = !showCreateForm">
        {{ showCreateForm ? '❌ Cancelar' : '✨ Criar Novo Template' }}
      </button>
    </div>

    <!-- Formulário de Criação -->
    <div v-if="showCreateForm" class="create-form">
      <h2>Criar Novo Template</h2>
      
      <form @submit.prevent="handleCreate">
        <div class="form-grid">
          <div class="form-group">
            <label>Nome do Template *</label>
            <input
              v-model="newTemplate.name"
              type="text"
              placeholder="Ex: Fotolivro Clássico"
              required
            />
          </div>

          <div class="form-group">
            <label>Tipo de Produto *</label>
            <select v-model="newTemplate.productType" required>
              <option value="">Selecione...</option>
              <option value="fotolivro">Fotolivro</option>
              <option value="calendario">Calendário</option>
              <option value="cartao">Cartão</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label>Descrição</label>
            <textarea
              v-model="newTemplate.description"
              rows="3"
              placeholder="Descreva o template..."
            ></textarea>
          </div>

          <!-- Configurações para Fotolivro -->
          <template v-if="newTemplate.productType === 'fotolivro'">
            <div class="form-group">
              <label>Formato *</label>
              <select v-model="newTemplate.formatId" required @change="onFormatChange">
                <option value="">Selecione um formato...</option>
                <option 
                  v-for="format in availableFormats" 
                  :key="format.id" 
                  :value="format.id"
                >
                  {{ format.name }} ({{ format.width }}x{{ format.height }}cm)
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>Páginas</label>
              <select v-model="newTemplate.pages">
                <option value="20">20 páginas</option>
                <option value="40">40 páginas</option>
                <option value="60">60 páginas</option>
                <option value="80">80 páginas</option>
              </select>
            </div>

            <div class="form-group">
              <label>Tipo de Capa</label>
              <select v-model="newTemplate.coverType">
                <option value="dura">Capa Dura</option>
                <option value="mole">Capa Mole</option>
              </select>
            </div>
          </template>

          <!-- Seleção de Layouts -->
          <template v-if="newTemplate.formatId && availableLayouts.length > 0">
            <div class="form-group full-width">
              <label>🎨 Layouts Disponíveis</label>
              <p class="help-text">Selecione os layouts que estarão disponíveis neste template</p>
            </div>

            <div class="layouts-selector full-width">
              <div class="layouts-grid">
                <div
                  v-for="layout in availableLayouts"
                  :key="layout.id"
                  :class="['layout-option', { selected: isLayoutSelected(layout.id) }]"
                  @click="toggleLayout(layout.id)"
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
                    <h4>{{ layout.name }}</h4>
                    <span class="layout-type">{{ getLayoutTypeLabel(layout.pageType) }}</span>
                    <span class="element-count">{{ layout.elements.length }} elementos</span>
                  </div>
                  <div class="selection-indicator">
                    {{ isLayoutSelected(layout.id) ? '✓' : '+' }}
                  </div>
                </div>
              </div>
              
              <div v-if="selectedLayouts.length > 0" class="selected-summary">
                <strong>{{ selectedLayouts.length }}</strong> layout(s) selecionado(s)
              </div>
            </div>
          </template>

          <!-- Tags -->
          <div class="form-group full-width">
            <label>Tags (separadas por vírgula)</label>
            <input
              v-model="tagsInput"
              type="text"
              placeholder="Ex: casamento, aniversário, família"
            />
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" @click="resetForm">
            Limpar
          </button>
          <button type="submit" class="btn-primary" :disabled="isCreating">
            {{ isCreating ? '⏳ Criando...' : '✅ Criar Template' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Lista de Templates -->
    <div class="templates-section">
      <div class="section-header">
        <h2>Templates Existentes ({{ templates.length }})</h2>
        <button class="btn-secondary" @click="loadTemplates">
          🔄 Atualizar
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="loading">
        <div class="spinner"></div>
        <p>Carregando templates...</p>
      </div>

      <!-- Lista -->
      <div v-else-if="templates.length > 0" class="templates-list">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-item"
        >
          <div class="template-info">
            <h3>{{ template.name }}</h3>
            <p class="description">{{ template.description || 'Sem descrição' }}</p>
            <div class="meta">
              <span class="badge">{{ template.productType }}</span>
              <span class="badge">{{ template.templateType }}</span>
              <span v-if="template.config" class="badge">
                {{ template.config.format }} - {{ template.config.pages }}p
              </span>
              <span class="date">{{ formatDate(template.createdAt) }}</span>
            </div>
            <div v-if="template.tags && template.tags.length" class="tags">
              <span v-for="tag in template.tags" :key="tag" class="tag">
                {{ tag }}
              </span>
            </div>
          </div>
          
          <div class="template-actions">
            <button class="btn-icon" @click="viewTemplate(template)" title="Visualizar">
              👁️
            </button>
            <button class="btn-icon" @click="editTemplate(template)" title="Editar">
              ✏️
            </button>
            <button class="btn-icon danger" @click="deleteTemplate(template)" title="Excluir">
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="empty-icon">📄</div>
        <h3>Nenhum template encontrado</h3>
        <p>Crie seu primeiro template clicando no botão acima</p>
      </div>
    </div>

    <!-- Notificação -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>

    <!-- Modal de Preview -->
    <div v-if="showPreview" class="modal-overlay" @click="closePreview">
      <div class="modal-content" @click.stop>
        <TemplatePreview
          :template="selectedTemplate"
          @close="closePreview"
          @edit="editFromPreview"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useTemplatesStore } from '@/stores/templates'
import { useFormatsStore } from '@/stores/formats'
import { useLayoutsStore } from '@/stores/layouts'
import TemplatePreview from './TemplatePreview.vue'

const templatesStore = useTemplatesStore()
const formatsStore = useFormatsStore()
const layoutsStore = useLayoutsStore()

// Computed
const availableFormats = computed(() => formatsStore.activeFormats())
const availableLayouts = computed(() => {
  if (!newTemplate.formatId) return []
  return layoutsStore.getLayoutsByFormat(newTemplate.formatId)
})

// Estado
const showCreateForm = ref(false)
const isCreating = ref(false)
const isLoading = ref(false)
const tagsInput = ref('')
const notification = ref<{ type: string; message: string } | null>(null)

const newTemplate = reactive({
  name: '',
  description: '',
  productType: '',
  formatId: '',
  format: 'quadrado',
  pages: 20,
  coverType: 'dura'
})

const templates = ref<any[]>([])
const selectedLayouts = ref<(number | string)[]>([])
const showPreview = ref(false)
const selectedTemplate = ref<any>(null)

// Métodos
const loadTemplates = async () => {
  isLoading.value = true
  try {
    await templatesStore.fetchTemplates()
    templates.value = templatesStore.templates
    console.log('✅ Templates carregados:', templates.value.length)
  } catch (error) {
    console.error('❌ Erro ao carregar templates:', error)
    showNotification('error', 'Erro ao carregar templates')
  } finally {
    isLoading.value = false
  }
}

const handleCreate = async () => {
  console.log('🚀 Criando template...')
  
  if (!newTemplate.name || !newTemplate.productType) {
    showNotification('error', 'Preencha os campos obrigatórios')
    return
  }

  if (newTemplate.productType === 'fotolivro' && !newTemplate.formatId) {
    showNotification('error', 'Selecione um formato para o fotolivro')
    return
  }

  isCreating.value = true

  try {
    const tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    // Buscar dados do formato selecionado
    const selectedFormat = newTemplate.formatId 
      ? formatsStore.getFormatById(newTemplate.formatId)
      : null

    const templateData = {
      name: newTemplate.name,
      description: newTemplate.description,
      productType: newTemplate.productType,
      templateType: 'custom',
      category: 'user-created',
      formatId: newTemplate.formatId,
      layoutIds: selectedLayouts.value,
      config: selectedFormat ? {
        format: selectedFormat.type,
        formatName: selectedFormat.name,
        width: selectedFormat.width,
        height: selectedFormat.height,
        pages: newTemplate.pages,
        coverType: newTemplate.coverType,
        margin: selectedFormat.margin,
        spine: selectedFormat.spine
      } : {
        format: newTemplate.format,
        pages: newTemplate.pages,
        coverType: newTemplate.coverType,
        margin: 10,
        spine: 5
      },
      tags
    }

    console.log('📤 Enviando:', templateData)

    const created = await templatesStore.createTemplate(templateData)
    
    console.log('✅ Template criado:', created)
    
    showNotification('success', `Template "${newTemplate.name}" criado com sucesso!`)
    
    resetForm()
    showCreateForm.value = false
    await loadTemplates()
    
  } catch (error: any) {
    console.error('❌ Erro ao criar:', error)
    showNotification('error', error.message || 'Erro ao criar template')
  } finally {
    isCreating.value = false
  }
}

const resetForm = () => {
  newTemplate.name = ''
  newTemplate.description = ''
  newTemplate.productType = ''
  newTemplate.formatId = ''
  newTemplate.format = 'quadrado'
  newTemplate.pages = 20
  newTemplate.coverType = 'dura'
  tagsInput.value = ''
  selectedLayouts.value = []
}

const onFormatChange = () => {
  // Limpar layouts selecionados quando mudar o formato
  selectedLayouts.value = []
}

const toggleLayout = (layoutId: number | string) => {
  const index = selectedLayouts.value.indexOf(layoutId)
  if (index > -1) {
    selectedLayouts.value.splice(index, 1)
  } else {
    selectedLayouts.value.push(layoutId)
  }
}

const isLayoutSelected = (layoutId: number | string) => {
  return selectedLayouts.value.includes(layoutId)
}

const getLayoutTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    cover: 'Capa',
    page: 'Página',
    back: 'Contracapa'
  }
  return labels[type] || type
}

const viewTemplate = (template: any) => {
  selectedTemplate.value = template
  showPreview.value = true
}

const closePreview = () => {
  showPreview.value = false
  selectedTemplate.value = null
}

const editFromPreview = () => {
  closePreview()
  editTemplate(selectedTemplate.value)
}

const editTemplate = (template: any) => {
  console.log('✏️ Editar template:', template)
  showNotification('info', 'Função de edição em desenvolvimento')
}

const deleteTemplate = async (template: any) => {
  if (!confirm(`Deseja realmente excluir "${template.name}"?`)) {
    return
  }

  try {
    await templatesStore.deleteTemplate(template.id)
    showNotification('success', 'Template excluído com sucesso')
    await loadTemplates()
  } catch (error) {
    console.error('❌ Erro ao excluir:', error)
    showNotification('error', 'Erro ao excluir template')
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const showNotification = (type: string, message: string) => {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 5000)
}

// Lifecycle
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.templates-management {
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

/* Formulário de Criação */
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

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

/* Templates Section */
.templates-section {
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
}

.section-header h2 {
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
}

.templates-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.template-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
}

.template-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.template-info {
  flex: 1;
}

.template-info h3 {
  margin: 0 0 0.5rem 0;
  color: #111827;
  font-size: 1.125rem;
}

.template-info .description {
  color: #6b7280;
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
}

.meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 0.5rem;
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

.date {
  color: #9ca3af;
  font-size: 0.75rem;
}

.tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0.25rem 0.5rem;
  background: #f3f4f6;
  color: #4b5563;
  border-radius: 4px;
  font-size: 0.75rem;
}

.template-actions {
  display: flex;
  gap: 0.5rem;
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

/* Loading */
.loading {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

/* Layouts Selector */
.layouts-selector {
  margin-top: 1rem;
}

.help-text {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
}

.layouts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.layout-option {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  background: white;
}

.layout-option:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
}

.layout-option.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.layout-preview {
  margin-bottom: 0.75rem;
  background: #f9fafb;
  border-radius: 4px;
  overflow: hidden;
}

.preview-canvas {
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  background: white;
  border: 1px solid #e5e7eb;
}

.preview-element {
  position: absolute;
  border: 2px dashed #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: rgba(59, 130, 246, 0.05);
  transition: all 0.2s;
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
  gap: 0.25rem;
}

.layout-info h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.layout-type {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

.element-count {
  color: #6b7280;
  font-size: 0.75rem;
}

.selection-indicator {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.125rem;
  color: #9ca3af;
  transition: all 0.2s;
}

.layout-option.selected .selection-indicator {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.selected-summary {
  padding: 0.75rem 1rem;
  background: #eff6ff;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  color: #1e40af;
  text-align: center;
  font-size: 0.875rem;
}

.selected-summary strong {
  font-size: 1.125rem;
  color: #3b82f6;
}

/* Responsive */
@media (max-width: 768px) {
  .templates-management {
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

  .template-item {
    flex-direction: column;
    gap: 1rem;
  }

  .template-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .layouts-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  max-width: 1200px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>

