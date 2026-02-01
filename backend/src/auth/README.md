# Auth Module

Este módulo implementa o sistema completo de autenticação com JWT e refresh tokens para a aplicação.

## Funcionalidades Implementadas

### 1. Registro de Usuários ✅
- Endpoint: `POST /auth/register`
- Validação de email e senha forte
- Hash seguro da senha com bcrypt (12 rounds)
- Suporte a multi-tenancy
- Geração automática de tokens JWT

### 2. Login de Usuários ✅
- Endpoint: `POST /auth/login`
- Autenticação com email e senha
- Validação de usuário ativo
- Verificação de tenant
- Geração de access token (15min) e refresh token (7 dias)

### 3. Refresh Token ✅
- Endpoint: `POST /auth/refresh`
- Renovação de access token usando refresh token
- Validação de tipo de token
- Verificação de usuário ativo

### 4. Logout ✅
- Endpoint: `POST /auth/logout`
- Log de evento de logout
- Preparado para blacklist de tokens (futuro)

### 5. Alteração de Senha ✅
- Endpoint: `PUT /auth/change-password`
- Validação da senha atual
- Validação de força da nova senha
- Hash seguro da nova senha

### 6. Sistema Multi-Tenant ✅
- Header X-Tenant-ID para identificação
- Middleware de contexto de tenant
- Isolamento automático de dados
- Validação de formato de tenant ID

### 7. Guards e Middlewares ✅
- JwtAuthGuard global com suporte a rotas públicas
- TenantContextMiddleware para extração de tenant
- AuditLogInterceptor para logs de auditoria

## Estrutura de Tokens JWT

### Access Token
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "tenantId": "tenant-id",
  "role": "customer|admin|super_admin",
  "type": "access",
  "exp": 1234567890
}
```

### Refresh Token
```json
{
  "userId": "uuid",
  "email": "user@example.com", 
  "tenantId": "tenant-id",
  "role": "customer|admin|super_admin",
  "type": "refresh",
  "exp": 1234567890
}
```

## Endpoints da API

### POST /auth/register
Registra um novo usuário.

**Headers:**
```http
X-Tenant-ID: tenant-slug-or-uuid
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "tenantId": "tenant-id",
    "role": "customer",
    "active": true
  },
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token"
}
```

### POST /auth/login
Autentica um usuário.

**Headers:**
```http
X-Tenant-ID: tenant-slug-or-uuid
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass@123"
}
```

### POST /auth/refresh
Renova tokens usando refresh token.

**Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

### POST /auth/logout
Faz logout do usuário (requer autenticação).

**Headers:**
```http
Authorization: Bearer <access-token>
```

### PUT /auth/change-password
Altera a senha do usuário (requer autenticação).

**Headers:**
```http
Authorization: Bearer <access-token>
```

**Body:**
```json
{
  "currentPassword": "CurrentPass@123",
  "newPassword": "NewSecurePass@456"
}
```

## Segurança

### Validação de Senha
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula  
- Pelo menos 1 número
- Pelo menos 1 caractere especial

### Hash de Senha
- Algoritmo: bcrypt
- Salt rounds: 12
- Resistente a ataques de força bruta

### JWT
- Algoritmo: HS256
- Secret configurável via environment
- Access token: 15 minutos
- Refresh token: 7 dias
- Validação de tipo de token

## Decorators

### @Public()
- Marca rotas como públicas (sem autenticação)
- Usado em login, register, refresh

### @CurrentUser()
- Injeta dados do usuário autenticado
- Disponível após autenticação JWT

### @CurrentTenant()
- Injeta tenant ID do contexto
- Disponível em rotas autenticadas

## Uso nos Controllers

### Rotas Públicas
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Post('public-endpoint')
publicEndpoint() {
  return { message: 'Endpoint público' };
}
```

### Rotas Protegidas
```typescript
import { CurrentUser, CurrentTenant } from '../auth/decorators';

@Get('protected-endpoint')
protectedEndpoint(
  @CurrentUser() user: any,
  @CurrentTenant() tenantId: string,
) {
  return { user, tenantId };
}
```

## Configuração

### Environment Variables
```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Headers HTTP
```http
X-Tenant-ID: tenant-slug-or-uuid
Authorization: Bearer <access-token>
```

## Estrutura de Arquivos

```
auth/
├── auth.controller.ts          # Endpoints de autenticação
├── auth.service.ts             # Lógica de negócio
├── auth.module.ts              # Configuração do módulo
├── dto/
│   ├── login.dto.ts           # DTO para login
│   ├── register.dto.ts        # DTO para registro
│   ├── refresh-token.dto.ts   # DTO para refresh
│   ├── change-password.dto.ts # DTO para mudança de senha
│   └── auth-response.dto.ts   # DTO de resposta
├── guards/
│   └── jwt-auth.guard.ts      # Guard JWT global
├── strategies/
│   ├── jwt.strategy.ts        # Estratégia JWT
│   └── local.strategy.ts      # Estratégia local
├── decorators/
│   ├── public.decorator.ts    # Decorator para rotas públicas
│   ├── current-user.decorator.ts  # Decorator para usuário atual
│   └── current-tenant.decorator.ts # Decorator para tenant atual
├── middleware/
│   └── tenant-context.middleware.ts # Middleware de contexto
├── interceptors/
│   └── audit-log.interceptor.ts    # Interceptor de auditoria
└── README.md                  # Esta documentação
```

## Testes

Execute os testes do módulo:

```bash
npm test -- --testPathPatterns=auth.service.spec.ts
npm test -- --testPathPatterns=auth
```

## Próximos Passos

- [ ] Implementar blacklist de tokens para logout seguro
- [ ] Adicionar rate limiting por usuário
- [ ] Implementar 2FA (Two-Factor Authentication)
- [ ] Adicionar logs de tentativas de login falhadas
- [ ] Implementar recuperação de senha por email