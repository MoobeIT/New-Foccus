<template>
  <div class="payment-form">
    <h2 class="form-title">Forma de Pagamento</h2>
    
    <div class="payment-methods">
      <div
        v-for="method in paymentMethods"
        :key="method.id"
        class="payment-method"
        :class="{ 'payment-method--selected': selectedMethod === method.id }"
        @click="selectMethod(method.id)"
      >
        <div class="method-radio">
          <span v-if="selectedMethod === method.id" class="radio-checked" />
        </div>
        <div class="method-icon">{{ method.icon }}</div>
        <div class="method-info">
          <span class="method-name">{{ method.name }}</span>
          <span class="method-description">{{ method.description }}</span>
        </div>
      </div>
    </div>

    <!-- PIX Form -->
    <div v-if="selectedMethod === 'pix'" class="payment-details">
      <div class="pix-info">
        <div class="pix-icon">📱</div>
        <p>Ao finalizar, você receberá um QR Code para pagamento via PIX.</p>
        <p class="pix-discount">💰 5% de desconto no PIX!</p>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$emit('back')">
          Voltar
        </button>
        <button 
          type="button" 
          class="btn-primary" 
          :disabled="loading"
          @click="handlePixSubmit"
        >
          {{ loading ? 'Processando...' : 'Continuar com PIX' }}
        </button>
      </div>
    </div>

    <!-- Credit Card Form (Stripe) -->
    <div v-if="selectedMethod === 'credit_card'" class="payment-details">
      <StripePaymentForm
        :amount="total"
        :description="paymentDescription"
        :customer-email="customerEmail"
        :customer-name="customerName"
        :metadata="paymentMetadata"
        :allow-save-card="true"
        @success="handleStripeSuccess"
        @error="handleStripeError"
        @processing="handleStripeProcessing"
      />
      <div class="form-actions stripe-actions">
        <button type="button" class="btn-secondary" @click="$emit('back')">
          Voltar
        </button>
      </div>
    </div>

    <!-- Bank Slip Form -->
    <div v-if="selectedMethod === 'bank_slip'" class="payment-details">
      <div class="boleto-info">
        <div class="boleto-icon">📄</div>
        <p>O boleto será gerado após a finalização do pedido.</p>
        <p class="boleto-warning">⚠️ O prazo de validade é de 3 dias úteis.</p>
      </div>
      <div class="form-actions">
        <button type="button" class="btn-secondary" @click="$emit('back')">
          Voltar
        </button>
        <button 
          type="button" 
          class="btn-primary" 
          :disabled="loading"
          @click="handleBoletoSubmit"
        >
          {{ loading ? 'Processando...' : 'Gerar Boleto' }}
        </button>
      </div>
    </div>

    <!-- Default actions when no method selected -->
    <div v-if="!selectedMethod" class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('back')">
        Voltar
      </button>
      <button 
        type="button" 
        class="btn-primary" 
        disabled
      >
        Selecione uma forma de pagamento
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';
import StripePaymentForm from './StripePaymentForm.vue';

interface PaymentMethodData {
  type: 'pix' | 'credit_card' | 'debit_card' | 'bank_slip';
  stripePaymentIntentId?: string;
}

const props = defineProps<{
  total: number;
  loading?: boolean;
  customerEmail?: string;
  customerName?: string;
  orderId?: string;
}>();

const emit = defineEmits<{
  (e: 'submit', data: PaymentMethodData): void;
  (e: 'back'): void;
}>();

const paymentMethods = [
  { id: 'pix', name: 'PIX', description: 'Pagamento instantâneo - 5% desconto', icon: '⚡' },
  { id: 'credit_card', name: 'Cartão de Crédito', description: 'Pagamento seguro via Stripe', icon: '💳' },
  { id: 'bank_slip', name: 'Boleto Bancário', description: 'Vencimento em 3 dias', icon: '📄' },
];

const selectedMethod = ref<string>('');
const stripeProcessing = ref(false);

const paymentDescription = `Pedido ${props.orderId || 'Fotolivro'}`;
const paymentMetadata = {
  orderId: props.orderId || '',
  source: 'checkout',
};

const selectMethod = (method: string) => {
  selectedMethod.value = method;
};

const handlePixSubmit = () => {
  emit('submit', { type: 'pix' });
};

const handleBoletoSubmit = () => {
  emit('submit', { type: 'bank_slip' });
};

const handleStripeSuccess = (data: { paymentIntentId: string }) => {
  emit('submit', {
    type: 'credit_card',
    stripePaymentIntentId: data.paymentIntentId,
  });
};

const handleStripeError = (error: string) => {
  console.error('Stripe payment error:', error);
};

const handleStripeProcessing = (isProcessing: boolean) => {
  stripeProcessing.value = isProcessing;
};
</script>

<style scoped>
.payment-form {
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

.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.payment-method:hover {
  border-color: #3b82f6;
}

.payment-method--selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.method-radio {
  width: 20px;
  height: 20px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.payment-method--selected .method-radio {
  border-color: #3b82f6;
}

.radio-checked {
  width: 10px;
  height: 10px;
  background: #3b82f6;
  border-radius: 50%;
}

.method-icon {
  font-size: 1.5rem;
}

.method-info {
  display: flex;
  flex-direction: column;
}

.method-name {
  font-weight: 600;
  color: #1f2937;
}

.method-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.payment-details {
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.pix-info,
.boleto-info {
  text-align: center;
}

.pix-icon,
.boleto-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.pix-discount {
  color: #10b981;
  font-weight: 600;
  margin-top: 0.5rem;
}

.boleto-warning {
  color: #f59e0b;
  font-size: 0.875rem;
  margin-top: 0.5rem;
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

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  background: white;
}

.form-group input:focus,
.form-group select:focus {
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

.stripe-actions {
  margin-top: 1rem;
  justify-content: flex-start;
}
</style>
