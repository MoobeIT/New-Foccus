# Guia de Qualidade de Código

Este documento descreve as práticas, ferramentas e padrões de qualidade de código utilizados no projeto.

## Ferramentas de Qualidade

### ESLint

Ferramenta de linting para identificar e corrigir problemas no código TypeScript.

**Configuração**: `.eslintrc.js`

**Principais regras**:
- TypeScript strict mode
- Prevenção de `any` explícito
- Verificação de promises não aguardadas
- Complexidade máxima de funções
- Tamanho máximo de arquivos e funções
- Regras de segurança e performance

**Uso**:
```bash
# Verificar problemas
npm run lint:check

# Corrigir automaticamente
npm run lint

# Verificar arquivo específico
npx eslint src/path/to/file.ts
```

### Prettier

Formatador de código para manter consistência de estilo.

**Configuração**: `.prettierrc`

**Principais configurações**:
- Single quotes
- Semicolons obrigatórios
- Trailing commas
- Largura máxima de 120 caracteres
- 2 espaços para indentação

**Uso**:
```bash
# Verificar formatação
npm run format:check

# Formatar código
npm run format

# Formatar arquivo específico
npx prettier --write src/path/to/file.ts
```

### TypeScript

Verificação de tipos estática.

**Uso**:
```bash
# Verificar tipos
npm run type-check

# Compilar (verificação incluída)
npm run build
```

### Husky + Lint-staged

Pre-commit hooks para garantir qualidade antes dos commits.

**Configuração**: 
- `.husky/pre-commit`
- `.husky/commit-msg`
- `.husky/pre-push`
- `.lintstagedrc.js`

**Hooks configurados**:
- **pre-commit**: Lint, format e testes dos arquivos alterados
- **commit-msg**: Validação do formato da mensagem de commit
- **pre-push**: Testes completos, auditoria de segurança e build

### Commitlint

Validação do formato das mensagens de commit seguindo Conventional Commits.

**Configuração**: `.commitlintrc.js`

**Formato esperado**:
```
type(scope): description

feat(auth): add JWT token refresh functionality
fix(assets): resolve image upload validation issue
docs(readme): update installation instructions
```

**Tipos válidos**:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação de código
- `refactor`: Refatoração
- `perf`: Melhoria de performance
- `test`: Testes
- `build`: Build system
- `ci`: CI/CD
- `chore`: Outras alterações

### SonarQube

Análise estática de código para qualidade, segurança e manutenibilidade.

**Configuração**: `sonar-project.properties`

**Métricas analisadas**:
- Cobertura de código
- Duplicação de código
- Complexidade ciclomática
- Vulnerabilidades de segurança
- Code smells
- Bugs potenciais

**Uso**:
```bash
# Análise completa
npm run quality:sonar

# Apenas análise local
sonar-scanner
```

## Scripts de Qualidade

### Script Principal

```bash
# Análise completa
npm run quality

# Windows
npm run quality:win

# Com correção automática
npm run quality:fix

# Apenas SonarQube
npm run quality:sonar
```

### Scripts Específicos

```bash
# Linting
npm run lint:check          # Verificar
npm run lint                # Corrigir

# Formatação
npm run format:check        # Verificar
npm run format              # Corrigir

# Tipos
npm run type-check          # Verificar tipos

# Segurança
npm run security:audit      # Auditoria
npm run security:fix        # Corrigir vulnerabilidades

# Testes para arquivos alterados
npm run test:staged
```

## Padrões de Código

### Estrutura de Arquivos

```typescript
// Imports organizados
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Implementação
  }
}
```

### Nomenclatura

- **Classes**: PascalCase (`UserService`, `AuthController`)
- **Métodos/Variáveis**: camelCase (`createUser`, `isValid`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Arquivos**: kebab-case (`user.service.ts`, `auth.controller.ts`)
- **Interfaces**: PascalCase com prefixo I (`IUserRepository`)

### Documentação

```typescript
/**
 * Cria um novo usuário no sistema
 * @param createUserDto - Dados do usuário a ser criado
 * @returns Promise com o usuário criado
 * @throws BadRequestException quando dados são inválidos
 */
async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
  // Implementação
}
```

### Tratamento de Erros

```typescript
try {
  const result = await this.someAsyncOperation();
  return result;
} catch (error) {
  this.logger.error('Operation failed', error, 'ServiceName');
  throw new InternalServerErrorException('Operation failed');
}
```

### Validação

```typescript
// DTO com validações
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
```

## Métricas de Qualidade

### Cobertura de Código

- **Mínimo**: 70% para branches, functions, lines e statements
- **Objetivo**: 80%+ para código crítico
- **Exclusões**: Arquivos de teste, main.ts, módulos

### Complexidade

- **Complexidade ciclomática**: Máximo 10 por função
- **Profundidade de aninhamento**: Máximo 4 níveis
- **Parâmetros por função**: Máximo 5
- **Linhas por função**: Máximo 100
- **Linhas por arquivo**: Máximo 500

### Performance

- **Build time**: < 2 minutos
- **Test time**: < 5 minutos
- **Lint time**: < 30 segundos

## Integração com CI/CD

### GitHub Actions

```yaml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run quality checks
        run: npm run quality
      
      - name: Run SonarQube analysis
        run: npm run quality:sonar
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Quality Gates

**Critérios para aprovação**:
- ✅ Todos os testes passando
- ✅ Cobertura >= 70%
- ✅ Zero vulnerabilidades críticas
- ✅ Zero problemas de linting
- ✅ Código formatado corretamente
- ✅ Tipos TypeScript válidos
- ✅ Mensagem de commit válida

## Troubleshooting

### Problemas Comuns

**ESLint errors após atualização**:
```bash
# Limpar cache do ESLint
npx eslint --cache-location .eslintcache --cache src/
rm .eslintcache
```

**Prettier conflitos**:
```bash
# Verificar configuração
npx prettier --check src/
# Formatar tudo
npx prettier --write src/
```

**Husky hooks não executam**:
```bash
# Reinstalar hooks
npm run prepare
# Verificar permissões (Linux/Mac)
chmod +x .husky/*
```

**SonarQube falha**:
```bash
# Verificar configuração
cat sonar-project.properties
# Verificar token
echo $SONAR_TOKEN
# Executar com debug
sonar-scanner -X
```

### Debugging

**Verificar configuração ESLint**:
```bash
npx eslint --print-config src/main.ts
```

**Verificar configuração Prettier**:
```bash
npx prettier --find-config-path src/main.ts
```

**Verificar TypeScript config**:
```bash
npx tsc --showConfig
```

## Melhores Práticas

### Desenvolvimento

1. **Sempre executar quality checks antes de commit**
2. **Corrigir warnings, não apenas errors**
3. **Manter funções pequenas e focadas**
4. **Usar tipos TypeScript explícitos**
5. **Documentar código complexo**
6. **Escrever testes para código novo**

### Code Review

1. **Verificar se quality gates passaram**
2. **Revisar cobertura de testes**
3. **Validar nomenclatura e estrutura**
4. **Verificar tratamento de erros**
5. **Confirmar documentação adequada**

### Manutenção

1. **Atualizar dependências regularmente**
2. **Revisar regras de linting periodicamente**
3. **Monitorar métricas de qualidade**
4. **Ajustar thresholds conforme necessário**
5. **Treinar equipe em novas práticas**

## Recursos Adicionais

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Contribuindo

Para contribuir com melhorias na qualidade de código:

1. Propor mudanças via issue/PR
2. Documentar justificativa para mudanças
3. Testar impacto em build/CI
4. Atualizar documentação
5. Treinar equipe se necessário