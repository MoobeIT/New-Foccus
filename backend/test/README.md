# Testes de Integração

Este diretório contém os testes de integração da aplicação, que testam a interação entre diferentes componentes e serviços.

## Estrutura

```
test/
├── auth/
│   └── auth.integration.spec.ts      # Testes de integração de autenticação
├── projects/
│   └── projects.integration.spec.ts  # Testes de integração de projetos
├── assets/
│   └── assets.integration.spec.ts    # Testes de integração de assets
├── jest-e2e.json                     # Configuração Jest para integração
├── setup-integration.ts              # Setup global para testes de integração
└── README.md                         # Esta documentação
```

## Configuração

### Pré-requisitos

1. **PostgreSQL**: Banco de dados para testes
   ```bash
   # Criar usuário e banco de teste
   createuser -s test
   createdb -O test test_integration_db
   ```

2. **Redis**: Cache para testes (opcional)
   ```bash
   # Redis rodando na porta padrão 6379
   redis-server
   ```

3. **Variáveis de Ambiente**: Arquivo `.env.test` configurado

### Configuração do Banco de Dados

O setup automático cria e configura o banco de teste:

```bash
# Configurar banco automaticamente
npm run test:integration:run -- --setup-db

# Ou manualmente
npx prisma migrate deploy
npx prisma generate
```

## Executando Testes

### Comandos NPM

```bash
# Todos os testes de integração
npm run test:integration

# Com script personalizado (recomendado)
npm run test:integration:run

# Windows
npm run test:integration:run:win

# Com cobertura
npm run test:integration:run -- -c

# Filtrar por padrão
npm run test:integration:run -- -f auth

# Modo verboso
npm run test:integration:run -- -v

# Modo CI
npm run test:integration:run -- --ci
```

### Scripts Personalizados

```bash
# Linux/Mac
./scripts/run-integration-tests.sh [opções]

# Windows
scripts\run-integration-tests.bat [opções]
```

#### Opções Disponíveis

- `-h, --help`: Mostra ajuda
- `-c, --coverage`: Executa com cobertura
- `-f, --file <pattern>`: Filtra testes por padrão
- `-v, --verbose`: Saída verbosa
- `--ci`: Modo CI (sem interação)
- `--setup-db`: Apenas configura banco de teste
- `--cleanup-db`: Apenas limpa banco de teste

## Utilitários de Teste

### IntegrationTestSetup

Classe principal para configuração de testes:

```typescript
// Setup da aplicação
const app = await IntegrationTestSetup.setupTestApp({
  imports: [AuthModule, UsersModule],
});

// Setup do banco de dados
const prisma = IntegrationTestSetup.getPrisma();

// Fazer requisições
const response = await IntegrationTestSetup.request()
  .post('/auth/login')
  .send({ email, password });
```

### IntegrationTestUtils

Utilitários para criar dados de teste:

```typescript
// Criar tenant de teste
const tenant = await IntegrationTestUtils.createTestTenant(prisma);

// Criar usuário de teste
const user = await IntegrationTestUtils.createTestUser(prisma, tenantId);

// Autenticar usuário
const token = await IntegrationTestUtils.authenticateUser(app, email);

// Criar headers de autenticação
const headers = IntegrationTestUtils.createAuthHeaders(token);

// Verificações de resposta
IntegrationTestUtils.expectSuccess(response);
IntegrationTestUtils.expectValidationError(response, 'email');
IntegrationTestUtils.expectUnauthorized(response);
IntegrationTestUtils.expectNotFound(response);
```

## Padrões de Teste

### Estrutura de Arquivo

```typescript
describe('Module Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let testTenant: any;
  let testUser: any;
  let accessToken: string;

  beforeAll(async () => {
    app = await IntegrationTestSetup.setupTestApp({
      imports: [ModuleToTest],
    });
    prisma = IntegrationTestSetup.getPrisma();
  });

  beforeEach(async () => {
    testTenant = await IntegrationTestUtils.createTestTenant(prisma);
    testUser = await IntegrationTestUtils.createTestUser(prisma, testTenant.id);
    accessToken = await IntegrationTestUtils.authenticateUser(app, testUser.email);
  });

  afterAll(async () => {
    await IntegrationTestSetup.teardownApp();
  });

  describe('POST /endpoint', () => {
    it('should create resource successfully', async () => {
      const response = await IntegrationTestSetup.request()
        .post('/endpoint')
        .set('X-Tenant-ID', testTenant.id)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      
      // Verificar no banco de dados
      const created = await prisma.resource.findUnique({
        where: { id: response.body.id },
      });
      expect(created).toBeTruthy();
    });
  });
});
```

### Nomenclatura

- Arquivos: `*.integration.spec.ts`
- Describe blocks: Nome do módulo + "Integration Tests"
- Test cases: "should [comportamento esperado]"

## Cenários de Teste

### Autenticação e Autorização

- Registro de usuários
- Login e logout
- Refresh de tokens
- Alteração de senhas
- Acesso a recursos protegidos

### CRUD Operations

- Criação de recursos
- Listagem com paginação e filtros
- Busca por ID
- Atualização de recursos
- Exclusão de recursos

### Validação de Dados

- Dados válidos
- Dados inválidos
- Campos obrigatórios
- Formatos de dados

### Casos de Erro

- Recursos não encontrados (404)
- Acesso não autorizado (401/403)
- Dados inválidos (400)
- Conflitos (409)

### Multi-tenancy

- Isolamento de dados por tenant
- Headers de tenant obrigatórios
- Acesso cross-tenant negado

## Configuração de Ambiente

### Banco de Dados

```sql
-- Criar usuário de teste
CREATE USER test WITH PASSWORD 'test';
ALTER USER test CREATEDB;

-- Criar banco de teste
CREATE DATABASE test_integration_db OWNER test;
```

### Docker (Opcional)

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test_integration_db
    ports:
      - "5433:5432"
  
  redis-test:
    image: redis:7
    ports:
      - "6380:6379"
```

## Debugging

### Logs Durante Testes

```typescript
// Habilitar logs específicos
process.env.LOG_LEVEL = 'debug';

// Capturar logs de teste
console.log('Response:', response.body);
```

### Banco de Dados

```typescript
// Verificar estado do banco
const count = await prisma.user.count();
console.log('Users in DB:', count);

// Inspecionar dados criados
const users = await prisma.user.findMany();
console.log('All users:', users);
```

### Requisições HTTP

```typescript
// Debug de requisições
const response = await IntegrationTestSetup.request()
  .post('/endpoint')
  .set('X-Debug', 'true')
  .send(data);

console.log('Status:', response.status);
console.log('Headers:', response.headers);
console.log('Body:', response.body);
```

## Performance

### Otimizações

- Usar transações para rollback rápido
- Pool de conexões configurado
- Limpeza eficiente entre testes
- Execução sequencial (maxWorkers: 1)

### Timeouts

- Timeout global: 60 segundos
- Timeout por teste: configurável
- Timeout de setup: 30 segundos

## CI/CD

### GitHub Actions

```yaml
- name: Run Integration Tests
  run: |
    npm run test:integration:run -- --ci -c
  env:
    DATABASE_URL: postgresql://test:test@localhost:5432/test_integration_db
    REDIS_URL: redis://localhost:6379/1
```

### Relatórios

- Cobertura em `coverage-integration/`
- Relatórios JUnit para CI
- Logs estruturados para debugging

## Troubleshooting

### Problemas Comuns

1. **Banco não conecta**: Verificar se PostgreSQL está rodando
2. **Testes lentos**: Verificar limpeza de dados entre testes
3. **Memory leaks**: Verificar se conexões estão sendo fechadas
4. **Timeouts**: Aumentar timeout para operações lentas

### Limpeza

```bash
# Limpar banco de teste
npm run test:integration:run -- --cleanup-db

# Resetar completamente
dropdb test_integration_db
createdb test_integration_db
npx prisma migrate deploy
```

## Contribuindo

Ao adicionar novos testes de integração:

1. Siga os padrões estabelecidos
2. Teste cenários de sucesso e erro
3. Verifique isolamento entre testes
4. Documente cenários complexos
5. Mantenha testes rápidos e confiáveis