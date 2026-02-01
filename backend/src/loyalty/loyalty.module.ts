import { Module } from '@nestjs/common';
import { LoyaltyService } from './services/loyalty.service';
import { LoyaltyController } from './controllers/loyalty.controller';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [CommonModule, TenantsModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
