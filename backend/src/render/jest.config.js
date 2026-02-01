module.exports = {
  displayName: 'Render Module Tests',
  testMatch: [
    '<rootDir>/src/render/**/*.spec.ts',
    '<rootDir>/src/render/tests/**/*.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/render/tests/test-setup.ts'],
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/render/services/**/*.ts',
    'src/render/controllers/**/*.ts',
    'src/render/processors/**/*.ts',
    '!src/render/**/*.spec.ts',
    '!src/render/tests/**/*.ts',
    '!src/render/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 300000, // 5 minutos para testes de performance
  maxWorkers: 4, // Limitar workers para testes de carga
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './test-results/render',
        outputName: 'junit.xml',
        suiteName: 'Render Module Tests',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/render',
        filename: 'report.html',
        expand: true,
      },
    ],
  ],
};