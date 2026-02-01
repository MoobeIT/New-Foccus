module.exports = {
  // TypeScript files
  '*.{ts,tsx}': [
    'eslint --fix',
    'prettier --write',
    'git add',
  ],
  
  // JSON files
  '*.json': [
    'prettier --write',
    'git add',
  ],
  
  // Markdown files
  '*.md': [
    'prettier --write',
    'git add',
  ],
  
  // YAML files
  '*.{yml,yaml}': [
    'prettier --write',
    'git add',
  ],
  
  // Package.json
  'package.json': [
    'sort-package-json',
    'prettier --write',
    'git add',
  ],
  
  // Test files - run tests for changed test files
  '*.{spec,test}.ts': [
    'npm run test:unit -- --findRelatedTests --passWithNoTests',
  ],
  
  // Source files - run related tests
  'src/**/*.ts': [
    'npm run test:unit -- --findRelatedTests --passWithNoTests',
  ],
};