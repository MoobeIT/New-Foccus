<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
      <h2 class="text-2xl font-bold text-center">Login Test</h2>
      
      <form @submit.prevent="testLogin">
        <div class="space-y-4">
          <div>
            <label>Email:</label>
            <input 
              v-model="email" 
              type="email" 
              class="w-full p-2 border rounded"
              placeholder="admin@editorprodutos.com"
            />
          </div>
          
          <div>
            <label>Senha:</label>
            <input 
              v-model="password" 
              type="password" 
              class="w-full p-2 border rounded"
              placeholder="password"
            />
          </div>
          
          <button 
            type="submit" 
            class="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
            :disabled="loading"
          >
            {{ loading ? 'Carregando...' : 'Entrar' }}
          </button>
        </div>
      </form>
      
      <div v-if="message" class="p-4 rounded" :class="messageClass">
        {{ message }}
      </div>
      
      <div class="text-sm text-gray-600">
        <p>Debug Info:</p>
        <p>Email: {{ email }}</p>
        <p>Password: {{ password }}</p>
        <p>Loading: {{ loading }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const email = ref('admin@editorprodutos.com');
const password = ref('password');
const loading = ref(false);
const message = ref('');
const messageClass = ref('');

const testLogin = async () => {
  console.log('testLogin chamado');
  console.log('Email:', email.value);
  console.log('Password:', password.value);
  
  loading.value = true;
  message.value = '';
  
  try {
    console.log('Fazendo requisição para /api/auth/login');
    
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.value,
        password: password.value,
      }),
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      message.value = `Login bem-sucedido! Token: ${data.token?.substring(0, 20)}...`;
      messageClass.value = 'bg-green-100 text-green-800';
    } else {
      message.value = `Erro: ${data.error || 'Erro desconhecido'}`;
      messageClass.value = 'bg-red-100 text-red-800';
    }
  } catch (error) {
    console.error('Erro na requisição:', error);
    message.value = `Erro de rede: ${error.message}`;
    messageClass.value = 'bg-red-100 text-red-800';
  } finally {
    loading.value = false;
  }
};
</script>