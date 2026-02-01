<template>
  <Modal
    :show="show"
    title="Criar Template de Fotolivro"
    size="xl"
    @close="$emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Informações Básicas -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Nome do Template"
          :error="errors.name"
          required
        >
          <input
            v-model="form.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Template Clássico"
          />
        </FormField>

        <FormField
          label="Tipo de Produto"
          :error="errors.productType"
          required
        >
          <select
            v-model="form.productType"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione o tipo</option>
            <option value="fotolivro">Fotolivro</option>
            <option value="calendario">Calendário</option>
            <option value="cartao">Cartão</option>
          </select>
        </FormField>
      </div>

      <!-- Descrição -->
      <FormField
        label="Descrição"
        :error="errors.description"
      >
        <textarea
          v-model="form.description"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Descreva o template..."
        ></textarea>
      </FormField>

      <!-- Configurações Específicas para Fotolivro -->
      <div v-if="form.productType === 'fotolivro'" class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Configurações do Fotolivro</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Formato" :error="errors.format">
            <select
              v-model="form.format"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="quadrado">Quadrado (20x20cm)</option>
              <option value="retangular">Retangular (21x28cm)</option>
              <option value="paisagem">Paisagem (28x21cm)</option>
            </select>
          </FormField>

          <FormField label="Número de Páginas" :error="errors.pages">
            <select
              v-model="form.pages"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="20">20 páginas</option>
              <option value="40">40 páginas</option>
              <option value="60">60 páginas</option>
              <option value="80">80 páginas</option>
            </select>
          </FormField>

          <FormField label="Tipo de Capa" :error="errors.coverType">
            <select
              v-model="form.coverType"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="dura">Capa Dura</option>
              <option value="mole">Capa Mole</option>
            </select>
          </FormField>
        </div>

        <!-- Configurações de Layout -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Margem (mm)" :error="errors.margin">
            <input
              v-model.number="form.margin"
              type="number"
              min="5"
              max="20"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          <FormField label="Lombada (mm)" :error="errors.spine">
            <input
              v-model.number="form.spine"
              type="number"
              min="2"
              max="10"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </div>
      </div>

      <!-- Tags -->
      <FormField
        label="Tags"
        :error="errors.tags"
      >
        <TagInput
          v-model="form.tags"
          placeholder="Adicione tags para categorizar o template"
        />
      </FormField>

      <!-- Preview Upload -->
      <FormField
        label="Imagem de Preview"
        :error="errors.preview"
      >
        <ImageUploader
          v-model="form.preview"
          accept="image/*"
          :max-size="5"
          preview-class="w-32 h-32"
        />
      </FormField>

      <!-- Botões -->
      <div class="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </button>
        <button
          type="submit"
          :disabled="loading"
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LoadingSpinner v-if="loading" size="sm" class="mr-2" />
          {{ loading ? 'Criando...' : 'Criar Template' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useTemplatesStore } from '@/stores/templates'
import { useNotificationStore } from '@/stores/notifications'
import Modal from '@/components/common/Modal.vue'
import FormField from '@/components/common/FormField.vue'
import TagInput from '@/components/common/TagInput.vue'
import ImageUploader from '@/components/common/ImageUploader.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'created', template: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const templatesStore = useTemplatesStore()
const notificationsStore = useNotificationStore()

const loading = ref(false)
const errors = ref<Record<string, string>>({})

const form = reactive({
  name: '',
  description: '',
  productType: 'fotolivro',
  format: 'quadrado',
  pages: 20,
  coverType: 'dura',
  margin: 10,
  spine: 5,
  tags: [] as string[],
  preview: null as File | null
})

// Reset form when modal closes
watch(() => props.show, (newShow) => {
  if (!newShow) {
    resetForm()
  }
})

const resetForm = () => {
  Object.assign(form, {
    name: '',
    description: '',
    productType: 'fotolivro',
    format: 'quadrado',
    pages: 20,
    coverType: 'dura',
    margin: 10,
    spine: 5,
    tags: [],
    preview: null
  })
  errors.value = {}
}

const validateForm = () => {
  errors.value = {}
  
  if (!form.name.trim()) {
    errors.value.name = 'Nome é obrigatório'
  }
  
  if (!form.productType) {
    errors.value.productType = 'Tipo de produto é obrigatório'
  }
  
  if (form.productType === 'fotolivro') {
    if (!form.format) {
      errors.value.format = 'Formato é obrigatório'
    }
    
    if (!form.pages || form.pages < 20) {
      errors.value.pages = 'Número de páginas deve ser pelo menos 20'
    }
    
    if (form.margin < 5 || form.margin > 20) {
      errors.value.margin = 'Margem deve estar entre 5 e 20mm'
    }
    
    if (form.spine < 2 || form.spine > 10) {
      errors.value.spine = 'Lombada deve estar entre 2 e 10mm'
    }
  }
  
  return Object.keys(errors.value).length === 0
}

const handleSubmit = async () => {
  console.log('🚀 [MODAL] Iniciando criação de template...')
  console.log('📋 [MODAL] Estado do formulário:', {
    name: form.name,
    productType: form.productType,
    description: form.description
  })
  
  if (!validateForm()) {
    console.log('❌ [MODAL] Validação falhou:', errors.value)
    notificationsStore.addNotification({
      type: 'error',
      title: 'Erro de validação',
      message: 'Por favor, preencha todos os campos obrigatórios'
    })
    return
  }
  
  loading.value = true
  console.log('⏳ [MODAL] Loading ativado')
  
  try {
    const templateData = {
      name: form.name,
      description: form.description,
      productType: form.productType,
      templateType: 'custom',
      category: 'user-created',
      config: {
        format: form.format,
        pages: form.pages,
        coverType: form.coverType,
        margin: form.margin,
        spine: form.spine
      },
      tags: form.tags
    }
    
    console.log('📤 [MODAL] Dados preparados:', templateData)
    console.log('🔑 [MODAL] Token disponível:', !!localStorage.getItem('accessToken'))
    
    const newTemplate = await templatesStore.createTemplate(templateData)
    
    console.log('✅ [MODAL] Template criado com sucesso:', newTemplate)
    
    notificationsStore.addNotification({
      type: 'success',
      title: 'Template criado!',
      message: `Template "${form.name}" foi criado com sucesso.`
    })
    
    emit('created', newTemplate)
    emit('close')
    
  } catch (error) {
    console.error('❌ [MODAL] Erro ao criar template:', error)
    
    notificationsStore.addNotification({
      type: 'error',
      title: 'Erro ao criar template',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    })
  } finally {
    loading.value = false
    console.log('✋ [MODAL] Loading desativado')
  }
}
</script>