import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminProductionController } from './controllers/admin-production.controller';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminProductionService } from './services/admin-production.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-jwt-secret-here',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AdminDashboardController, AdminProductionController, AdminOrdersController],
  providers: [AdminDashboardService, AdminProductionService],
  exports: [AdminDashboardService, AdminProductionService],
})
export class AdminModule {}
