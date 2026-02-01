export default () => ({
  // Ambiente
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/editor_produtos_dev',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: process.env.NODE_ENV === 'production' ? 5 : 1,
      max: process.env.NODE_ENV === 'production' ? 20 : 5,
    },
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'local-development-jwt-secret-key-not-for-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Cache
  cache: {
    type: process.env.USE_MEMORY_CACHE === 'true' ? 'memory' : 'redis',
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },

  // Filas
  queue: {
    type: process.env.USE_MEMORY_QUEUE === 'true' ? 'memory' : 'rabbitmq',
    rabbitmq: {
      url: process.env.RABBITMQ_URL,
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT, 10) || 5672,
      user: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASSWORD,
      vhost: process.env.RABBITMQ_VHOST,
    },
  },

  // Storage
  storage: {
    type: process.env.USE_LOCAL_STORAGE === 'true' ? 'local' : 's3',
    local: {
      path: process.env.LOCAL_STORAGE_PATH || './storage',
    },
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      bucketAssets: process.env.S3_BUCKET_ASSETS,
      bucketRenders: process.env.S3_BUCKET_RENDERS,
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    },
  },

  // Render
  render: {
    useMock: process.env.USE_MOCK_RENDER === 'true',
    timeout: parseInt(process.env.RENDER_TIMEOUT, 10) || 120000,
    previewTimeout: parseInt(process.env.PREVIEW_TIMEOUT, 10) || 30000,
    concurrency: parseInt(process.env.RENDER_CONCURRENCY, 10) || 2,
  },

  // Upload
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '50MB',
    maxFilesPerUpload: parseInt(process.env.MAX_FILES_PER_UPLOAD, 10) || 100,
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/webp',
    ],
  },

  // LGPD
  lgpd: {
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS, 10) || 730,
    consentVersion: process.env.CONSENT_VERSION || '1.0',
  },

  // Features
  features: {
    enableSwagger: process.env.ENABLE_SWAGGER === 'true',
    enablePlayground: process.env.ENABLE_PLAYGROUND === 'true',
    mockPayments: process.env.MOCK_PAYMENTS === 'true',
    mockNotifications: process.env.MOCK_NOTIFICATIONS === 'true',
    mockExternalServices: process.env.MOCK_EXTERNAL_SERVICES === 'true',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'pretty',
  },
});