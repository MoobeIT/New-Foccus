import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from '../middleware/tenant-context.middleware';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    return request.user?.tenantId || request.tenantId;
  },
);