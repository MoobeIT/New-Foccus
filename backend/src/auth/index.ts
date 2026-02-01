// Services
export { AuthService } from './auth.service';

// Controllers
export { AuthController } from './auth.controller';

// Guards
export { JwtAuthGuard } from './guards/jwt-auth.guard';

// Strategies
export { JwtStrategy } from './strategies/jwt.strategy';
export { LocalStrategy } from './strategies/local.strategy';

// Decorators
export { Public } from './decorators/public.decorator';
export { CurrentUser } from './decorators/current-user.decorator';
export { CurrentTenant } from './decorators/current-tenant.decorator';

// DTOs
export { LoginDto } from './dto/login.dto';
export { RefreshTokenDto } from './dto/refresh-token.dto';
export { AuthResponseDto } from './dto/auth-response.dto';

// Types
export type { JwtPayload, AuthResult } from './auth.service';
export type { RequestWithTenant } from './middleware/tenant-context.middleware';

// Middleware
export { TenantContextMiddleware } from './middleware/tenant-context.middleware';

// Interceptors
export { AuditLogInterceptor } from './interceptors/audit-log.interceptor';