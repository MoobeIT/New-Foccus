// Services
export { PricingService } from './services/pricing.service';
export { PricingRulesService } from './services/pricing-rules.service';
export { ShippingService } from './services/shipping.service';

// Controllers
export { PricingController } from './controllers/pricing.controller';

// Entities
export type { PricingRule, PricingCondition, PricingAction, PricingTier } from './entities/pricing-rule.entity';

// Types
export type {
  PricingRequest,
  PricingResult,
  PricingDiscount,
  PricingTax,
  PricingBreakdown,
} from './services/pricing.service';

export type {
  ShippingRequest,
  ShippingResult,
  ShippingOption,
  CepInfo,
} from './services/shipping.service';

// Module
export { PricingModule } from './pricing.module';