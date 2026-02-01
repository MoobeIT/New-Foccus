<template>
  <div class="order-summary">
    <h3 class="summary-title">Resumo do Pedido</h3>
    
    <div class="summary-items">
      <div v-for="item in items" :key="item.id" class="summary-item">
        <div class="item-image">
          <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" :alt="item.productName" />
          <div v-else class="item-placeholder">📷</div>
        </div>
        <div class="item-details">
          <span class="item-name">{{ item.productName }}</span>
          <span v-if="item.variantName" class="item-variant">{{ item.variantName }}</span>
          <span class="item-quantity">Qtd: {{ item.quantity }}</span>
        </div>
        <div class="item-price">
          R$ {{ item.totalPrice.toFixed(2) }}
        </div>
      </div>
    </div>

    <div class="summary-divider" />

    <div class="summary-totals">
      <div class="total-row">
        <span>Subtotal</span>
        <span>R$ {{ subtotal.toFixed(2) }}</span>
      </div>
      
      <div v-if="discounts > 0" class="total-row discount">
        <span>Descontos</span>
        <span>- R$ {{ discounts.toFixed(2) }}</span>
      </div>
      
      <div class="total-row">
        <span>Frete</span>
        <span v-if="shipping > 0">R$ {{ shipping.toFixed(2) }}</span>
        <span v-else class="free-shipping">Grátis</span>
      </div>
      
      <div v-if="taxes > 0" class="total-row">
        <span>Impostos</span>
        <span>R$ {{ taxes.toFixed(2) }}</span>
      </div>
    </div>

    <div class="summary-divider" />

    <div class="summary-total">
      <span>Total</span>
      <span class="total-value">R$ {{ total.toFixed(2) }}</span>
    </div>

    <!-- Coupon Input -->
    <div v-if="showCoupon" class="coupon-section">
      <div class="coupon-input">
        <input
          v-model="couponCode"
          type="text"
          placeholder="Código do cupom"
          :disabled="couponApplied"
        />
        <button 
          v-if="!couponApplied"
          class="btn-coupon"
          :disabled="!couponCode || loadingCoupon"
          @click="applyCoupon"
        >
          {{ loadingCoupon ? '...' : 'Aplicar' }}
        </button>
        <button 
          v-else
          class="btn-remove-coupon"
          @click="removeCoupon"
        >
          ✕
        </button>
      </div>
      <span v-if="couponError" class="coupon-error">{{ couponError }}</span>
      <span v-if="couponApplied" class="coupon-success">Cupom aplicado!</span>
    </div>

    <!-- Shipping Method -->
    <div v-if="shippingMethod" class="shipping-info">
      <div class="shipping-icon">🚚</div>
      <div class="shipping-details">
        <span class="shipping-name">{{ shippingMethod.name }}</span>
        <span class="shipping-estimate">
          Entrega em {{ shippingMethod.estimatedDays }} dias úteis
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';

interface CheckoutItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  estimatedDays: number;
  price: number;
}

const props = defineProps<{
  items: CheckoutItem[];
  subtotal: number;
  discounts: number;
  taxes: number;
  shipping: number;
  total: number;
  shippingMethod?: ShippingMethod;
  showCoupon?: boolean;
}>();

const emit = defineEmits<{
  (e: 'applyCoupon', code: string): void;
  (e: 'removeCoupon'): void;
}>();

const couponCode = ref('');
const couponApplied = ref(false);
const couponError = ref('');
const loadingCoupon = ref(false);

const applyCoupon = async () => {
  if (!couponCode.value) return;
  
  loadingCoupon.value = true;
  couponError.value = '';
  
  try {
    emit('applyCoupon', couponCode.value);
    couponApplied.value = true;
  } catch (error) {
    couponError.value = 'Cupom inválido';
  } finally {
    loadingCoupon.value = false;
  }
};

const removeCoupon = () => {
  couponCode.value = '';
  couponApplied.value = false;
  emit('removeCoupon');
};
</script>

<style scoped>
.order-summary {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

.summary-items {
  max-height: 300px;
  overflow-y: auto;
}

.summary-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.summary-item:last-child {
  border-bottom: none;
}

.item-image {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-placeholder {
  width: 100%;
  height: 100%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.item-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.item-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.item-variant {
  font-size: 0.75rem;
  color: #6b7280;
}

.item-quantity {
  font-size: 0.75rem;
  color: #6b7280;
}

.item-price {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

.summary-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 1rem 0;
}

.summary-totals {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: #4b5563;
}

.total-row.discount {
  color: #10b981;
}

.free-shipping {
  color: #10b981;
  font-weight: 500;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.total-value {
  color: #3b82f6;
}

.coupon-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.coupon-input {
  display: flex;
  gap: 0.5rem;
}

.coupon-input input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.coupon-input input:focus {
  outline: none;
  border-color: #3b82f6;
}

.btn-coupon {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-coupon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-remove-coupon {
  padding: 0.5rem 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.coupon-error {
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
}

.coupon-success {
  display: block;
  font-size: 0.75rem;
  color: #10b981;
  margin-top: 0.25rem;
}

.shipping-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 6px;
}

.shipping-icon {
  font-size: 1.5rem;
}

.shipping-details {
  display: flex;
  flex-direction: column;
}

.shipping-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 0.875rem;
}

.shipping-estimate {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
