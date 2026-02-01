<template>
  <div class="customer-form">
    <h2 class="form-title">Dados Pessoais</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">Nome *</label>
          <input
            id="firstName"
            v-model="form.firstName"
            type="text"
            required
            placeholder="Seu nome"
            :class="{ 'input-error': errors.firstName }"
          />
          <span v-if="errors.firstName" class="error-message">{{ errors.firstName }}</span>
        </div>
        
        <div class="form-group">
          <label for="lastName">Sobrenome *</label>
          <input
            id="lastName"
            v-model="form.lastName"
            type="text"
            required
            placeholder="Seu sobrenome"
            :class="{ 'input-error': errors.lastName }"
          />
          <span v-if="errors.lastName" class="error-message">{{ errors.lastName }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="email">E-mail *</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          required
          placeholder="seu@email.com"
          :class="{ 'input-error': errors.email }"
        />
        <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="phone">Telefone *</label>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            required
            placeholder="(11) 99999-9999"
            :class="{ 'input-error': errors.phone }"
            @input="formatPhone"
          />
          <span v-if="errors.phone" class="error-message">{{ errors.phone }}</span>
        </div>

        <div class="form-group">
          <label for="document">CPF/CNPJ *</label>
          <input
            id="document"
            v-model="form.document"
            type="text"
            required
            placeholder="000.000.000-00"
            :class="{ 'input-error': errors.document }"
            @input="formatDocument"
          />
          <span v-if="errors.document" class="error-message">{{ errors.document }}</span>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Salvando...' : 'Continuar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, defineProps, defineEmits, watch } from 'vue';

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
}

const props = defineProps<{
  initialData?: Partial<CustomerData>;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: CustomerData): void;
}>();

const form = reactive<CustomerData>({
  firstName: props.initialData?.firstName || '',
  lastName: props.initialData?.lastName || '',
  email: props.initialData?.email || '',
  phone: props.initialData?.phone || '',
  document: props.initialData?.document || '',
  documentType: 'cpf',
});

const errors = reactive<Record<string, string>>({});

watch(() => props.initialData, (newData) => {
  if (newData) {
    Object.assign(form, newData);
  }
}, { deep: true });

const formatPhone = (e: Event) => {
  const input = e.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d{5})(\d)/, '$1-$2');
  }
  
  form.phone = value;
};

const formatDocument = (e: Event) => {
  const input = e.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');
  
  if (value.length <= 11) {
    // CPF
    form.documentType = 'cpf';
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // CNPJ
    form.documentType = 'cnpj';
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  form.document = value;
};

const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key]);
  
  if (!form.firstName.trim()) {
    errors.firstName = 'Nome é obrigatório';
  }
  
  if (!form.lastName.trim()) {
    errors.lastName = 'Sobrenome é obrigatório';
  }
  
  if (!form.email.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'E-mail inválido';
  }
  
  if (!form.phone.trim()) {
    errors.phone = 'Telefone é obrigatório';
  }
  
  if (!form.document.trim()) {
    errors.document = 'CPF/CNPJ é obrigatório';
  }
  
  return Object.keys(errors).length === 0;
};

const handleSubmit = () => {
  if (validate()) {
    emit('submit', { ...form });
  }
};
</script>

<style scoped>
.customer-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.input-error {
  border-color: #ef4444;
}

.error-message {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.form-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
