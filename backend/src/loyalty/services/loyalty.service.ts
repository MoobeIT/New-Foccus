import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import {
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyLevel,
  LoyaltyLevelConfig,
  LoyaltyDashboard,
  LoyaltyReward,
  LOYALTY_LEVELS,
} from '../entities/loyalty.entity';

@Injectable()
export class LoyaltyService {
  private accounts: Map<string, LoyaltyAccount> = new Map();
  private transactions: Map<string, LoyaltyTransaction[]> = new Map();

  constructor(private logger: LoggerService) {}

  async getOrCreateAccount(tenantId: string, userId: string): Promise<LoyaltyAccount> {
    const key = `${tenantId}:${userId}`;
    let account = this.accounts.get(key);

    if (!account) {
      account = {
        id: `loyalty:${key}`,
        tenantId,
        userId,
        level: 'bronze',
        points: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.accounts.set(key, account);
      this.transactions.set(account.id, []);
    }

    return account;
  }

  async getDashboard(tenantId: string, userId: string): Promise<LoyaltyDashboard> {
    const account = await this.getOrCreateAccount(tenantId, userId);
    const levelConfig = this.getLevelConfig(account.level);
    const nextLevel = this.getNextLevel(account.level);
    const transactions = this.transactions.get(account.id) || [];

    let pointsToNextLevel: number | undefined;
    let progressPercent = 100;

    if (nextLevel) {
      pointsToNextLevel = nextLevel.minPoints - account.points;
      const currentLevelPoints = levelConfig.minPoints;
      const pointsInLevel = account.points - currentLevelPoints;
      const pointsNeeded = nextLevel.minPoints - currentLevelPoints;
      progressPercent = Math.min(100, Math.round((pointsInLevel / pointsNeeded) * 100));
    }

    return {
      account,
      levelConfig,
      nextLevel,
      pointsToNextLevel,
      progressPercent,
      recentTransactions: transactions.slice(-10).reverse(),
      availableRewards: this.getAvailableRewards(account),
    };
  }

  async earnPoints(
    tenantId: string,
    userId: string,
    points: number,
    description: string,
    orderId?: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getOrCreateAccount(tenantId, userId);
    const levelConfig = this.getLevelConfig(account.level);
    
    // Apply multiplier
    const earnedPoints = Math.round(points * levelConfig.pointsMultiplier);

    const transaction: LoyaltyTransaction = {
      id: `txn:${Date.now()}`,
      accountId: account.id,
      type: 'earn',
      points: earnedPoints,
      description,
      orderId,
      createdAt: new Date(),
    };

    account.points += earnedPoints;
    account.totalPointsEarned += earnedPoints;
    account.updatedAt = new Date();

    const transactions = this.transactions.get(account.id) || [];
    transactions.push(transaction);
    this.transactions.set(account.id, transactions);

    // Check for level up
    await this.checkLevelUp(account);

    this.logger.debug('Points earned', 'LoyaltyService', {
      userId,
      points: earnedPoints,
      newTotal: account.points,
    });

    return transaction;
  }

  async redeemPoints(
    tenantId: string,
    userId: string,
    points: number,
    description: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getOrCreateAccount(tenantId, userId);

    if (account.points < points) {
      throw new Error('Pontos insuficientes');
    }

    const transaction: LoyaltyTransaction = {
      id: `txn:${Date.now()}`,
      accountId: account.id,
      type: 'redeem',
      points: -points,
      description,
      createdAt: new Date(),
    };

    account.points -= points;
    account.totalPointsRedeemed += points;
    account.updatedAt = new Date();

    const transactions = this.transactions.get(account.id) || [];
    transactions.push(transaction);
    this.transactions.set(account.id, transactions);

    return transaction;
  }

  async addBonusPoints(
    tenantId: string,
    userId: string,
    points: number,
    description: string,
  ): Promise<LoyaltyTransaction> {
    const account = await this.getOrCreateAccount(tenantId, userId);

    const transaction: LoyaltyTransaction = {
      id: `txn:${Date.now()}`,
      accountId: account.id,
      type: 'bonus',
      points,
      description,
      createdAt: new Date(),
    };

    account.points += points;
    account.totalPointsEarned += points;
    account.updatedAt = new Date();

    const transactions = this.transactions.get(account.id) || [];
    transactions.push(transaction);
    this.transactions.set(account.id, transactions);

    await this.checkLevelUp(account);

    return transaction;
  }

  async recordOrder(
    tenantId: string,
    userId: string,
    orderTotal: number,
    orderId: string,
  ): Promise<void> {
    const account = await this.getOrCreateAccount(tenantId, userId);
    
    account.totalOrders += 1;
    account.totalSpent += orderTotal;
    account.updatedAt = new Date();

    // Earn 1 point per R$1 spent
    const pointsToEarn = Math.floor(orderTotal);
    if (pointsToEarn > 0) {
      await this.earnPoints(
        tenantId,
        userId,
        pointsToEarn,
        `Compra #${orderId}`,
        orderId,
      );
    }
  }

  getDiscount(level: LoyaltyLevel): number {
    const config = this.getLevelConfig(level);
    return config.discountPercent;
  }

  getFreeShippingThreshold(level: LoyaltyLevel): number {
    const config = this.getLevelConfig(level);
    return config.freeShippingThreshold;
  }

  private getLevelConfig(level: LoyaltyLevel): LoyaltyLevelConfig {
    return LOYALTY_LEVELS.find(l => l.level === level) || LOYALTY_LEVELS[0];
  }

  private getNextLevel(currentLevel: LoyaltyLevel): LoyaltyLevelConfig | undefined {
    const currentIndex = LOYALTY_LEVELS.findIndex(l => l.level === currentLevel);
    if (currentIndex < LOYALTY_LEVELS.length - 1) {
      return LOYALTY_LEVELS[currentIndex + 1];
    }
    return undefined;
  }

  private async checkLevelUp(account: LoyaltyAccount): Promise<void> {
    const newLevel = this.calculateLevel(account.points);
    if (newLevel !== account.level) {
      const oldLevel = account.level;
      account.level = newLevel;
      
      this.logger.debug('Level up!', 'LoyaltyService', {
        userId: account.userId,
        oldLevel,
        newLevel,
        points: account.points,
      });

      // TODO: Send notification about level up
    }
  }

  private calculateLevel(points: number): LoyaltyLevel {
    for (let i = LOYALTY_LEVELS.length - 1; i >= 0; i--) {
      if (points >= LOYALTY_LEVELS[i].minPoints) {
        return LOYALTY_LEVELS[i].level;
      }
    }
    return 'bronze';
  }

  private getAvailableRewards(account: LoyaltyAccount): LoyaltyReward[] {
    return [
      {
        id: 'reward-1',
        name: 'R$20 de desconto',
        description: 'Desconto de R$20 no próximo pedido',
        pointsCost: 500,
        type: 'discount',
        value: 20,
        available: account.points >= 500,
      },
      {
        id: 'reward-2',
        name: 'R$50 de desconto',
        description: 'Desconto de R$50 no próximo pedido',
        pointsCost: 1000,
        type: 'discount',
        value: 50,
        available: account.points >= 1000,
      },
      {
        id: 'reward-3',
        name: 'Frete Grátis',
        description: 'Frete grátis no próximo pedido',
        pointsCost: 300,
        type: 'shipping',
        value: 0,
        available: account.points >= 300,
      },
      {
        id: 'reward-4',
        name: 'Upgrade de Papel',
        description: 'Upgrade gratuito para papel premium',
        pointsCost: 800,
        type: 'upgrade',
        value: 0,
        available: account.points >= 800,
      },
    ];
  }
}
