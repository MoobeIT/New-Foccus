import api from './api';

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
  totalPrice: number;
  thumbnailUrl?: string;
  customizations?: Record<string, any>;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  discounts: number;
  taxes: number;
  shipping: number;
  total: number;
  currency: string;
  promoCode?: string;
  shippingAddress?: any;
}

export interface AddItemRequest {
  productId: string;
  variantId?: string;
  projectId?: string;
  quantity: number;
  pages?: number;
  customizations?: Record<string, any>;
}

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: number;
  carrier: string;
}

class CartService {
  async getCart(): Promise<Cart> {
    const response = await api.get('/cart');
    return response.data;
  }

  async addItem(item: AddItemRequest): Promise<Cart> {
    const response = await api.post('/cart/items', item);
    return response.data;
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<Cart> {
    const response = await api.patch(`/cart/items/${itemId}`, { quantity });
    return response.data;
  }

  async removeItem(itemId: string): Promise<Cart> {
    const response = await api.delete(`/cart/items/${itemId}`);
    return response.data;
  }

  async clearCart(): Promise<void> {
    await api.delete('/cart');
  }

  async applyPromoCode(code: string): Promise<Cart> {
    const response = await api.post('/cart/promo', { code });
    return response.data;
  }

  async removePromoCode(): Promise<Cart> {
    const response = await api.delete('/cart/promo');
    return response.data;
  }

  async setShippingAddress(address: any): Promise<Cart> {
    const response = await api.patch('/cart/shipping-address', address);
    return response.data;
  }

  async getShippingOptions(cep: string): Promise<ShippingOption[]> {
    const response = await api.get(`/cart/shipping-options?cep=${cep}`);
    return response.data;
  }

  async selectShippingOption(optionId: string): Promise<Cart> {
    const response = await api.patch('/cart/shipping-option', { optionId });
    return response.data;
  }
}

export const cartService = new CartService();
export default cartService;
