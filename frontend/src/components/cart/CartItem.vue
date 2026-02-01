<template>
  <div class="cart-item">
    <div class="item-image">
      <img v-if="item.thumbnailUrl" :src="item.thumbnailUrl" :alt="item.productName" />
      <div v-else class="item-placeholder">📷</div>
    </div>

    <div class="item-content">
      <div class="item-header">
        <h4 class="item-name">{{ item.productName }}</h4>
        <button class="btn-remove" @click="$emit('remove', item.id)" title="Remover">
          🗑️
        </button>
      </div>

      <p v-if="item.variantName" class="item-variant">{{ item.variantName }}</p>
      <p v-if="item.pages" class="item-pages">{{ item.pages }} páginas</p>

      <div class="item-footer">
        <div class="quantity-control">
          <button 
            class="qty-btn"
            :disabled="item.quantity <= 1"
            @click="decreaseQuantity"
          >
            −
          </button>
          <span class="qty-value">{{ item.quantity }}</span>
          <button 
            class="qty-btn"
            :disabled="item.quantity >= 99"
            @click="increaseQuantity"
          >
            +
          </button>
        </div>

        <div class="item-price">
          <span v-if="item.originalPrice && item.originalPrice > item.unitPrice" class="original-price">
            R$ {{ (item.originalPrice * item.quantity).toFixed(2) }}
          </span>
          <span class="current-price">R$ {{ item.totalPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

interface CartItemData {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  projectId?: string;
  quantity: number;
  pages?: number;
  unitPrice: number;
  originalPrice?: number;
  totalPrice: number;
  thumbnailUrl?: string;
}

const props = defineProps<{
  item: CartItemData;
}>();

const emit = defineEmits<{
  (e: 'update-quantity', itemId: string, quantity: number): void;
  (e: 'remove', itemId: string): void;
}>();

const decreaseQuantity = () => {
  if (props.item.quantity > 1) {
    emit('update-quantity', props.item.id, props.item.quantity - 1);
  }
};

const increaseQuantity = () => {
  if (props.item.quantity < 99) {
    emit('update-quantity', props.item.id, props.item.quantity + 1);
  }
};
</script>

<style scoped>
.cart-item {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  margin-bottom: 0.75rem;
}

.item-image {
  width: 80px;
  height: 80px;
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
  font-size: 2rem;
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.item-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.btn-remove:hover {
  opacity: 1;
}

.item-variant,
.item-pages {
  font-size: 0.8125rem;
  color: #6b7280;
  margin: 0.25rem 0 0;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 0.75rem;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 0.25rem;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: white;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.qty-btn:hover:not(:disabled) {
  background: #e5e7eb;
}

.qty-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-weight: 500;
}

.item-price {
  text-align: right;
}

.original-price {
  display: block;
  font-size: 0.75rem;
  color: #9ca3af;
  text-decoration: line-through;
}

.current-price {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}
</style>
