export type LoyaltyLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyAccount {
  id: string;
  tenantId: string;
  userId: string;
  level: LoyaltyLevel;
  points: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  points: number;
  description: string;
  orderId?: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface LoyaltyLevelConfig {
  level: LoyaltyLevel;
  name: string;
  minPoints: number;
  discountPercent: number;
  freeShippingThreshold: number;
  pointsMultiplier: number;
  benefits: string[];
}

export const LOYALTY_LEVELS: LoyaltyLevelConfig[] = [
  {
    level: 'bronze',
    name: 'Bronze',
    minPoints: 0,
    discountPercent: 0,
    freeShippingThreshold: 400,
    pointsMultiplier: 1,
    benefits: ['Acesso a promoções exclusivas', 'Suporte prioritário'],
  },
  {
    level: 'silver',
    name: 'Prata',
    minPoints: 1000,
    discountPercent: 5,
    freeShippingThreshold: 300,
    pointsMultiplier: 1.25,
    benefits: ['5% de desconto em todos os pedidos', 'Frete grátis acima de R$300', 'Acesso antecipado a novos produtos'],
  },
  {
    level: 'gold',
    name: 'Ouro',
    minPoints: 3000,
    discountPercent: 10,
    freeShippingThreshold: 200,
    pointsMultiplier: 1.5,
    benefits: ['10% de desconto em todos os pedidos', 'Frete grátis acima de R$200', 'Produção prioritária', 'Brindes exclusivos'],
  },
  {
    level: 'platinum',
    name: 'Platina',
    minPoints: 10000,
    discountPercent: 15,
    freeShippingThreshold: 0,
    pointsMultiplier: 2,
    benefits: ['15% de desconto em todos os pedidos', 'Frete grátis sempre', 'Produção expressa', 'Gerente de conta dedicado', 'Convites para eventos'],
  },
];

export interface LoyaltyDashboard {
  account: LoyaltyAccount;
  levelConfig: LoyaltyLevelConfig;
  nextLevel?: LoyaltyLevelConfig;
  pointsToNextLevel?: number;
  progressPercent: number;
  recentTransactions: LoyaltyTransaction[];
  availableRewards: LoyaltyReward[];
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'discount' | 'product' | 'shipping' | 'upgrade';
  value: number;
  available: boolean;
}
