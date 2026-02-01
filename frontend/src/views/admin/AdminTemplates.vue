<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header Simples -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-900">Gestão de Templates</h1>
        <button
          @click="handleLogout"
          class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
        >
          Sair
        </button>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Ações -->
      <div class="mb-6 flex justify-between items-center">
        <div class="flex gap-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar templates..."
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          @click="openCreateModal"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          ✨ Criar Template
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="mt-4 text-gray-600">Carregando templates...</p>
      </div>

      <!-- Lista de Templates -->
      <div v-else-if="filteredTemplates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="template in filteredTemplates"
          :key="template.id"
          class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <h3 class="text-lg font-semibold text-gray-900 mb-2">{{ template.name }}</h3>
          <p class="text-sm text-gray-600 mb-4">{{ template.productType }}</p>
          <div class="flex gap-2">
            <span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {{ template.templateType }}
            </span>
            <span v-if="template.status" class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
              {{ template.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12 bg-white rounded-lg shadow">
        <div class="text-6xl mb-4">🎨</div>
        <h3 class="text-xl font-semibold text-gray-900 mb-2">Nenhum template encontrado</h3>
        <p class="text-gray-600 mb-6">Comece criando seu primeiro template</p>
        <button
          @click="openCreateModal"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Criar Primeiro Template
        </button>
      </div>
    </main>

    <!-- Modal de Criação -->
    <TemplateCreateModal
      :show="showCreateModal"
      @close="closeCreateModal"
      @created="handleTemplateCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTemplatesStore } from '@/stores/templates'
import { useNotificationStore } from '@/stores/notifications'
import TemplateCreateModal from '@/components/admin/TemplateCreateModal.vue'

const router = useRouter()
const authStore = useAuthStore()
const templatesStore = useTemplatesStore()
const notificationStore = useNotificationStore()

const searchQuery = ref('')
const showCreateModal = ref(false)
const loading = ref(false)

const filteredTemplates = computed(() => {
  if (!searchQuery.value) {
    return templatesStore.templates
  }
  
  const query = searchQuery.value.toLowerCase()
  return templatesStore.templates.filter(t => 
    t.name.toLowerCase().includes(query) ||
    t.productType?.toLowerCase().includes(query)
  )
})

const loadTemplates = async () => {
  loading.value = true
  try {
    await templatesStore.fetchTemplates()
  } catch (error) {
    console.error('Erro ao carregar templates:', error)
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  console.log('✨ Abrindo modal de criação')
  showCreateModal.value = true
}

const closeCreateModal = () => {
  console.log('❌ Fechando modal de criação')
  showCreateModal.value = false
}

const handleTemplateCreated = async (template: any) => {
  console.log('✅ Template criado:', template)
  closeCreateModal()
  await loadTemplates()
  
  notificationStore.addNotification({
    type: 'success',
    title: 'Template criado!',
    message: `Template "${template.name}" foi criado com sucesso.`
  })
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadTemplates()
})
</script>
