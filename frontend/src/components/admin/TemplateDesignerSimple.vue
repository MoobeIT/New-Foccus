<template>
  <div class="template-designer-simple">
    <h2>Criar Template Simples</h2>
    
    <form @submit.prevent="handleSave">
      <div class="form-group">
        <label>Nome do Template:</label>
        <input v-model="form.name" type="text" placeholder="Ex: Capa Elegante" />
      </div>
      
      <div class="form-group">
        <label>Tipo de Produto:</label>
        <select v-model="form.productType">
          <option value="">Selecione</option>
          <option value="fotolivro">Fotolivro</option>
          <option value="calendario">Calendário</option>
          <option value="cartao">Cartão</option>
        </select>
      </div>
      
      <div class="form-group" v-if="form.productType">
        <label>Tipo de Template:</label>
        <select v-model="form.templateType">
          <option value="">Selecione</option>
          <option v-if="form.productType === 'fotolivro'" value="cover">Capa</option>
          <option v-if="form.productType === 'fotolivro'" value="page">Página</option>
          <option v-if="form.productType === 'calendario'" value="page">Página Mensal</option>
          <option v-if="form.productType === 'cartao'" value="card">Cartão</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Categoria:</label>
        <input v-model="form.category" type="text" placeholder="Ex: elegante" />
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$emit('close')">Cancelar</button>
        <button type="submit" :disabled="!isValid">Salvar Template</button>
      </div>
    </form>
    
    <div class="debug-info">
      <h3>Debug Info:</h3>
      <p>Nome: {{ form.name }}</p>
      <p>Produto: {{ form.productType }}</p>
      <p>Template: {{ form.templateType }}</p>
      <p>Categoria: {{ form.category }}</p>
      <p>Válido: {{ isValid }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const emit = defineEmits<{
  save: [template: any];
  close: [];
}>();

const form = ref({
  name: '',
  productType: '',
  templateType: '',
  category: '',
  dimensions: { width: 210, height: 297, unit: 'mm' },
  margins: { top: 10, right: 10, bottom: 10, left: 10 },
  safeArea: { top: 5, right: 5, bottom: 5, left: 5 },
  elements: [],
  colors: ['#2c3e50', '#ecf0f1'],
  fonts: ['Roboto'],
  tags: [],
});

const isValid = computed(() => {
  return form.value.name && 
         form.value.productType && 
         form.value.templateType;
});

const handleSave = () => {
  console.log('handleSave chamado no TemplateDesignerSimple');
  console.log('Form data:', form.value);
  console.log('Is valid:', isValid.value);
  
  if (!isValid.value) {
    console.log('Form inválido');
    return;
  }
  
  console.log('Emitindo save event...');
  emit('save', { ...form.value });
};
</script>

<style scoped>
.template-designer-simple {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.form-actions button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.form-actions button[type="submit"] {
  background: #007bff;
  color: white;
}

.form-actions button[type="submit"]:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.form-actions button[type="button"] {
  background: #6c757d;
  color: white;
}

.debug-info {
  margin-top: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.debug-info h3 {
  margin-top: 0;
}
</style>