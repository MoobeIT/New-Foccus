import { Module } from '@nestjs/common';
import { ClientsService } from './services/clients.service';
import { ApprovalsService } from './services/approvals.service';
import { ClientsController } from './controllers/clients.controller';
import { ApprovalsController, PublicApprovalsController } from './controllers/approvals.controller';
import { DatabaseModule } from '../database/database.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [ClientsController, ApprovalsController, PublicApprovalsController],
  providers: [ClientsService, ApprovalsService],
  exports: [ClientsService, ApprovalsService],
})
export class StudioModule {}
