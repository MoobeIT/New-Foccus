import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  userRole?: string;
}

export const TenantContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext || {
      tenantId: request.tenantId || request.user?.tenantId,
      userId: request.user?.id,
      userRole: request.user?.role,
    };
  },
);