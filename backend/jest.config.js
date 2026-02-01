module.exports = {
  // Ambiente de teste
  testEnvironment: 'node',
  
  // Padrões de arquivos de teste
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|ts)',
    '**/*.(test|spec).(js|ts)',
  ],
  
  // Extensões de arquivo suportadas
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Transformação de arquivos TypeScript
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  
  // Diretório raiz dos testes
  rootDir: 'src',
  
  // Configuração de cobertura
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.d.ts',
    '!**/main.ts',
    '!**/app.module.ts',
    '!**/*.module.ts',
  ],
  
  // Limite de cobertura
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Relatórios de cobertura
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Diretório de saída da cobertura
  coverageDirectory: '../coverage',
  
  // Setup de testes
  setupFilesAfterEnv: ['<rootDir>/common/testing/test-setup.ts'],
  
  // Mapeamento de módulos
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@projects/(.*)$': '<rootDir>/projects/$1',
    '^@render/(.*)$': '<rootDir>/render/$1',
    '^@auth/(.*)$': '<rootDir>/auth/$1',
    '^@users/(.*)$': '<rootDir>/users/$1',
  },
  
  // Timeout para testes
  testTimeout: 30000,
  
  // Configurações específicas do ambiente
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
  
  // Ignorar arquivos específicos
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],
  
  // Configuração de cache
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',
  
  // Configuração para testes em paralelo
  maxWorkers: '50%',
  
  // Configuração de logs
  verbose: true,
  
  // Configuração para detectar arquivos abertos
  detectOpenHandles: true,
  
  // Configuração para forçar saída
  forceExit: true,
};