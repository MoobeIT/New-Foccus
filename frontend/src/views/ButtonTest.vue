<template>
  <div class="button-test">
    <h1>Teste do Botão Criar Template</h1>
    
    <div class="test-section">
      <h2>Estado das Variáveis</h2>
      <p>showDesigner: {{ showDesigner }}</p>
      <p>designerMode: {{ designerMode }}</p>
      <p>selectedTemplate: {{ selectedTemplate }}</p>
    </div>
    
    <div class="test-buttons">
      <button @click="testOpenDesigner" class="test-btn">
        ✨ Testar Criar Template
      </button>
      
      <button @click="toggleModal" class="test-btn">
        Toggle Modal Direto
      </button>
    </div>
    
    <!-- Modal de Teste -->
    <Modal
      v-if="showDesigner"
      :show="showDesigner"
      size="xl"
      @close="closeDesigner"
    >
      <div class="modal-content">
        <h2>Modal Funcionando!</h2>
        <p>Mode: {{ designerMode }}</p>
        <p>Template: {{ selectedTemplate }}</p>
        
        <TemplateDesignerSimple
          :template="selectedTemplate"
          :mode="designerMode"
          @save="handleSave"
          @close="closeDesigner"
        />
      </div>
    </Modal>
    
    <div class="logs">
      <h3>Logs:</h3>
      <div v-for="(log, index) in logs" :key="index" class="log-item">
        {{ log }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Modal from '@/components/common/Modal.vue';
import TemplateDesignerSimple from '@/components/admin/TemplateDesignerSimple.vue';

const showDesigner = ref(false);
const designerMode = ref<'create' | 'edit'>('create');
const selectedTemplate = ref(null);
const logs = ref<string[]>([]);

const addLog = (message: string) => {
  logs.value.push(`${new Date().toLocaleTimeString()}: ${message}`);
};

const testOpenDesigner = () => {
  addLog('testOpenDesigner chamado');
  
  selectedTemplate.value = null;
  designerMode.value = 'create';
  showDesigner.value = true;
  
  addLog(`Estado após openDesigner: showDesigner=${showDesigner.value}, mode=${designerMode.value}`);
};

const toggleModal = () => {
  addLog('toggleModal chamado');
  showDesigner.value = !showDesigner.value;
  addLog(`Modal toggled: ${showDesigner.value}`);
};

const closeDesigner = () => {
  addLog('closeDesigner chamado');
  showDesigner.value = false;
  selectedTemplate.value = null;
};

const handleSave = (templateData: any) => {
  addLog('handleSave chamado');
  addLog(`Template data: ${JSON.stringify(templateData)}`);
  closeDesigner();
};
</script>

<style scoped>
.button-test {
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

.test-buttons {
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

.modal-content {
  padding: 2rem;
}

.logs {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 0.25rem 0;
  border-bottom: 1px solid #dee2e6;
  font-family: monospace;
  font-size: 0.875rem;
}
</style>