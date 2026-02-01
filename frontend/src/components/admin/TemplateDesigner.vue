<template>
  <div class="template-designer">
    <!-- Header -->
    <div class="designer-header">
      <div class="header-left">
        <h2 class="designer-title">{{ mode === 'create' ? 'Criar Template' : 'Editar Template' }}</h2>
        <div class="template-info">
          <span class="product-type">{{ form.productType || 'Selecione o tipo' }}</span>
          <span class="template-type">{{ form.templateType || 'Selecione o template' }}</span>
        </div>
      </div>
      
      <div class="header-actions">
        <button @click="previewTemplate" class="btn-preview">
          👁️ Visualizar
        </button>
        <button @click="saveTemplate" class="btn-save" :disabled="!isFormValid">
          💾 Salvar
        </button>
        <button @click="$emit('close')" class="btn-close">
          ✕
        </button>
      </div>
    </div>

    <div class="designer-content">
      <!-- Sidebar - Configurações -->
      <div class="designer-sidebar">
        <div class="config-section">
          <h3>Configurações Básicas</h3>
          
          <FormField label="Nome do Template" required :error="errors.name">
            <input v-model="form.name" class="form-input" placeholder="Ex: Capa Elegante" />
          </FormField>
          
          <FormField label="Tipo de Produto" required :error="errors.productType">
            <select v-model="form.productType" class="form-select" @change="handleProductTypeChange">
              <option value="">Selecione</option>
              <option value="fotolivro">Fotolivro</option>
              <option value="calendario">Calendário</option>
              <option value="cartao">Cartão</option>
              <option value="poster">Poster</option>
              <option value="canvas">Canvas</option>
            </select>
          </FormField>
          
          <FormField label="Tipo de Template" required :error="errors.templateType" v-if="form.productType">
            <select v-model="form.templateType" class="form-select">
              <option value="">Selecione</option>
              <option v-for="type in availableTemplateTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </option>
            </select>
          </FormField>
          
          <FormField label="Categoria" :error="errors.category">
            <select v-model="form.category" class="form-select">
              <option value="">Selecione</option>
              <option v-for="cat in availableCategories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </FormField>
        </div>

        <!-- Dimensões -->
        <div class="config-section">
          <h3>Dimensões</h3>
          
          <div class="dimensions-grid">
            <FormField label="Largura (mm)" required>
              <input v-model.number="form.dimensions.width" type="number" class="form-input" />
            </FormField>
            
            <FormField label="Altura (mm)" required>
              <input v-model.number="form.dimensions.height" type="number" class="form-input" />
            </FormField>
          </div>
          
          <div class="preset-sizes">
            <button 
              v-for="preset in sizePresets" 
              :key="preset.name"
              @click="applyPresetSize(preset)"
              class="preset-btn"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>

        <!-- Margens -->
        <div class="config-section">
          <h3>Margens (mm)</h3>
          
          <div class="margins-grid">
            <FormField label="Superior">
              <input v-model.number="form.margins.top" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Direita">
              <input v-model.number="form.margins.right" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Inferior">
              <input v-model.number="form.margins.bottom" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Esquerda">
              <input v-model.number="form.margins.left" type="number" class="form-input" min="0" />
            </FormField>
            
            <!-- Lombada para fotolivros -->
            <FormField v-if="form.productType === 'fotolivro' && form.templateType === 'cover'" label="Lombada">
              <input v-model.number="form.spine.width" type="number" class="form-input" min="0" />
            </FormField>
            
            <!-- Centro para páginas duplas -->
            <FormField v-if="form.templateType === 'page'" label="Centro">
              <input v-model.number="form.margins.center" type="number" class="form-input" min="0" />
            </FormField>
          </div>
        </div>

        <!-- Área Segura -->
        <div class="config-section">
          <h3>Área Segura (mm)</h3>
          
          <div class="safe-area-grid">
            <FormField label="Superior">
              <input v-model.number="form.safeArea.top" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Direita">
              <input v-model.number="form.safeArea.right" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Inferior">
              <input v-model.number="form.safeArea.bottom" type="number" class="form-input" min="0" />
            </FormField>
            
            <FormField label="Esquerda">
              <input v-model.number="form.safeArea.left" type="number" class="form-input" min="0" />
            </FormField>
          </div>
        </div>

        <!-- Cores e Fontes -->
        <div class="config-section">
          <h3>Paleta de Cores</h3>
          
          <div class="color-palette">
            <div 
              v-for="(color, index) in form.colors" 
              :key="index"
              class="color-item"
            >
              <input 
                v-model="form.colors[index]" 
                type="color" 
                class="color-input"
              />
              <button @click="removeColor(index)" class="remove-color">×</button>
            </div>
            
            <button @click="addColor" class="add-color">+ Cor</button>
          </div>
        </div>

        <div class="config-section">
          <h3>Fontes</h3>
          
          <div class="fonts-list">
            <div 
              v-for="(font, index) in form.fonts" 
              :key="index"
              class="font-item"
            >
              <select v-model="form.fonts[index]" class="form-select">
                <option v-for="f in availableFonts" :key="f" :value="f">{{ f }}</option>
              </select>
              <button @click="removeFont(index)" class="remove-font">×</button>
            </div>
            
            <button @click="addFont" class="add-font">+ Fonte</button>
          </div>
        </div>

        <!-- Tags -->
        <div class="config-section">
          <h3>Tags</h3>
          
          <TagInput 
            v-model="form.tags"
            placeholder="Adicione tags para facilitar a busca"
          />
        </div>
      </div>

      <!-- Canvas - Área de Design -->
      <div class="designer-canvas">
        <div class="canvas-toolbar">
          <div class="zoom-controls">
            <button @click="zoomOut" class="zoom-btn">-</button>
            <span class="zoom-level">{{ Math.round(zoom * 100) }}%</span>
            <button @click="zoomIn" class="zoom-btn">+</button>
            <button @click="fitToScreen" class="zoom-btn">Ajustar</button>
          </div>
          
          <div class="canvas-tools">
            <button 
              v-for="tool in canvasTools" 
              :key="tool.type"
              @click="selectTool(tool.type)"
              :class="['tool-btn', { active: selectedTool === tool.type }]"
            >
              {{ tool.icon }} {{ tool.label }}
            </button>
          </div>
        </div>

        <div class="canvas-container" ref="canvasContainer">
          <div 
            class="canvas"
            :style="canvasStyle"
            @click="handleCanvasClick"
            @mousemove="handleCanvasMouseMove"
          >
            <!-- Guias de margem -->
            <div class="margin-guides" :style="marginGuidesStyle"></div>
            
            <!-- Área segura -->
            <div class="safe-area-guides" :style="safeAreaGuidesStyle"></div>
            
            <!-- Lombada (para capas de fotolivro) -->
            <div 
              v-if="form.productType === 'fotolivro' && form.templateType === 'cover'"
              class="spine-guide"
              :style="spineGuideStyle"
            ></div>
            
            <!-- Centro (para páginas duplas) -->
            <div 
              v-if="form.templateType === 'page'"
              class="center-guide"
              :style="centerGuideStyle"
            ></div>

            <!-- Elementos do template -->
            <div
              v-for="(element, index) in form.elements"
              :key="element.id"
              class="template-element"
              :class="[`element-${element.type}`, { selected: selectedElement === element.id }]"
              :style="getElementStyle(element)"
              @click.stop="selectElement(element.id)"
              @mousedown="startDrag(element.id, $event)"
            >
              <div class="element-content">
                <component 
                  :is="getElementComponent(element.type)"
                  :element="element"
                  :editing="selectedElement === element.id"
                />
              </div>
              
              <!-- Handles de redimensionamento -->
              <div v-if="selectedElement === element.id" class="resize-handles">
                <div 
                  v-for="handle in resizeHandles" 
                  :key="handle"
                  :class="`resize-handle ${handle}`"
                  @mousedown.stop="startResize(element.id, handle, $event)"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Properties Panel -->
      <div class="properties-panel" v-if="selectedElement">
        <h3>Propriedades do Elemento</h3>
        
        <div v-if="selectedElementData" class="element-properties">
          <FormField label="ID do Elemento">
            <input v-model="selectedElementData.id" class="form-input" />
          </FormField>
          
          <div class="position-grid">
            <FormField label="X (mm)">
              <input v-model.number="selectedElementData.x" type="number" class="form-input" />
            </FormField>
            
            <FormField label="Y (mm)">
              <input v-model.number="selectedElementData.y" type="number" class="form-input" />
            </FormField>
            
            <FormField label="Largura (mm)">
              <input v-model.number="selectedElementData.width" type="number" class="form-input" />
            </FormField>
            
            <FormField label="Altura (mm)">
              <input v-model.number="selectedElementData.height" type="number" class="form-input" />
            </FormField>
          </div>
          
          <!-- Propriedades específicas por tipo -->
          <div v-if="selectedElementData.type === 'text'" class="text-properties">
            <FormField label="Tamanho da Fonte">
              <input v-model.number="selectedElementData.fontSize" type="number" class="form-input" />
            </FormField>
            
            <FormField label="Família da Fonte">
              <select v-model="selectedElementData.fontFamily" class="form-select">
                <option v-for="font in availableFonts" :key="font" :value="font">{{ font }}</option>
              </select>
            </FormField>
          </div>
          
          <div class="element-actions">
            <label class="checkbox-label">
              <input 
                v-model="selectedElementData.required" 
                type="checkbox"
              />
              Elemento obrigatório
            </label>
            
            <button @click="duplicateElement" class="btn-secondary">
              📋 Duplicar
            </button>
            
            <button @click="deleteElement" class="btn-danger">
              🗑️ Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import FormField from '@/components/common/FormField.vue';
import TagInput from '@/components/common/TagInput.vue';

interface Props {
  template?: any;
  mode: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  template: null,
});

const emit = defineEmits<{
  save: [template: any];
  close: [];
}>();

// Estado
const form = ref({
  name: '',
  productType: '',
  templateType: '',
  category: '',
  dimensions: { width: 210, height: 297, unit: 'mm' },
  margins: { top: 10, right: 10, bottom: 10, left: 10, spine: 5, center: 10 },
  safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
  spine: { width: 5, minPages: 20, maxPages: 100 },
  elements: [] as any[],
  colors: ['#2c3e50', '#ecf0f1'],
  fonts: ['Roboto', 'Open Sans'],
  tags: [] as string[],
});

const errors = ref<Record<string, string>>({});
const zoom = ref(0.5);
const selectedTool = ref('select');
const selectedElement = ref<string | null>(null);
const canvasContainer = ref<HTMLElement>();

// Computed
const isFormValid = computed(() => {
  const hasName = !!form.value.name;
  const hasProductType = !!form.value.productType;
  const hasTemplateType = !!form.value.templateType;
  const hasValidWidth = form.value.dimensions.width > 0;
  const hasValidHeight = form.value.dimensions.height > 0;
  
  console.log('Validação do form:', {
    hasName,
    hasProductType,
    hasTemplateType,
    hasValidWidth,
    hasValidHeight,
    name: form.value.name,
    productType: form.value.productType,
    templateType: form.value.templateType,
    width: form.value.dimensions.width,
    height: form.value.dimensions.height
  });
  
  return hasName && hasProductType && hasTemplateType && hasValidWidth && hasValidHeight;
});

const availableTemplateTypes = computed(() => {
  const types: Record<string, any[]> = {
    fotolivro: [
      { value: 'cover', label: 'Capa' },
      { value: 'page', label: 'Página' }
    ],
    calendario: [
      { value: 'page', label: 'Página Mensal' }
    ],
    cartao: [
      { value: 'card', label: 'Cartão' }
    ],
    poster: [
      { value: 'single', label: 'Página Única' }
    ],
    canvas: [
      { value: 'single', label: 'Canvas' }
    ]
  };
  
  return types[form.value.productType] || [];
});

const availableCategories = computed(() => {
  const categories: Record<string, string[]> = {
    fotolivro: ['elegante', 'moderno', 'infantil', 'casamento', 'viagem'],
    calendario: ['mesa', 'parede', 'bolso'],
    cartao: ['aniversario', 'casamento', 'natal', 'pascoa'],
    poster: ['fotografico', 'artistico', 'motivacional'],
    canvas: ['artistico', 'fotografico', 'abstrato']
  };
  
  return categories[form.value.productType] || [];
});

const sizePresets = computed(() => {
  const presets = [
    { name: 'A4', width: 210, height: 297 },
    { name: 'A5', width: 148, height: 210 },
    { name: 'A3', width: 297, height: 420 },
    { name: 'Quadrado 20x20', width: 200, height: 200 },
    { name: 'Paisagem 30x20', width: 300, height: 200 }
  ];
  
  return presets;
});

const availableFonts = [
  'Roboto', 'Open Sans', 'Montserrat', 'Playfair Display', 
  'Lora', 'Dancing Script', 'Crimson Text'
];

const canvasTools = [
  { type: 'select', icon: '👆', label: 'Selecionar' },
  { type: 'image', icon: '🖼️', label: 'Imagem' },
  { type: 'text', icon: '📝', label: 'Texto' },
  { type: 'shape', icon: '⬜', label: 'Forma' }
];

const resizeHandles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const canvasStyle = computed(() => ({
  width: `${form.value.dimensions.width * zoom.value}px`,
  height: `${form.value.dimensions.height * zoom.value}px`,
  transform: `scale(${zoom.value})`,
  transformOrigin: 'top left'
}));

const selectedElementData = computed(() => {
  if (!selectedElement.value) return null;
  return form.value.elements.find(el => el.id === selectedElement.value);
});

// Métodos
const handleProductTypeChange = (): void => {
  form.value.templateType = '';
  form.value.category = '';
};

const applyPresetSize = (preset: any): void => {
  form.value.dimensions.width = preset.width;
  form.value.dimensions.height = preset.height;
};

const addColor = (): void => {
  form.value.colors.push('#ffffff');
};

const removeColor = (index: number): void => {
  form.value.colors.splice(index, 1);
};

const addFont = (): void => {
  form.value.fonts.push('Roboto');
};

const removeFont = (index: number): void => {
  form.value.fonts.splice(index, 1);
};

const zoomIn = (): void => {
  zoom.value = Math.min(zoom.value * 1.2, 2);
};

const zoomOut = (): void => {
  zoom.value = Math.max(zoom.value / 1.2, 0.1);
};

const fitToScreen = (): void => {
  if (!canvasContainer.value) return;
  
  const containerWidth = canvasContainer.value.clientWidth - 40;
  const containerHeight = canvasContainer.value.clientHeight - 40;
  
  const scaleX = containerWidth / form.value.dimensions.width;
  const scaleY = containerHeight / form.value.dimensions.height;
  
  zoom.value = Math.min(scaleX, scaleY, 1);
};

const selectTool = (tool: string): void => {
  selectedTool.value = tool;
  selectedElement.value = null;
};

const handleCanvasClick = (event: MouseEvent): void => {
  if (selectedTool.value === 'select') return;
  
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const x = (event.clientX - rect.left) / zoom.value;
  const y = (event.clientY - rect.top) / zoom.value;
  
  addElement(selectedTool.value, x, y);
};

const addElement = (type: string, x: number, y: number): void => {
  const id = `${type}-${Date.now()}`;
  
  const element: any = {
    id,
    type,
    x: Math.round(x),
    y: Math.round(y),
    width: type === 'text' ? 100 : 80,
    height: type === 'text' ? 20 : 60,
    required: false
  };
  
  if (type === 'text') {
    element.fontSize = 14;
    element.fontFamily = 'Roboto';
  }
  
  form.value.elements.push(element);
  selectedElement.value = id;
};

const selectElement = (id: string): void => {
  selectedElement.value = id;
};

const duplicateElement = (): void => {
  if (!selectedElementData.value) return;
  
  const newElement = { 
    ...selectedElementData.value, 
    id: `${selectedElementData.value.type}-${Date.now()}`,
    x: selectedElementData.value.x + 10,
    y: selectedElementData.value.y + 10
  };
  
  form.value.elements.push(newElement);
  selectedElement.value = newElement.id;
};

const deleteElement = (): void => {
  if (!selectedElement.value) return;
  
  const index = form.value.elements.findIndex(el => el.id === selectedElement.value);
  if (index > -1) {
    form.value.elements.splice(index, 1);
    selectedElement.value = null;
  }
};

const getElementStyle = (element: any) => ({
  left: `${element.x * zoom.value}px`,
  top: `${element.y * zoom.value}px`,
  width: `${element.width * zoom.value}px`,
  height: `${element.height * zoom.value}px`
});

const getElementComponent = (type: string) => {
  // Retornar componente baseado no tipo
  return 'div'; // Placeholder
};

const previewTemplate = (): void => {
  // Implementar preview
  console.log('Preview template:', form.value);
};

const saveTemplate = (): void => {
  console.log('saveTemplate chamado');
  console.log('Form válido:', isFormValid.value);
  console.log('Dados do form:', form.value);
  
  if (!isFormValid.value) {
    console.log('Formulário inválido, não salvando');
    return;
  }
  
  console.log('Emitindo evento save...');
  emit('save', { ...form.value });
};

// Lifecycle
onMounted(() => {
  if (props.template && props.mode === 'edit') {
    Object.assign(form.value, props.template);
  }
  
  nextTick(() => {
    fitToScreen();
  });
});
</script>

<style scoped>
.template-designer {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f8fafc;
}

.designer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.designer-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.template-info {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.product-type,
.template-type {
  padding: 0.25rem 0.5rem;
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 4px;
  font-size: 0.75rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-preview,
.btn-save,
.btn-close {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn-preview {
  background: #f3f4f6;
  color: #374151;
}

.btn-save {
  background: #2563eb;
  color: white;
}

.btn-close {
  background: #ef4444;
  color: white;
}

.designer-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.designer-sidebar {
  width: 300px;
  background: white;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  padding: 1rem;
}

.config-section {
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.config-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
}

.dimensions-grid,
.margins-grid,
.safe-area-grid,
.position-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.preset-sizes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.preset-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 0.75rem;
  cursor: pointer;
}

.color-palette,
.fonts-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-item,
.font-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-input {
  width: 40px;
  height: 30px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.designer-canvas {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.canvas-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.zoom-btn {
  padding: 0.25rem 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.canvas-tools {
  display: flex;
  gap: 0.5rem;
}

.tool-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 0.875rem;
}

.tool-btn.active {
  background: #2563eb;
  color: white;
  border-color: #2563eb;
}

.canvas-container {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.canvas {
  position: relative;
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

.margin-guides,
.safe-area-guides {
  position: absolute;
  border: 1px dashed #94a3b8;
  pointer-events: none;
}

.safe-area-guides {
  border-color: #f59e0b;
}

.spine-guide,
.center-guide {
  position: absolute;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid #ef4444;
  pointer-events: none;
}

.template-element {
  position: absolute;
  border: 1px solid transparent;
  cursor: pointer;
}

.template-element.selected {
  border-color: #2563eb;
}

.resize-handles {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #2563eb;
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: all;
  cursor: pointer;
}

.properties-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e2e8f0;
  padding: 1rem;
  overflow-y: auto;
}

.element-properties {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.element-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.btn-secondary,
.btn-danger {
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

/* Form styles */
.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
}
</style>