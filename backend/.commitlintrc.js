module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enum
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Build system or external dependencies
        'ci',       // CI/CD changes
        'chore',    // Other changes that don't modify src or test files
        'revert',   // Revert a previous commit
      ],
    ],
    
    // Subject rules
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 3],
    
    // Type rules
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    
    // Scope rules
    'scope-case': [2, 'always', 'lower-case'],
    'scope-enum': [
      2,
      'always',
      [
        'auth',        // Authentication module
        'users',       // Users module
        'projects',    // Projects module
        'assets',      // Assets module
        'render',      // Render service
        'payments',    // Payment module
        'orders',      // Orders module
        'catalog',     // Catalog module
        'pricing',     // Pricing module
        'checkout',    // Checkout module
        'notifications', // Notifications module
        'privacy',     // Privacy/LGPD module
        'observability', // Monitoring/logging
        'testing',     // Testing infrastructure
        'config',      // Configuration
        'database',    // Database related
        'api',         // API changes
        'ui',          // User interface
        'deps',        // Dependencies
        'security',    // Security related
        'performance', // Performance improvements
        'docs',        // Documentation
        'ci',          // CI/CD
        'docker',      // Docker related
        'scripts',     // Scripts and tooling
      ],
    ],
    
    // Header rules
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 10],
    
    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    
    // Footer rules
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
  
  // Custom parser options
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\(([^)]*)\))?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
  
  // Ignore patterns
  ignores: [
    // Ignore merge commits
    (commit) => commit.includes('Merge'),
    // Ignore revert commits
    (commit) => commit.includes('Revert'),
    // Ignore release commits
    (commit) => commit.includes('Release'),
  ],
  
  // Default ignore rules
  defaultIgnores: true,
  
  // Help URL
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
};