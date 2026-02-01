<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isOpen" class="cart-overlay" @click.self="close">
        <div class="cart-drawer">
          <header class="cart-header">
            <h2>Carrinho</h2>
            <span class="cart-count">{{ itemCount }} {{ itemCount === 1 ? 'item' : 'itens' }}</span>
            <button class="btn-close" @click="close">×</button>
          </header>

          <div v-if="loading" class="cart-loading">
            <div class="spinner" />
            <p>Carregando...</p>
          </div>

          <div v-else-if="items.length === 0" class="cart-empty">
            <div class="empty-icon">🛒</div>
            <h3>Seu carrinho está vazio</h3>
            <p>Adicione produtos para continuar</p>
            <button class="btn-primary" @click="goToProducts">
              Ver produtos
            </button>
          </div>

          <template v-else>
            <div class="cart-items">
              <CartItem
                v-for="item in items"
                :key="item.id"
                :item="item"
                @update-quantity="updateQuantity"
                @remove="removeItem"
              />
            </div>

            <div class="cart-summary">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>R$ {{ subtotal.toFixed(2) }}</span>
              </div>
              <div v-if="discount > 0" class="summary-row discount">
                <span>Desconto</span>
                <span>- R$ {{ discount.toFixed(2) }}</span>
              </div>
              <div class="summary-row total">
                <span>Total</span>
                <span>R$ {{ total.toFixed(2) }}</span>
              </div>
            </div>

            <div class="cart-actions">
              <button class="btn-secondary" @click="close">
                Continuar comprando
              </button>
              <button class="btn-primary" @click="goToCheckout">
                Finalizar compra
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '@/stores/cart';
import CartItem from './CartItem.vue';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const router = useRouter();
const cartStore = useCartStore();

const loading = computed(() => cartStore.loading);
const items = computed(() => cartStore.items);
const itemCount = computed(() => cartStore.itemCount);
const subtotal = computed(() => cartStore.subtotal);
const discount = computed(() => cartStore.discount);
const total = computed(() => cartStore.total);

const close = () => {
  emit('close');
};

const updateQuantity = async (itemId: string, quantity: number) => {
  await cartStore.updateItemQuantity(itemId, quantity);
};

const removeItem = async (itemId: string) => {
  await cartStore.removeItem(itemId);
};

const goToProducts = () => {
  close();
  router.push('/products');
};

const goToCheckout = () => {
  close();
  router.push('/checkout');
};
</script>

<style scoped>
.cart-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.cart-drawer {
  width: 100%;
  max-width: 420px;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}

.cart-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.cart-header h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.cart-count {
  margin-left: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.btn-close:hover {
  color: #1f2937;
}

.cart-loading,
.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.cart-empty h3 {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
}

.cart-empty p {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.cart-summary {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.875rem;
}

.summary-row.discount {
  color: #10b981;
}

.summary-row.total {
  font-size: 1.125rem;
  font-weight: 600;
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
}

.cart-actions {
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

/* Transitions */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .cart-drawer,
.drawer-leave-active .cart-drawer {
  transition: transform 0.3s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .cart-drawer,
.drawer-leave-to .cart-drawer {
  transform: translateX(100%);
}
</style>
