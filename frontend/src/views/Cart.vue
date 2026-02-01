<template>
  <div class="cart-page">
    <GlobalNav :show-menu="true" />
    
    <div class="cart-container">
      <header class="cart-header">
        <h1>Meu Carrinho</h1>
        <span v-if="!isEmpty" class="item-count">{{ itemCount }} {{ itemCount === 1 ? 'item' : 'itens' }}</span>
      </header>

      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Carregando carrinho...</p>
      </div>

      <div v-else-if="isEmpty" class="empty-state">
        <div class="empty-icon">🛒</div>
        <h2>Seu carrinho está vazio</h2>
        <p>Adicione produtos para continuar</p>
        <router-link to="/products" class="btn-primary">
          Ver produtos
        </router-link>
      </div>

      <div v-else class="cart-content">
        <div class="cart-items-section">
          <div v-for="item in items" :key="item.id" class="cart-item-card">
            <div class="item-image">
              <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" :alt="item.productName" />
              <div v-else class="item-placeholder">📷</div>
            </div>

            <div class="item-details">
              <h3 class="item-name">{{ item.productName }}</h3>
              <p v-if="item.variantName" class="item-variant">{{ item.variantName }}</p>
              <p v-if="item.pages" class="item-pages">{{ item.pages }} páginas</p>
              
              <div class="item-actions">
                <div class="quantity-control">
                  <button 
                    class="qty-btn"
                    :disabled="item.quantity <= 1"
                    @click="updateQuantity(item.id, item.quantity - 1)"
                  >
                    −
                  </button>
                  <input 
                    type="number" 
                    :value="item.quantity"
                    min="1"
                    max="99"
                    class="qty-input"
                    @change="(e) => updateQuantity(item.id, parseInt((e.target as HTMLInputElement).value) || 1)"
                  />
                  <button 
                    class="qty-btn"
                    :disabled="item.quantity >= 99"
                    @click="updateQuantity(item.id, item.quantity + 1)"
                  >
                    +
                  </button>
                </div>
                
                <button class="btn-remove" @click="removeItem(item.id)">
                  Remover
                </button>
              </div>
            </div>

            <div class="item-price">
              <span class="unit-price">R$ {{ item.unitPrice.toFixed(2) }} cada</span>
              <span class="total-price">R$ {{ item.totalPrice.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <aside class="cart-summary-section">
          <div class="summary-card">
            <h3>Resumo do Pedido</h3>

            <div class="promo-code">
              <input
                v-model="promoCode"
                type="text"
                placeholder="Código promocional"
                :disabled="hasPromoCode"
              />
              <button 
                v-if="!hasPromoCode"
                class="btn-apply"
                :disabled="!promoCode"
                @click="applyPromo"
              >
                Aplicar
              </button>
              <button 
                v-else
                class="btn-remove-promo"
                @click="removePromo"
              >
                ✕
              </button>
            </div>
            <p v-if="promoError" class="promo-error">{{ promoError }}</p>
            <p v-if="hasPromoCode" class="promo-success">Cupom aplicado!</p>

            <div class="summary-divider" />

            <div class="summary-row">
              <span>Subtotal</span>
              <span>R$ {{ subtotal.toFixed(2) }}</span>
            </div>

            <div v-if="discount > 0" class="summary-row discount">
              <span>Desconto</span>
              <span>- R$ {{ discount.toFixed(2) }}</span>
            </div>

            <div class="summary-row">
              <span>Frete</span>
              <span v-if="shipping > 0">R$ {{ shipping.toFixed(2) }}</span>
              <span v-else class="calculate-shipping">Calcular no checkout</span>
            </div>

            <div class="summary-divider" />

            <div class="summary-row total">
              <span>Total</span>
              <span>R$ {{ total.toFixed(2) }}</span>
            </div>

            <router-link to="/checkout" class="btn-checkout">
              Finalizar Compra
            </router-link>

            <router-link to="/products" class="btn-continue">
              Continuar Comprando
            </router-link>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCartStore } from '@/stores/cart';
import GlobalNav from '@/components/common/GlobalNav.vue';

const route = useRoute();
const cartStore = useCartStore();

const promoCode = ref('');
const promoError = ref('');
const addingProject = ref(false);

const loading = computed(() => cartStore.loading || addingProject.value);
const items = computed(() => cartStore.items);
const itemCount = computed(() => cartStore.itemCount);
const subtotal = computed(() => cartStore.subtotal);
const discount = computed(() => cartStore.discount);
const shipping = computed(() => cartStore.shipping);
const total = computed(() => cartStore.total);
const isEmpty = computed(() => cartStore.isEmpty);
const hasPromoCode = computed(() => !!cartStore.cart?.promoCode);

// Add project from query param
const addProjectToCart = async (projectId: string) => {
  addingProject.value = true;
  try {
    // Fetch project details
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`/api/v1/projects/${projectId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    
    if (!response.ok) {
      console.error('Erro ao buscar projeto');
      return;
    }
    
    const result = await response.json();
    const project = result.data || result;
    
    // Calculate price based on project config
    const config = project.productSelection || {};
    let unitPrice = config.formatPrice || config.basePrice || 299;
    
    // Add extra pages price
    if (config.extraPagesPrice) {
      unitPrice += config.extraPagesPrice;
    }
    
    // Add cover price
    if (config.coverPrice) {
      unitPrice += config.coverPrice;
    }
    
    // Add to cart
    await cartStore.addItem({
      productId: project.productId || 'photobook',
      productName: project.name || 'Fotolivro',
      variantId: config.formatId,
      variantName: config.formatName || config.size,
      projectId: project.id,
      quantity: 1,
      pages: config.pages || project.pageCount || 20,
      unitPrice,
      thumbnailUrl: project.thumbnailUrl || project.coverUrl,
      customizations: config
    });
    
    console.log('✅ Projeto adicionado ao carrinho:', project.name);
  } catch (error) {
    console.error('Erro ao adicionar projeto ao carrinho:', error);
  } finally {
    addingProject.value = false;
  }
};

onMounted(async () => {
  console.log('🛒 Cart mounted, fetching cart...');
  await cartStore.fetchCart();
  console.log('🛒 Cart loaded:', cartStore.items, 'Count:', cartStore.itemCount);
  
  // Check if there's a project to add
  const addProjectId = route.query.add as string;
  if (addProjectId) {
    console.log('🛒 Adding project to cart:', addProjectId);
    await addProjectToCart(addProjectId);
    // Clean URL
    window.history.replaceState({}, '', '/cart');
  }
});

// Watch for route changes (in case user navigates with add param)
watch(() => route.query.add, async (newProjectId) => {
  if (newProjectId && typeof newProjectId === 'string') {
    await addProjectToCart(newProjectId);
    window.history.replaceState({}, '', '/cart');
  }
});

const updateQuantity = async (itemId: string, quantity: number) => {
  if (quantity < 1) quantity = 1;
  if (quantity > 99) quantity = 99;
  await cartStore.updateItemQuantity(itemId, quantity);
};

const removeItem = async (itemId: string) => {
  await cartStore.removeItem(itemId);
};

const applyPromo = async () => {
  promoError.value = '';
  try {
    await cartStore.applyPromoCode(promoCode.value);
  } catch (error) {
    promoError.value = 'Código promocional inválido';
  }
};

const removePromo = async () => {
  await cartStore.removePromoCode();
  promoCode.value = '';
};
</script>

<style scoped>
.cart-page {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 80px 1rem 2rem;
}

.cart-container {
  max-width: 1200px;
  margin: 0 auto;
}

.cart-header {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 2rem;
}

.cart-header h1 {
  font-size: 1.75rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.item-count {
  font-size: 1rem;
  color: #6b7280;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
}

.empty-state h2 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin-bottom: 2rem;
}

.cart-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2rem;
  align-items: start;
}

.cart-items-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-item-card {
  display: flex;
  gap: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
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
  font-size: 3rem;
}

.item-details {
  flex: 1;
}

.item-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.item-variant,
.item-pages {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1rem;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.25rem;
}

.qty-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: white;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-input {
  width: 50px;
  text-align: center;
  border: none;
  background: transparent;
  font-size: 1rem;
  font-weight: 500;
}

.qty-input::-webkit-inner-spin-button,
.qty-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.btn-remove {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn-remove:hover {
  text-decoration: underline;
}

.item-price {
  text-align: right;
  min-width: 120px;
}

.unit-price {
  display: block;
  font-size: 0.875rem;
  color: #6b7280;
}

.total-price {
  display: block;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin-top: 0.25rem;
}

.cart-summary-section {
  position: sticky;
  top: 2rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-card h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1.5rem;
}

.promo-code {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.promo-code input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
}

.btn-apply {
  padding: 0.75rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-remove-promo {
  padding: 0.75rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.promo-error {
  font-size: 0.75rem;
  color: #ef4444;
  margin: 0;
}

.promo-success {
  font-size: 0.75rem;
  color: #10b981;
  margin: 0;
}

.summary-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 1rem 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  font-size: 0.9375rem;
}

.summary-row.discount {
  color: #10b981;
}

.summary-row.total {
  font-size: 1.25rem;
  font-weight: 600;
}

.calculate-shipping {
  color: #6b7280;
  font-size: 0.875rem;
}

.btn-checkout {
  display: block;
  width: 100%;
  padding: 1rem;
  background: #10b981;
  color: white;
  text-align: center;
  text-decoration: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 1.5rem;
  transition: background 0.2s;
}

.btn-checkout:hover {
  background: #059669;
}

.btn-continue {
  display: block;
  width: 100%;
  padding: 0.875rem;
  background: white;
  color: #374151;
  text-align: center;
  text-decoration: none;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  margin-top: 0.75rem;
  transition: background 0.2s;
}

.btn-continue:hover {
  background: #f3f4f6;
}

.btn-primary {
  display: inline-block;
  padding: 0.875rem 2rem;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .cart-content {
    grid-template-columns: 1fr;
  }
  
  .cart-summary-section {
    position: static;
  }
}

@media (max-width: 640px) {
  .cart-item-card {
    flex-direction: column;
  }
  
  .item-image {
    width: 100%;
    height: 200px;
  }
  
  .item-price {
    text-align: left;
    margin-top: 1rem;
  }
}
</style>
