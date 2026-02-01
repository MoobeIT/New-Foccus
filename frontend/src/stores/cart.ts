import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface CartItem {
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
  customizations?: Record<string, any>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  promoCode?: string;
}

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isOpen = ref(false);

  // Computed
  const items = computed(() => cart.value?.items || []);
  const itemCount = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = computed(() => cart.value?.subtotal || 0);
  const discount = computed(() => cart.value?.discount || 0);
  const shipping = computed(() => cart.value?.shipping || 0);
  const total = computed(() => cart.value?.total || 0);
  const isEmpty = computed(() => items.value.length === 0);

  // Actions
  const fetchCart = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      // TODO: Call API
      // const response = await api.get('/cart');
      // cart.value = response.data;
      
      // Mock data for development
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        cart.value = JSON.parse(savedCart);
      } else {
        cart.value = {
          id: 'cart-' + Date.now(),
          items: [],
          subtotal: 0,
          discount: 0,
          shipping: 0,
          total: 0,
        };
      }
    } catch (err: any) {
      error.value = err.message || 'Erro ao carregar carrinho';
    } finally {
      loading.value = false;
    }
  };

  const addItem = async (item: Omit<CartItem, 'id' | 'totalPrice'>) => {
    loading.value = true;
    error.value = null;
    
    try {
      // TODO: Call API
      // const response = await api.post('/cart/items', item);
      // cart.value = response.data;
      
      if (!cart.value) {
        await fetchCart();
      }

      const existingItem = cart.value!.items.find(
        i => i.productId === item.productId && 
             i.variantId === item.variantId &&
             i.projectId === item.projectId
      );

      if (existingItem) {
        existingItem.quantity += item.quantity;
        existingItem.totalPrice = existingItem.unitPrice * existingItem.quantity;
      } else {
        const newItem: CartItem = {
          ...item,
          id: 'item-' + Date.now(),
          totalPrice: item.unitPrice * item.quantity,
        };
        cart.value!.items.push(newItem);
      }

      recalculateTotals();
      saveCart();
      
      // Open cart drawer
      isOpen.value = true;
    } catch (err: any) {
      error.value = err.message || 'Erro ao adicionar item';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    if (!cart.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      // TODO: Call API
      // const response = await api.patch(`/cart/items/${itemId}`, { quantity });
      // cart.value = response.data;
      
      const item = cart.value.items.find(i => i.id === itemId);
      if (item) {
        item.quantity = quantity;
        item.totalPrice = item.unitPrice * quantity;
        recalculateTotals();
        saveCart();
      }
    } catch (err: any) {
      error.value = err.message || 'Erro ao atualizar quantidade';
    } finally {
      loading.value = false;
    }
  };

  const removeItem = async (itemId: string) => {
    if (!cart.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      // TODO: Call API
      // const response = await api.delete(`/cart/items/${itemId}`);
      // cart.value = response.data;
      
      cart.value.items = cart.value.items.filter(i => i.id !== itemId);
      recalculateTotals();
      saveCart();
    } catch (err: any) {
      error.value = err.message || 'Erro ao remover item';
    } finally {
      loading.value = false;
    }
  };

  const applyPromoCode = async (code: string) => {
    if (!cart.value) return;
    
    loading.value = true;
    error.value = null;
    
    try {
      // TODO: Call API to validate and apply promo code
      // const response = await api.post('/cart/promo', { code });
      // cart.value = response.data;
      
      // Mock: 10% discount
      cart.value.promoCode = code;
      cart.value.discount = cart.value.subtotal * 0.1;
      recalculateTotals();
      saveCart();
    } catch (err: any) {
      error.value = err.message || 'Código promocional inválido';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removePromoCode = async () => {
    if (!cart.value) return;
    
    cart.value.promoCode = undefined;
    cart.value.discount = 0;
    recalculateTotals();
    saveCart();
  };

  const clearCart = async () => {
    if (!cart.value) return;
    
    loading.value = true;
    
    try {
      // TODO: Call API
      // await api.delete('/cart');
      
      cart.value.items = [];
      cart.value.promoCode = undefined;
      cart.value.discount = 0;
      recalculateTotals();
      saveCart();
    } finally {
      loading.value = false;
    }
  };

  const openCart = () => {
    isOpen.value = true;
  };

  const closeCart = () => {
    isOpen.value = false;
  };

  // Helper functions
  const recalculateTotals = () => {
    if (!cart.value) return;
    
    cart.value.subtotal = cart.value.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    
    // Recalculate discount if promo code is applied
    if (cart.value.promoCode) {
      cart.value.discount = cart.value.subtotal * 0.1; // 10% mock discount
    }
    
    cart.value.total = cart.value.subtotal - cart.value.discount + cart.value.shipping;
  };

  const saveCart = () => {
    if (cart.value) {
      localStorage.setItem('cart', JSON.stringify(cart.value));
    }
  };

  // Initialize cart on store creation
  fetchCart();

  return {
    // State
    cart,
    loading,
    error,
    isOpen,
    
    // Computed
    items,
    itemCount,
    subtotal,
    discount,
    shipping,
    total,
    isEmpty,
    
    // Actions
    fetchCart,
    addItem,
    updateItemQuantity,
    removeItem,
    applyPromoCode,
    removePromoCode,
    clearCart,
    openCart,
    closeCart,
  };
});
