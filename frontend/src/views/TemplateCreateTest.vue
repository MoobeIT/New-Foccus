<template>
  <div class="template-create-test p-8">
    <h1 class="text-2xl font-bold mb-6">Teste de Criação de Template</h1>
    
    <div class="space-y-4">
      <button
        @click="testCreateTemplate"
        :disabled="loading"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {{ loading ? 'Criando...' : 'Testar Criação de Template' }}
      </button>
      
      <button
        @click="openModal"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-4"
      >
        Abrir Modal de Criação
      </button>
    </div>
    
    <div v-if="result" class="mt-6 p-4 bg-gray-100 rounded">
      <h3 class="font-bold">Resultado:</h3>
      <pre class="mt-2 text-sm">{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
    
    <div v-if="error" class="mt-6 p-4 bg-red-100 text-red-700 rounded">
      <h3 class="font-bold">Erro:</h3>
      <p>{{ error }}</p>
    </div>
    
    <!-- Modal de Criação -->
    <TemplateCreateModal
      :show="showModal"
      @close="showModal = false"
      @created="handleTemplateCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTemplatesStore } from '@/stores/templates'
import { useAuthStore } from '@/stores/auth'
import TemplateCreateModal from '@/components/admin/TemplateCreateModal.vue'

const templatesStore = useTemplatesStore()
const authStore = useAuthStore()

const loading = ref(false)
const result = ref(null)
const error = ref('')
const showModal = ref(false)

const testCreateTemplate = async () => {
  loading.value = true
  error.value = ''
  result.value = null
  
  try {
    // Fazer login primeiro se não estiver logado
    if (!authStore.isAuthenticated) {
      console.log('🔐 Fazendo login...')
      await authStore.login('admin@editorprodutos.com', 'password')
    }
    
    console.log('✅ Usuário logado:', authStore.user)
    
    const templateData = {
      name: `Template Teste ${Date.now()}`,
      description: 'Template criado via teste automatizado',
      productType: 'fotolivro',
      templateType: 'custom',
      category: 'user-created',
      config: {
        format: 'quadrado',
        pages: 20,
        coverType: 'dura',
        margin: 10,
        spine: 5
      },
      tags: ['teste', 'automatizado']
    }
    
    console.log('📤 Criando template:', templateData)
    
    const newTemplate = await templatesStore.createTemplate(templateData)
    
    result.value = newTemplate
    console.log('✅ Template criado com sucesso:', newTemplate)
    
  } catch (err) {
    console.error('❌ Erro no teste:', err)
    error.value = err instanceof Error ? err.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
}

const openModal = () => {
  showModal.value = true
}

const handleTemplateCreated = (template: any) => {
  result.value = template
  console.log('✅ Template criado via modal:', template)
}
</script>