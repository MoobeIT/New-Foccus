<template>
  <div class="address-form">
    <h2 class="form-title">{{ title }}</h2>
    
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="cep">CEP *</label>
        <div class="cep-input">
          <input
            id="cep"
            v-model="form.cep"
            type="text"
            required
            placeholder="00000-000"
            maxlength="9"
            :class="{ 'input-error': errors.cep }"
            @input="formatCep"
            @blur="searchCep"
          />
          <span v-if="loadingCep" class="cep-loading">Buscando...</span>
        </div>
        <span v-if="errors.cep" class="error-message">{{ errors.cep }}</span>
      </div>

      <div class="form-row">
        <div class="form-group flex-2">
          <label for="street">Rua *</label>
          <input
            id="street"
            v-model="form.street"
            type="text"
            required
            placeholder="Nome da rua"
            :class="{ 'input-error': errors.street }"
          />
          <span v-if="errors.street" class="error-message">{{ errors.street }}</span>
        </div>
        
        <div class="form-group flex-1">
          <label for="number">Número *</label>
          <input
            id="number"
            v-model="form.number"
            type="text"
            required
            placeholder="123"
            :class="{ 'input-error': errors.number }"
          />
          <span v-if="errors.number" class="error-message">{{ errors.number }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="complement">Complemento</label>
        <input
          id="complement"
          v-model="form.complement"
          type="text"
          placeholder="Apto, bloco, etc."
        />
      </div>

      <div class="form-group">
        <label for="neighborhood">Bairro *</label>
        <input
          id="neighborhood"
          v-model="form.neighborhood"
          type="text"
          required
          placeholder="Nome do bairro"
          :class="{ 'input-error': errors.neighborhood }"
        />
        <span v-if="errors.neighborhood" class="error-message">{{ errors.neighborhood }}</span>
      </div>

      <div class="form-row">
        <div class="form-group flex-2">
          <label for="city">Cidade *</label>
          <input
            id="city"
            v-model="form.city"
            type="text"
            required
            placeholder="Nome da cidade"
            :class="{ 'input-error': errors.city }"
          />
          <span v-if="errors.city" class="error-message">{{ errors.city }}</span>
        </div>
        
        <div class="form-group flex-1">
          <label for="state">Estado *</label>
          <select
            id="state"
            v-model="form.state"
            required
            :class="{ 'input-error': errors.state }"
          >
            <option value="">Selecione</option>
            <option v-for="state in states" :key="state.uf" :value="state.uf">
              {{ state.uf }}
            </option>
          </select>
          <span v-if="errors.state" class="error-message">{{ errors.state }}</span>
        </div>
      </div>

      <div class="form-group">
        <label for="reference">Referência</label>
        <input
          id="reference"
          v-model="form.reference"
          type="text"
          placeholder="Próximo a..."
        />
      </div>

      <div class="form-actions">
        <button v-if="showBack" type="button" class="btn-secondary" @click="$emit('back')">
          Voltar
        </button>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? 'Salvando...' : 'Continuar' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, defineProps, defineEmits, watch } from 'vue';

interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  reference?: string;
}

const props = defineProps<{
  title?: string;
  initialData?: Partial<Address>;
  loading?: boolean;
  showBack?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: Address): void;
  (e: 'back'): void;
}>();

const states = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

const form = reactive<Address>({
  cep: props.initialData?.cep || '',
  street: props.initialData?.street || '',
  number: props.initialData?.number || '',
  complement: props.initialData?.complement || '',
  neighborhood: props.initialData?.neighborhood || '',
  city: props.initialData?.city || '',
  state: props.initialData?.state || '',
  country: 'Brasil',
  reference: props.initialData?.reference || '',
});

const errors = reactive<Record<string, string>>({});
const loadingCep = ref(false);

watch(() => props.initialData, (newData) => {
  if (newData) {
    Object.assign(form, newData);
  }
}, { deep: true });

const formatCep = (e: Event) => {
  const input = e.target as HTMLInputElement;
  let value = input.value.replace(/\D/g, '');
  
  if (value.length > 5) {
    value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  }
  
  form.cep = value;
};

const searchCep = async () => {
  const cep = form.cep.replace(/\D/g, '');
  
  if (cep.length !== 8) return;
  
  loadingCep.value = true;
  errors.cep = '';
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      errors.cep = 'CEP não encontrado';
      return;
    }
    
    form.street = data.logradouro || '';
    form.neighborhood = data.bairro || '';
    form.city = data.localidade || '';
    form.state = data.uf || '';
  } catch (error) {
    errors.cep = 'Erro ao buscar CEP';
  } finally {
    loadingCep.value = false;
  }
};

const validate = (): boolean => {
  Object.keys(errors).forEach(key => delete errors[key]);
  
  if (!form.cep.trim()) {
    errors.cep = 'CEP é obrigatório';
  }
  
  if (!form.street.trim()) {
    errors.street = 'Rua é obrigatória';
  }
  
  if (!form.number.trim()) {
    errors.number = 'Número é obrigatório';
  }
  
  if (!form.neighborhood.trim()) {
    errors.neighborhood = 'Bairro é obrigatório';
  }
  
  if (!form.city.trim()) {
    errors.city = 'Cidade é obrigatória';
  }
  
  if (!form.state) {
    errors.state = 'Estado é obrigatório';
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
.address-form {
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
  display: flex;
  gap: 1rem;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

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

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group input.input-error,
.form-group select.input-error {
  border-color: #ef4444;
}

.cep-input {
  position: relative;
}

.cep-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #6b7280;
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
  gap: 1rem;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
