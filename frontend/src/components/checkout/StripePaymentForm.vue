<template>
  <div class="stripe-payment-form">
    <div v-if="loading" class="loading-state">
      <div class="spinner" />
      <p>Carregando...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <p class="error-message">{{ error }}</p>
      <button class="btn-retry" @click="initializeStripe">Tentar novamente</button>
    </div>

    <template v-else>
      <!-- Card Element Container -->
      <div class="form-group">
        <label>Dados do Cartão</label>
        <div 
          ref="cardElementRef" 
          class="card-element"
          :class="{ 'card-element--error': cardError }"
        />
        <span v-if="cardError" class="card-error">{{ cardError }}</span>
      </div>

      <!-- Billing Details -->
      <div class="form-group">
        <label for="cardholderName">Nome no Cartão *</label>
        <input
          id="cardholderName"
          v-model="billingDetails.name"
          type="text"
          placeholder="Como está no cartão"
          required
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="billingEmail">E-mail *</label>
          <input
            id="billingEmail"
            v-model="billingDetails.email"
            type="email"
            placeholder="seu@email.com"
            required
          />
        </div>
        <div class="form-group">
          <label for="billingPhone">Telefone</label>
          <input
            id="billingPhone"
            v-model="billingDetails.phone"
            type="tel"
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <!-- Save Card Option -->
      <div v-if="allowSaveCard" class="form-group checkbox-group">
        <label class="checkbox-label">
          <input v-model="saveCard" type="checkbox" />
          <span>Salvar cartão para compras futuras</span>
        </label>
      </div>

      <!-- Submit Button -->
      <button
        class="btn-pay"
        :disabled="processing || !isFormValid"
        @click="handlePayment"
      >
        <span v-if="processing" class="btn-loading">
          <span class="spinner-small" />
          Processando...
        </span>
        <span v-else>
          Pagar R$ {{ formatAmount(amount) }}
        </span>
      </button>

      <!-- Security Badge -->
      <div class="security-info">
        <span class="lock-icon">🔒</span>
        <span>Pagamento seguro processado pelo Stripe</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, defineProps, defineEmits } from 'vue';
import stripeService from '@/services/stripe';

const props = defineProps<{
  amount: number;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  allowSaveCard?: boolean;
}>();

const emit = defineEmits<{
  (e: 'success', data: { paymentIntentId: string }): void;
  (e: 'error', error: string): void;
  (e: 'processing', isProcessing: boolean): void;
}>();

const cardElementRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const cardError = ref<string | null>(null);
const processing = ref(false);
const saveCard = ref(false);
const clientSecret = ref<string | null>(null);

const billingDetails = reactive({
  name: props.customerName || '',
  email: props.customerEmail || '',
  phone: '',
});

const isFormValid = computed(() => {
  return billingDetails.name.trim() && billingDetails.email.trim() && !cardError.value;
});

onMounted(async () => {
  await initializeStripe();
});

onUnmounted(() => {
  stripeService.unmountCardElement();
});

const initializeStripe = async () => {
  loading.value = true;
  error.value = null;

  try {
    // Initialize Stripe
    await stripeService.initialize();

    // Create Payment Intent
    const result = await stripeService.createPaymentIntent({
      amount: props.amount,
      description: props.description,
      customerEmail: props.customerEmail,
      customerName: props.customerName,
      metadata: props.metadata,
      savePaymentMethod: props.allowSaveCard,
    });

    clientSecret.value = result.clientSecret;

    // Mount card element after DOM is ready
    setTimeout(() => {
      if (cardElementRef.value) {
        const element = stripeService.mountCardElement(cardElementRef.value);
        if (element) {
          element.on('change', (event: any) => {
            cardError.value = event.error ? event.error.message : null;
          });
        }
      }
    }, 100);

    loading.value = false;
  } catch (err: any) {
    error.value = err.message || 'Erro ao inicializar pagamento';
    loading.value = false;
  }
};

const handlePayment = async () => {
  if (!clientSecret.value || processing.value) return;

  processing.value = true;
  emit('processing', true);

  try {
    const result = await stripeService.confirmCardPayment(clientSecret.value, {
      name: billingDetails.name,
      email: billingDetails.email,
      phone: billingDetails.phone || undefined,
    });

    if (result.success && result.paymentIntentId) {
      emit('success', { paymentIntentId: result.paymentIntentId });
    } else {
      cardError.value = result.error || 'Pagamento não foi concluído';
      emit('error', result.error || 'Payment failed');
    }
  } catch (err: any) {
    cardError.value = err.message;
    emit('error', err.message);
  } finally {
    processing.value = false;
    emit('processing', false);
  }
};

const formatAmount = (amount: number): string => {
  return amount.toFixed(2).replace('.', ',');
};
</script>

<style scoped>
.stripe-payment-form {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  color: #ef4444;
  margin-bottom: 1rem;
}

.btn-retry {
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
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
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.card-element {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.card-element:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.card-element--error {
  border-color: #ef4444;
}

.card-error {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.checkbox-group {
  margin-top: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #4b5563;
}

.btn-pay {
  width: 100%;
  padding: 1rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 1.5rem;
}

.btn-pay:hover:not(:disabled) {
  background: #059669;
}

.btn-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.security-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.lock-icon {
  font-size: 1rem;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
