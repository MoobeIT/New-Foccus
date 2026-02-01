<template>
  <div class="template-test">
    <h1>Teste de Templates</h1>
    
    <div class="test-section">
      <h2>Status da API</h2>
      <p>Loading: {{ isLoading }}</p>
      <p>Error: {{ error }}</p>
      <p>Templates Count: {{ templates.length }}</p>
    </div>
    
    <div class="test-actions">
      <button @click="testFetch" class="test-btn">
        Testar Fetch Templates
      </button>
      
      <button @click="testDirectAPI" class="test-btn">
        Testar API Direta
      </button>
    </div>
    
    <div class="test-results">
      <h3>Resultados:</h3>
      <pre>{{ JSON.stringify(templates, null, 2) }}</pre>
    </div>
    
    <div class="test-logs">
      <h3>Logs:</h3>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        {{ log }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTemplatesStore } from '@/stores/templates';

const templatesStore = useTemplatesStore();
const logs = ref<string[]>([]);

const isLoading = computed(() => templatesStore.isLoading);
const error = computed(() => templatesStore.error);
const templates = computed(() => templatesStore.templates);

const addLog = (message: string) => {
  logs.value.push(`${new Date().toLocaleTimeString()}: ${message}`);
};

const testFetch = async () => {
  addLog('Iniciando teste fetchTemplates...');
  
  try {
    await templatesStore.fetchTemplates();
    addLog(`Sucesso! ${templates.value.length} templates carregados`);
  } catch (err) {
    addLog(`Erro: ${err}`);
  }
};

const testDirectAPI = async () => {
  addLog('Testando API direta...');
  
  try {
    const response = await fetch('/api/v1/templates');
    addLog(`Status da resposta: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      addLog(`Dados recebidos: ${JSON.stringify(data)}`);
    } else {
      addLog(`Erro HTTP: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    addLog(`Erro de rede: ${err}`);
  }
};
</script>

<style scoped>
.template-test {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.test-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.test-btn {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.test-btn:hover {
  background: #0056b3;
}

.test-results,
.test-logs {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.test-results pre {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.log-item {
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
  font-family: monospace;
  font-size: 0.875rem;
}
</style>