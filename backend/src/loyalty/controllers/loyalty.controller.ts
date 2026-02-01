import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { LoyaltyService } from '../services/loyalty.service';

@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.loyaltyService.getDashboard(tenantId, userId);
  }

  @Get('account')
  async getAccount(@Request() req: any) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.loyaltyService.getOrCreateAccount(tenantId, userId);
  }

  @Post('redeem')
  async redeemPoints(
    @Request() req: any,
    @Body() body: { points: number; rewardId: string },
  ) {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = req.user?.id || 'anonymous';
    return this.loyaltyService.redeemPoints(
      tenantId,
      userId,
      body.points,
      `Resgate: ${body.rewardId}`,
    );
  }
}
