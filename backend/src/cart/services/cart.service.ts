import { Injectable } from '@nestjs/common';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  projectId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: Record<string, any>;
}

export interface Cart {
  id: string;
  tenantId: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CartService {
  private carts: Map<string, Cart> = new Map();

  async getCart(tenantId: string, userId: string): Promise<Cart | null> {
    const cartKey = `${tenantId}:${userId}`;
    return this.carts.get(cartKey) || null;
  }

  async getOrCreateCart(tenantId: string, userId: string): Promise<Cart> {
    const cartKey = `${tenantId}:${userId}`;
    let cart = this.carts.get(cartKey);

    if (!cart) {
      cart = {
        id: `cart_${Date.now()}`,
        tenantId,
        userId,
        items: [],
        subtotal: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.carts.set(cartKey, cart);
    }

    return cart;
  }

  async addItem(tenantId: string, userId: string, item: Omit<CartItem, 'id' | 'totalPrice'>): Promise<Cart> {
    const cart = await this.getOrCreateCart(tenantId, userId);

    const newItem: CartItem = {
      ...item,
      id: `item_${Date.now()}`,
      totalPrice: item.unitPrice * item.quantity,
    };

    cart.items.push(newItem);
    cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    cart.updatedAt = new Date();

    return cart;
  }

  async updateItemQuantity(tenantId: string, userId: string, itemId: string, quantity: number): Promise<Cart> {
    const cart = await this.getOrCreateCart(tenantId, userId);
    const item = cart.items.find(i => i.id === itemId);

    if (item) {
      item.quantity = quantity;
      item.totalPrice = item.unitPrice * quantity;
      cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      cart.updatedAt = new Date();
    }

    return cart;
  }

  async removeItem(tenantId: string, userId: string, itemId: string): Promise<Cart> {
    const cart = await this.getOrCreateCart(tenantId, userId);
    cart.items = cart.items.filter(i => i.id !== itemId);
    cart.subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
    cart.updatedAt = new Date();

    return cart;
  }

  async clearCart(tenantId: string, userId: string): Promise<void> {
    const cartKey = `${tenantId}:${userId}`;
    this.carts.delete(cartKey);
  }
}
