// Environment configuration with defaults
export const config = {
  // Server settings
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database settings
  database: {
    type: process.env.DB_TYPE || 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    name: process.env.DB_NAME || 'book_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '8')
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'info'),
    maxFileSize: process.env.NODE_ENV === 'production' ? 2097152 : 5242880, // 2MB prod, 5MB dev
    maxFiles: process.env.NODE_ENV === 'production' ? 3 : 5
  },
  
  // Performance settings
  performance: {
    cacheTtlBooks: parseInt(process.env.CACHE_TTL_BOOKS || '10000'),
    cacheTtlStats: parseInt(process.env.CACHE_TTL_STATS || '30000'),
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '30'),
    maxPendingRequests: parseInt(process.env.MAX_PENDING_REQUESTS || '5')
  },
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_here_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Production optimizations
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production'
};

// Validate required environment variables in production
if (config.isProduction) {
  const requiredVars = ['JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    process.exit(1);
  }
} 