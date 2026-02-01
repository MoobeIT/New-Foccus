<template>
  <div class="checkout-page">
    <div class="checkout-container">
      <header class="checkout-header">
        <h1>Finalizar Compra</h1>
        <button class="btn-back" @click="goBack">
          ← Voltar ao carrinho
        </button>
      </header>

      <CheckoutStepper
        :steps="steps"
        :current-step="currentStep"
        :allow-navigation="true"
        @update:current-step="currentStep = $event"
      />

      <div class="checkout-content">
        <div class="checkout-main">
          <!-- Step 1: Customer Data -->
          <CustomerForm
            v-if="currentStep === 0"
            :initial-data="checkoutSession?.customer"
            :loading="loading"
            @submit="handleCustomerSubmit"
          />

          <!-- Step 2: Shipping Address -->
          <AddressForm
            v-if="currentStep === 1"
            title="Endereço de Entrega"
            :initial-data="checkoutSession?.shippingAddress"
            :loading="loading"
            :show-back="true"
            @submit="handleAddressSubmit"
            @back="currentStep--"
          />

          <!-- Step 3: Payment -->
          <PaymentForm
            v-if="currentStep === 2"
            :total="checkoutSession?.orderSummary?.total || 0"
            :loading="loading"
            :customer-email="checkoutSession?.customer?.email"
            :customer-name="`${checkoutSession?.customer?.firstName || ''} ${checkoutSession?.customer?.lastName || ''}`.trim()"
            :order-id="checkoutSession?.id"
            @submit="handlePaymentSubmit"
            @back="currentStep--"
          />

          <!-- Step 4: Review -->
          <div v-if="currentStep === 3" class="review-step">
            <h2>Revisar Pedido</h2>
            
            <div class="review-sections">
              <div class="review-section">
                <h3>Dados Pessoais</h3>
                <p>{{ checkoutSession?.customer?.firstName }} {{ checkoutSession?.customer?.lastName }}</p>
                <p>{{ checkoutSession?.customer?.email }}</p>
                <p>{{ checkoutSession?.customer?.phone }}</p>
                <button class="btn-edit" @click="currentStep = 0">Editar</button>
              </div>

              <div class="review-section">
                <h3>Endereço de Entrega</h3>
                <p>{{ formatAddress(checkoutSession?.shippingAddress) }}</p>
                <button class="btn-edit" @click="currentStep = 1">Editar</button>
              </div>

              <div class="review-section">
                <h3>Forma de Pagamento</h3>
                <p>{{ formatPaymentMethod(checkoutSession?.paymentMethod) }}</p>
                <button class="btn-edit" @click="currentStep = 2">Editar</button>
              </div>
            </div>

            <div class="terms-section">
              <label class="checkbox-label">
                <input v-model="acceptedTerms" type="checkbox" />
                <span>Li e aceito os <a href="/termos" target="_blank">Termos de Uso</a> e <a href="/privacidade" target="_blank">Política de Privacidade</a></span>
              </label>
              
              <label class="checkbox-label">
                <input v-model="marketingConsent" type="checkbox" />
                <span>Desejo receber novidades e promoções por e-mail</span>
              </label>
            </div>

            <div class="form-actions">
              <button class="btn-secondary" @click="currentStep--">
                Voltar
              </button>
              <button 
                class="btn-primary btn-complete"
                :disabled="!acceptedTerms || loading"
                @click="completeCheckout"
              >
                {{ loading ? 'Processando...' : 'Finalizar Pedido' }}
              </button>
            </div>
          </div>
        </div>

        <aside class="checkout-sidebar">
          <OrderSummary
            :items="checkoutSession?.orderSummary?.items || []"
            :subtotal="checkoutSession?.orderSummary?.subtotal || 0"
            :discounts="checkoutSession?.orderSummary?.discounts || 0"
            :taxes="checkoutSession?.orderSummary?.taxes || 0"
            :shipping="checkoutSession?.orderSummary?.shipping || 0"
            :total="checkoutSession?.orderSummary?.total || 0"
            :shipping-method="checkoutSession?.orderSummary?.shippingMethod"
            :show-coupon="currentStep < 3"
            @apply-coupon="applyCoupon"
            @remove-coupon="removeCoupon"
          />
        </aside>
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessModal" class="modal-overlay">
      <div class="modal-content success-modal">
        <div class="success-icon">✓</div>
        <h2>Pedido Realizado!</h2>
        <p>Seu pedido #{{ orderNumber }} foi criado com sucesso.</p>
        
        <div v-if="pixData" class="pix-payment">
          <h3>Pague com PIX</h3>
          <div class="qr-code">
            <img :src="pixData.qrCodeUrl" alt="QR Code PIX" />
          </div>
          <p class="pix-code">{{ pixData.copyPaste }}</p>
          <button class="btn-copy" @click="copyPixCode">
            Copiar código
          </button>
        </div>

        <button class="btn-primary" @click="goToOrders">
          Ver meus pedidos
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import CheckoutStepper from '@/components/checkout/CheckoutStepper.vue';
import CustomerForm from '@/components/checkout/CustomerForm.vue';
import AddressForm from '@/components/checkout/AddressForm.vue';
import PaymentForm from '@/components/checkout/PaymentForm.vue';
import OrderSummary from '@/components/checkout/OrderSummary.vue';

const router = useRouter();
const route = useRoute();

const steps = [
  { id: 'customer', title: 'Dados Pessoais', subtitle: 'Suas informações' },
  { id: 'address', title: 'Endereço', subtitle: 'Onde entregar' },
  { id: 'payment', title: 'Pagamento', subtitle: 'Como pagar' },
  { id: 'review', title: 'Revisão', subtitle: 'Confirmar pedido' },
];

const currentStep = ref(0);
const loading = ref(false);
const checkoutSession = ref<any>(null);
const acceptedTerms = ref(false);
const marketingConsent = ref(false);
const showSuccessModal = ref(false);
const orderNumber = ref('');
const pixData = ref<any>(null);

onMounted(async () => {
  await initCheckout();
});

const initCheckout = async () => {
  loading.value = true;
  try {
    // TODO: Call API to start checkout session
    // const response = await checkoutService.startCheckout({ cartId: route.query.cartId });
    // checkoutSession.value = response;
    
    // Mock data for development
    checkoutSession.value = {
      id: 'checkout:123',
      customer: {},
      shippingAddress: {},
      paymentMethod: {},
      orderSummary: {
        items: [
          {
            id: '1',
            productId: 'prod-1',
            productName: 'Fotolivro Premium 20x20',
            variantName: 'Capa Dura',
            quantity: 1,
            totalPrice: 149.90,
          },
        ],
        subtotal: 149.90,
        discounts: 0,
        taxes: 0,
        shipping: 15.90,
        total: 165.80,
      },
    };
  } catch (error) {
    console.error('Error initializing checkout:', error);
  } finally {
    loading.value = false;
  }
};

const handleCustomerSubmit = async (data: any) => {
  loading.value = true;
  try {
    // TODO: Call API to update customer data
    checkoutSession.value.customer = data;
    currentStep.value = 1;
  } catch (error) {
    console.error('Error updating customer:', error);
  } finally {
    loading.value = false;
  }
};

const handleAddressSubmit = async (data: any) => {
  loading.value = true;
  try {
    // TODO: Call API to update address
    checkoutSession.value.shippingAddress = data;
    currentStep.value = 2;
  } catch (error) {
    console.error('Error updating address:', error);
  } finally {
    loading.value = false;
  }
};

const handlePaymentSubmit = async (data: any) => {
  loading.value = true;
  try {
    // Store payment method data
    checkoutSession.value.paymentMethod = data;
    
    // If Stripe payment was successful, the paymentIntentId is already available
    if (data.type === 'credit_card' && data.stripePaymentIntentId) {
      checkoutSession.value.stripePaymentIntentId = data.stripePaymentIntentId;
    }
    
    currentStep.value = 3;
  } catch (error) {
    console.error('Error updating payment:', error);
  } finally {
    loading.value = false;
  }
};

const applyCoupon = async (code: string) => {
  loading.value = true;
  try {
    // TODO: Call API to apply coupon
    console.log('Applying coupon:', code);
  } catch (error) {
    console.error('Error applying coupon:', error);
  } finally {
    loading.value = false;
  }
};

const removeCoupon = async () => {
  // TODO: Call API to remove coupon
};

const completeCheckout = async () => {
  if (!acceptedTerms.value) return;
  
  loading.value = true;
  try {
    // TODO: Call API to complete checkout
    // const result = await checkoutService.completeCheckout(checkoutSession.value.id, {
    //   acceptedTerms: acceptedTerms.value,
    //   marketingConsent: marketingConsent.value,
    // });
    
    // Mock success
    orderNumber.value = 'PED-' + Date.now().toString(36).toUpperCase();
    
    if (checkoutSession.value.paymentMethod.type === 'pix') {
      pixData.value = {
        qrCodeUrl: 'https://via.placeholder.com/200x200?text=QR+Code',
        copyPaste: '00020126580014br.gov.bcb.pix0136...',
      };
    }
    
    showSuccessModal.value = true;
  } catch (error) {
    console.error('Error completing checkout:', error);
  } finally {
    loading.value = false;
  }
};

const formatAddress = (address: any) => {
  if (!address?.street) return 'Não informado';
  return `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}, ${address.city} - ${address.state}, ${address.cep}`;
};

const formatPaymentMethod = (payment: any) => {
  if (!payment?.type) return 'Não selecionado';
  const methods: Record<string, string> = {
    pix: 'PIX',
    credit_card: 'Cartão de Crédito',
    bank_slip: 'Boleto Bancário',
  };
  return methods[payment.type] || payment.type;
};

const copyPixCode = () => {
  if (pixData.value?.copyPaste) {
    navigator.clipboard.writeText(pixData.value.copyPaste);
    alert('Código copiado!');
  }
};

const goBack = () => {
  router.push('/cart');
};

const goToOrders = () => {
  router.push('/orders');
};
</script>

<style scoped>
.checkout-page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 2rem 1rem;
}

.checkout-container {
  max-width: 1200px;
  margin: 0 auto;
}

.checkout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.checkout-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
}

.btn-back {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.875rem;
}

.btn-back:hover {
  color: #3b82f6;
}

.checkout-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
}

.checkout-main {
  min-width: 0;
}

.checkout-sidebar {
  position: sticky;
  top: 2rem;
  height: fit-content;
}

.review-step {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.review-step h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #1f2937;
}

.review-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.review-section {
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
  position: relative;
}

.review-section h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.review-section p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0;
}

.btn-edit {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 0.75rem;
  cursor: pointer;
}

.terms-section {
  margin-bottom: 1.5rem;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.checkbox-label input {
  margin-top: 0.25rem;
}

.checkbox-label span {
  font-size: 0.875rem;
  color: #4b5563;
}

.checkbox-label a {
  color: #3b82f6;
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
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-complete {
  background: #10b981;
}

.btn-complete:hover:not(:disabled) {
  background: #059669;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
}

.success-icon {
  width: 60px;
  height: 60px;
  background: #10b981;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 1rem;
}

.success-modal h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.success-modal p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.pix-payment {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.pix-payment h3 {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.qr-code {
  margin-bottom: 1rem;
}

.qr-code img {
  max-width: 200px;
}

.pix-code {
  font-size: 0.75rem;
  word-break: break-all;
  color: #6b7280;
  margin-bottom: 0.5rem;
}

.btn-copy {
  padding: 0.5rem 1rem;
  background: #e5e7eb;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

@media (max-width: 1024px) {
  .checkout-content {
    grid-template-columns: 1fr;
  }
  
  .checkout-sidebar {
    position: static;
    order: -1;
  }
}
</style>
