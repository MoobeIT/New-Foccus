export interface PricingRule {
  id: string;
  tenantId: string;
  productId?: string;
  variantId?: string;
  name: string;
  description?: string;
  
  // Condições
  conditions: PricingCondition[];
  
  // Ações de preço
  actions: PricingAction[];
  
  // Configurações
  priority: number;
  active: boolean;
  validFrom?: Date;
  validTo?: Date;
  
  // Metadados
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingCondition {
  type: 'quantity' | 'pages' | 'size' | 'customer_type' | 'date_range' | 'product_type';
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: any;
  metadata?: Record<string, any>;
}

export interface PricingAction {
  type: 'base_price' | 'percentage_discount' | 'fixed_discount' | 'markup' | 'tier_price';
  value: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface PricingTier {
  id: string;
  tenantId: string;
  productId: string;
  variantId?: string;
  
  // Configuração da tier
  minQuantity: number;
  maxQuantity?: number;
  basePrice: number;
  currency: string;
  
  // Preços por página adicional
  additionalPagePrice?: number;
  
  // Configurações específicas
  metadata: Record<string, any>;
  
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}