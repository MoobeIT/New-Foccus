import { Module } from '@nestjs/common';
import { ClientsService } from './services/clients.service';
import { ClientsController } from './controllers/clients.controller';
import { CommonModule } from '../common/common.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [CommonModule, TenantsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
