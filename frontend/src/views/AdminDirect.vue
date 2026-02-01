<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h1 class="text-2xl font-bold mb-4">🔓 Acesso Direto ao Admin (Desenvolvimento)</h1>
        <p class="text-gray-600 mb-4">Esta página permite acesso direto ao painel admin para testes.</p>
        
        <div class="space-y-4">
          <button
            @click="loginAndRedirect"
            :disabled="loading"
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading ? 'Fazendo login...' : '🚀 Fazer Login e Ir para Admin' }}
          </button>
          
          <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
            {{ error }}
          </div>
          
          <div v-if="success" class="p-4 bg-green-100 text-green-700 rounded">
            ✅ Login realizado! Redirecionando...
          </div>
          
          <div class="p-4 bg-gray-50 rounded">
            <h3 class="font-bold mb-2">Credenciais:</h3>
            <p><strong>Email:</strong> admin@editorprodutos.com</p>
            <p><strong>Senha:</strong> password</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')
const success = ref(false)

const loginAndRedirect = async () => {
  loading.value = true
  error.value = ''
  success.value = false
  
  try {
    console.log('🔐 Fazendo login automático...')
    
    const loginSuccess = await authStore.login({
      email: 'admin@editorprodutos.com',
      password: 'password'
    })
    
    if (loginSuccess) {
      console.log('✅ Login bem-sucedido!')
      success.value = true
      
      setTimeout(() => {
        router.push('/admin')
      }, 1000)
    } else {
      error.value = 'Falha no login. Verifique as credenciais.'
    }
  } catch (err) {
    console.error('❌ Erro no login:', err)
    error.value = err instanceof Error ? err.message : 'Erro desconhecido'
  } finally {
    loading.value = false
  }
}
</script>
