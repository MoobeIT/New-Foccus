// Configuração que funciona tanto local quanto em produção
export const config = {
  // Banco de dados
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
    ssl: process.env.NODE_ENV === 'production',
    pool: {
      min: process.env.NODE_ENV === 'production' ? 5 : 1,
      max: process.env.NODE_ENV === 'production' ? 20 : 5,
    }
  },

  // Cache
  cache: {
    type: process.env.USE_MEMORY_CACHE === 'true' ? 'memory' : 'redis',
    redis: {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }
  },

  // Filas
  queue: {
    type: process.env.USE_MEMORY_QUEUE === 'true' ? 'memory' : 'rabbitmq',
    rabbitmq: {
      url: process.env.RABBITMQ_URL,
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
    }
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
      bucket: process.env.S3_BUCKET_ASSETS,
    }
  },

  // Render
  render: {
    useMock: process.env.USE_MOCK_RENDER === 'true',
    timeout: parseInt(process.env.RENDER_TIMEOUT || '120000'),
    concurrency: parseInt(process.env.RENDER_CONCURRENCY || '2'),
  }
};

// Tipos para os serviços
export type StorageType = 'local' | 's3';
export type CacheType = 'memory' | 'redis';
export type QueueType = 'memory' | 'rabbitmq';
