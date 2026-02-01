<template>
  <Modal
    :show="true"
    :title="mode === 'create' ? 'Novo Produto' : 'Editar Produto'"
    size="large"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="product-form">
      <!-- Basic Information -->
      <div class="form-section">
        <h3>Informações Básicas</h3>
        
        <div class="form-grid">
          <FormField
            label="Nome do Produto"
            required
            :error="errors.name"
          >
            <input
              v-model="form.name"
              type="text"
              class="form-input"
              placeholder="Ex: Photobook Premium A4"
              @blur="validateField('name')"
            />
          </FormField>
          
          <FormField
            label="Tipo de Produto"
            required
            :error="errors.type"
          >
            <select
              v-model="form.type"
              class="form-select"
              @change="handleTypeChange"
            >
              <option value="">Selecione o tipo</option>
              <option value="photobook">Photobook</option>
              <option value="calendar">Calendário</option>
              <option value="card">Cartão</option>
              <option value="poster">Poster</option>
              <option value="canvas">Canvas</option>
            </select>
          </FormField>
          
          <FormField
            label="Categoria"
            :error="errors.category"
          >
            <select
              v-model="form.category"
              class="form-select"
            >
              <option value="">Selecione a categoria</option>
              <option v-for="category in availableCategories" 
                      :key="category.id" 
                      :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </FormField>
          
          <FormField
            label="Status"
            required
          >
            <select
              v-model="form.status"
              class="form-select"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="draft">Rascunho</option>
            </select>
          </FormField>
        </div>
        
        <FormField
          label="Descrição"
          :error="errors.description"
        >
          <textarea
            v-model="form.description"
            class="form-textarea"
            rows="3"
            placeholder="Descreva o produto..."
          />
        </FormField>
      </div>
      
      <!-- Images -->
      <div class="form-section">
        <h3>Imagens</h3>
        
        <ImageUploader
          v-model="form.images"
          :max-files="5"
          :accept="['image/jpeg', 'image/png', 'image/webp']"
          @upload="handleImageUpload"
          @remove="handleImageRemove"
        />
      </div>
      
      <!-- Specifications -->
      <div class="form-section">
        <h3>Especificações</h3>
        
        <div class="form-grid">
          <FormField
            label="Páginas Mínimas"
            v-if="form.type === 'photobook' || form.type === 'calendar'"
            :error="errors.minPages"
          >
            <input
              v-model.number="form.specifications.minPages"
              type="number"
              class="form-input"
              min="1"
              placeholder="20"
            />
          </FormField>
          
          <FormField
            label="Páginas Máximas"
            v-if="form.type === 'photobook' || form.type === 'calendar'"
            :error="errors.maxPages"
          >
            <input
              v-model.number="form.specifications.maxPages"
              type="number"
              class="form-input"
              min="1"
              placeholder="100"
            />
          </FormField>
          
          <FormField
            label="Formatos Disponíveis"
            :error="errors.formats"
          >
            <MultiSelect
              v-model="form.specifications.formats"
              :options="availableFormats"
              placeholder="Selecione os formatos"
            />
          </FormField>
          
          <FormField
            label="Orientações"
            :error="errors.orientations"
          >
            <MultiSelect
              v-model="form.specifications.orientations"
              :options="availableOrientations"
              placeholder="Selecione as orientações"
            />
          </FormField>
        </div>
        
        <!-- Material Options -->
        <FormField
          label="Opções de Material"
          :error="errors.materials"
        >
          <div class="materials-grid">
            <div
              v-for="material in availableMaterials"
              :key="material.id"
              class="material-option"
            >
              <label class="material-label">
                <input
                  type="checkbox"
                  :value="material.id"
                  v-model="form.specifications.materials"
                />
                <div class="material-info">
                  <span class="material-name">{{ material.name }}</span>
                  <span class="material-description">{{ material.description }}</span>
                </div>
              </label>
            </div>
          </div>
        </FormField>
      </div>
      
      <!-- Pricing -->
      <div class="form-section">
        <h3>Precificação</h3>
        
        <div class="form-grid">
          <FormField
            label="Preço Base"
            required
            :error="errors.basePrice"
          >
            <div class="price-input">
              <span class="currency">R$</span>
              <input
                v-model.number="form.pricing.basePrice"
                type="number"
                class="form-input"
                step="0.01"
                min="0"
                placeholder="0,00"
              />
            </div>
          </FormField>
          
          <FormField
            label="Preço por Página Adicional"
            v-if="form.type === 'photobook' || form.type === 'calendar'"
            :error="errors.pricePerPage"
          >
            <div class="price-input">
              <span class="currency">R$</span>
              <input
                v-model.number="form.pricing.pricePerPage"
                type="number"
                class="form-input"
                step="0.01"
                min="0"
                placeholder="0,00"
              />
            </div>
          </FormField>
          
          <FormField
            label="Margem de Lucro (%)"
            :error="errors.profitMargin"
          >
            <input
              v-model.number="form.pricing.profitMargin"
              type="number"
              class="form-input"
              min="0"
              max="100"
              placeholder="30"
            />
          </FormField>
          
          <FormField
            label="Desconto Máximo (%)"
            :error="errors.maxDiscount"
          >
            <input
              v-model.number="form.pricing.maxDiscount"
              type="number"
              class="form-input"
              min="0"
              max="100"
              placeholder="20"
            />
          </FormField>
        </div>
      </div>
      
      <!-- SEO -->
      <div class="form-section">
        <h3>SEO e Marketing</h3>
        
        <div class="form-grid">
          <FormField
            label="Título SEO"
            :error="errors.seoTitle"
          >
            <input
              v-model="form.seo.title"
              type="text"
              class="form-input"
              maxlength="60"
              placeholder="Título otimizado para SEO"
            />
            <div class="field-hint">
              {{ form.seo.title?.length || 0 }}/60 caracteres
            </div>
          </FormField>
          
          <FormField
            label="Meta Descrição"
            :error="errors.seoDescription"
          >
            <textarea
              v-model="form.seo.description"
              class="form-textarea"
              rows="2"
              maxlength="160"
              placeholder="Descrição para mecanismos de busca"
            />
            <div class="field-hint">
              {{ form.seo.description?.length || 0 }}/160 caracteres
            </div>
          </FormField>
        </div>
        
        <FormField
          label="Tags"
          :error="errors.tags"
        >
          <TagInput
            v-model="form.tags"
            placeholder="Adicione tags separadas por vírgula"
          />
        </FormField>
      </div>
    </form>
    
    <template #footer>
      <div class="modal-actions">
        <button
          type="button"
          class="btn-secondary"
          @click="$emit('close')"
        >
          Cancelar
        </button>
        
        <button
          type="submit"
          class="btn-primary"
          :disabled="loading || !isFormValid"
          @click="handleSubmit"
        >
          <LoadingSpinner v-if="loading" class="w-4 h-4" />
          {{ mode === 'create' ? 'Criar Produto' : 'Salvar Alterações' }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useProductsStore } from '@/stores/products';

// Components
import Modal from '@/components/common/Modal.vue';
import FormField from '@/components/common/FormField.vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import MultiSelect from '@/components/common/MultiSelect.vue';
import TagInput from '@/components/common/TagInput.vue';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

// Props
interface Props {
  product?: any;
  mode: 'create' | 'edit';
}

const props = withDefaults(defineProps<Props>(), {
  product: null,
});

// Emits
const emit = defineEmits<{
  save: [product: any];
  close: [];
}>();

// Store
const productsStore = useProductsStore();

// Estado
const loading = ref(false);
const errors = ref<Record<string, string>>({});

const form = ref({
  name: '',
  type: '',
  category: '',
  status: 'active',
  description: '',
  images: [] as string[],
  specifications: {
    minPages: null as number | null,
    maxPages: null as number | null,
    formats: [] as string[],
    orientations: [] as string[],
    materials: [] as string[],
  },
  pricing: {
    basePrice: null as number | null,
    pricePerPage: null as number | null,
    profitMargin: 30,
    maxDiscount: 20,
  },
  seo: {
    title: '',
    description: '',
  },
  tags: [] as string[],
});

// Computed
const availableCategories = computed(() => productsStore.categories);
const availableMaterials = computed(() => productsStore.materials);

const availableFormats = computed(() => [
  { value: 'A4', label: 'A4 (21x29.7cm)' },
  { value: 'A5', label: 'A5 (14.8x21cm)' },
  { value: 'A3', label: 'A3 (29.7x42cm)' },
  { value: 'square', label: 'Quadrado (20x20cm)' },
  { value: 'landscape', label: 'Paisagem (30x20cm)' },
  { value: 'portrait', label: 'Retrato (20x30cm)' },
]);

const availableOrientations = computed(() => [
  { value: 'portrait', label: 'Retrato' },
  { value: 'landscape', label: 'Paisagem' },
  { value: 'square', label: 'Quadrado' },
]);

const isFormValid = computed(() => {
  return form.value.name && 
         form.value.type && 
         form.value.pricing.basePrice !== null &&
         form.value.pricing.basePrice > 0;
});

// Métodos
const initializeForm = (): void => {
  if (props.product && props.mode === 'edit') {
    form.value = {
      name: props.product.name || '',
      type: props.product.type || '',
      category: props.product.category || '',
      status: props.product.status || 'active',
      description: props.product.description || '',
      images: props.product.images || [],
      specifications: {
        minPages: props.product.specifications?.minPages || null,
        maxPages: props.product.specifications?.maxPages || null,
        formats: props.product.specifications?.formats || [],
        orientations: props.product.specifications?.orientations || [],
        materials: props.product.specifications?.materials || [],
      },
      pricing: {
        basePrice: props.product.pricing?.basePrice || null,
        pricePerPage: props.product.pricing?.pricePerPage || null,
        profitMargin: props.product.pricing?.profitMargin || 30,
        maxDiscount: props.product.pricing?.maxDiscount || 20,
      },
      seo: {
        title: props.product.seo?.title || '',
        description: props.product.seo?.description || '',
      },
      tags: props.product.tags || [],
    };
  }
};

const validateField = (field: string): void => {
  errors.value[field] = '';
  
  switch (field) {
    case 'name':
      if (!form.value.name) {
        errors.value.name = 'Nome é obrigatório';
      } else if (form.value.name.length < 3) {
        errors.value.name = 'Nome deve ter pelo menos 3 caracteres';
      }
      break;
      
    case 'basePrice':
      if (!form.value.pricing.basePrice || form.value.pricing.basePrice <= 0) {
        errors.value.basePrice = 'Preço base é obrigatório e deve ser maior que zero';
      }
      break;
      
    case 'maxPages':
      if (form.value.specifications.minPages && 
          form.value.specifications.maxPages &&
          form.value.specifications.maxPages < form.value.specifications.minPages) {
        errors.value.maxPages = 'Páginas máximas deve ser maior que páginas mínimas';
      }
      break;
  }
};

const validateForm = (): boolean => {
  errors.value = {};
  
  validateField('name');
  validateField('basePrice');
  validateField('maxPages');
  
  if (!form.value.type) {
    errors.value.type = 'Tipo de produto é obrigatório';
  }
  
  return Object.keys(errors.value).length === 0;
};

const handleTypeChange = (): void => {
  // Limpar especificações específicas do tipo anterior
  if (form.value.type !== 'photobook' && form.value.type !== 'calendar') {
    form.value.specifications.minPages = null;
    form.value.specifications.maxPages = null;
    form.value.pricing.pricePerPage = null;
  }
};

const handleImageUpload = (images: string[]): void => {
  form.value.images = images;
};

const handleImageRemove = (index: number): void => {
  form.value.images.splice(index, 1);
};

const handleSubmit = async (): Promise<void> => {
  if (!validateForm()) {
    return;
  }
  
  loading.value = true;
  
  try {
    const productData = {
      ...form.value,
      // Limpar campos nulos/vazios
      specifications: Object.fromEntries(
        Object.entries(form.value.specifications).filter(([_, value]) => 
          value !== null && value !== '' && 
          (Array.isArray(value) ? value.length > 0 : true)
        )
      ),
      pricing: Object.fromEntries(
        Object.entries(form.value.pricing).filter(([_, value]) => 
          value !== null && value !== ''
        )
      ),
    };
    
    emit('save', productData);
  } catch (error) {
    console.error('Erro ao salvar produto:', error);
  } finally {
    loading.value = false;
  }
};

// Watchers
watch(() => form.value.name, (newName) => {
  if (newName && !form.value.seo.title) {
    form.value.seo.title = newName;
  }
});

watch(() => form.value.description, (newDescription) => {
  if (newDescription && !form.value.seo.description) {
    form.value.seo.description = newDescription.substring(0, 160);
  }
});

// Lifecycle
onMounted(() => {
  initializeForm();
  productsStore.loadCategories();
  productsStore.loadMaterials();
});
</script>

<style scoped>
.product-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 1rem;
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.price-input {
  position: relative;
  display: flex;
  align-items: center;
}

.currency {
  position: absolute;
  left: 0.75rem;
  color: #6b7280;
  font-weight: 500;
  z-index: 1;
}

.price-input .form-input {
  padding-left: 2.5rem;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.material-option {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.material-option:hover {
  border-color: #2563eb;
  background: #f8fafc;
}

.material-label {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
}

.material-info {
  flex: 1;
}

.material-name {
  display: block;
  font-weight: 500;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.material-description {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
}

.field-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f9fafb;
}

/* Responsivo */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .materials-grid {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
  }
}
</style>