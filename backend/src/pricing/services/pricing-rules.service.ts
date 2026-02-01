import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../common/services/logger.service';
import { PricingRule, PricingCondition, PricingAction, PricingTier } from '../entities/pricing-rule.entity';
import { PricingRequest } from './pricing.service';

@Injectable()
export class PricingRulesService {
  constructor(private logger: LoggerService) {}

  async getApplicableRules(
    tenantId: string,
    productId: string,
    variantId?: string,
  ): Promise<PricingRule[]> {
    // TODO: Implementar busca no banco de dados
    // Por enquanto, retornar regras mock
    return this.getMockRules(tenantId, productId, variantId);
  }

  async evaluateConditions(
    conditions: PricingCondition[],
    request: PricingRequest,
  ): Promise<boolean> {
    // Todas as condições devem ser verdadeiras (AND lógico)
    for (const condition of conditions) {
      if (!(await this.evaluateCondition(condition, request))) {
        return false;
      }
    }

    return true;
  }

  applyActions(
    actions: PricingAction[],
    currentPrice: number,
    request: PricingRequest,
  ): number {
    let price = currentPrice;

    for (const action of actions) {
      price = this.applyAction(action, price, request);
    }

    return price;
  }

  private async evaluateCondition(
    condition: PricingCondition,
    request: PricingRequest,
  ): Promise<boolean> {
    let value: any;

    // Obter valor baseado no tipo de condição
    switch (condition.type) {
      case 'quantity':
        value = request.quantity;
        break;
      case 'pages':
        value = request.pages || 0;
        break;
      case 'customer_type':
        value = request.customerType;
        break;
      case 'date_range':
        value = new Date();
        break;
      case 'product_type':
        // TODO: Obter tipo do produto do banco
        value = 'fotolivro';
        break;
      default:
        this.logger.warn(
          `Tipo de condição desconhecido: ${condition.type}`,
          'PricingRulesService',
        );
        return false;
    }

    // Avaliar condição baseada no operador
    return this.evaluateOperator(condition.operator, value, condition.value);
  }

  private evaluateOperator(operator: string, actualValue: any, expectedValue: any): boolean {
    switch (operator) {
      case 'eq':
        return actualValue === expectedValue;
      case 'gt':
        return actualValue > expectedValue;
      case 'gte':
        return actualValue >= expectedValue;
      case 'lt':
        return actualValue < expectedValue;
      case 'lte':
        return actualValue <= expectedValue;
      case 'in':
        return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
      case 'between':
        return Array.isArray(expectedValue) && 
               expectedValue.length === 2 && 
               actualValue >= expectedValue[0] && 
               actualValue <= expectedValue[1];
      default:
        this.logger.warn(`Operador desconhecido: ${operator}`, 'PricingRulesService');
        return false;
    }
  }

  private applyAction(
    action: PricingAction,
    currentPrice: number,
    request: PricingRequest,
  ): number {
    switch (action.type) {
      case 'base_price':
        return action.value;
      
      case 'percentage_discount':
        return currentPrice * (1 - action.value / 100);
      
      case 'fixed_discount':
        return Math.max(0, currentPrice - action.value);
      
      case 'markup':
        return currentPrice * (1 + action.value / 100);
      
      case 'tier_price':
        return this.calculateTierPrice(action, request);
      
      default:
        this.logger.warn(`Tipo de ação desconhecido: ${action.type}`, 'PricingRulesService');
        return currentPrice;
    }
  }

  private calculateTierPrice(action: PricingAction, request: PricingRequest): number {
    const tiers = action.metadata?.tiers as PricingTier[] || [];
    
    // Encontrar tier aplicável baseado na quantidade
    for (const tier of tiers.sort((a, b) => b.minQuantity - a.minQuantity)) {
      if (request.quantity >= tier.minQuantity && 
          (!tier.maxQuantity || request.quantity <= tier.maxQuantity)) {
        return tier.basePrice;
      }
    }

    return action.value; // Preço padrão se nenhuma tier se aplicar
  }

  // Métodos para gerenciar regras (CRUD)
  async createRule(rule: Omit<PricingRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingRule> {
    const newRule: PricingRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // TODO: Salvar no banco de dados
    this.logger.debug(`Regra de preço criada: ${newRule.id}`, 'PricingRulesService');
    
    return newRule;
  }

  async updateRule(id: string, updates: Partial<PricingRule>): Promise<PricingRule> {
    // TODO: Implementar atualização no banco
    const updatedRule = {
      ...updates,
      id,
      updatedAt: new Date(),
    } as PricingRule;

    this.logger.debug(`Regra de preço atualizada: ${id}`, 'PricingRulesService');
    
    return updatedRule;
  }

  async deleteRule(id: string): Promise<void> {
    // TODO: Implementar exclusão no banco
    this.logger.debug(`Regra de preço excluída: ${id}`, 'PricingRulesService');
  }

  async getRuleById(id: string): Promise<PricingRule | null> {
    // TODO: Implementar busca no banco
    return null;
  }

  async getRulesByTenant(tenantId: string): Promise<PricingRule[]> {
    // TODO: Implementar busca no banco
    return this.getMockRules(tenantId);
  }

  // Regras mock para desenvolvimento
  private getMockRules(tenantId: string, productId?: string, variantId?: string): PricingRule[] {
    const baseRules: PricingRule[] = [
      {
        id: 'rule-quantity-discount',
        tenantId,
        name: 'Desconto por Quantidade',
        description: 'Desconto progressivo baseado na quantidade',
        conditions: [
          {
            type: 'quantity',
            operator: 'gte',
            value: 5,
          },
        ],
        actions: [
          {
            type: 'percentage_discount',
            value: 10,
            currency: 'BRL',
          },
        ],
        priority: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-business-discount',
        tenantId,
        name: 'Desconto Empresarial',
        description: 'Desconto especial para clientes empresariais',
        conditions: [
          {
            type: 'customer_type',
            operator: 'eq',
            value: 'business',
          },
        ],
        actions: [
          {
            type: 'percentage_discount',
            value: 15,
            currency: 'BRL',
          },
        ],
        priority: 2,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'rule-large-pages',
        tenantId,
        name: 'Desconto para Muitas Páginas',
        description: 'Desconto para projetos com muitas páginas',
        conditions: [
          {
            type: 'pages',
            operator: 'gte',
            value: 50,
          },
        ],
        actions: [
          {
            type: 'percentage_discount',
            value: 5,
            currency: 'BRL',
          },
        ],
        priority: 3,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Filtrar por produto se especificado
    if (productId) {
      return baseRules.filter(rule => !rule.productId || rule.productId === productId);
    }

    return baseRules;
  }

  // Validação de regras
  validateRule(rule: Partial<PricingRule>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim().length === 0) {
      errors.push('Nome da regra é obrigatório');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('Pelo menos uma condição é obrigatória');
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push('Pelo menos uma ação é obrigatória');
    }

    if (rule.priority !== undefined && (rule.priority < 0 || rule.priority > 100)) {
      errors.push('Prioridade deve estar entre 0 e 100');
    }

    // Validar condições
    if (rule.conditions) {
      rule.conditions.forEach((condition, index) => {
        if (!condition.type) {
          errors.push(`Condição ${index + 1}: tipo é obrigatório`);
        }
        if (!condition.operator) {
          errors.push(`Condição ${index + 1}: operador é obrigatório`);
        }
        if (condition.value === undefined || condition.value === null) {
          errors.push(`Condição ${index + 1}: valor é obrigatório`);
        }
      });
    }

    // Validar ações
    if (rule.actions) {
      rule.actions.forEach((action, index) => {
        if (!action.type) {
          errors.push(`Ação ${index + 1}: tipo é obrigatório`);
        }
        if (action.value === undefined || action.value === null) {
          errors.push(`Ação ${index + 1}: valor é obrigatório`);
        }
        if (!action.currency) {
          errors.push(`Ação ${index + 1}: moeda é obrigatória`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Simulação de regras para diferentes cenários
  async simulateRule(
    rule: PricingRule,
    testCases: PricingRequest[],
  ): Promise<{ request: PricingRequest; applies: boolean; resultPrice?: number }[]> {
    const results = [];

    for (const testCase of testCases) {
      const applies = await this.evaluateConditions(rule.conditions, testCase);
      let resultPrice: number | undefined;

      if (applies) {
        // Simular aplicação da regra com preço base mock
        const mockBasePrice = 100; // R$ 100 como base
        resultPrice = this.applyActions(rule.actions, mockBasePrice, testCase);
      }

      results.push({
        request: testCase,
        applies,
        resultPrice,
      });
    }

    return results;
  }
}