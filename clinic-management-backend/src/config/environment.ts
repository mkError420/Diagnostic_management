import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment validation schema
interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REFRESH_TOKEN_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  CORS_ORIGINS: string;
  ALLOWED_IPS?: string;
  API_KEY?: string;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
  REDIS_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  EMAIL_FROM?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  UPLOAD_MAX_SIZE: number;
  UPLOAD_ALLOWED_TYPES: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  SLOW_DOWN_WINDOW_MS: number;
  SLOW_DOWN_DELAY_AFTER: number;
  SLOW_DOWN_MAX_DELAY_MS: number;
}

// Validation functions
const validateRequired = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Required environment variable ${name} is missing`);
  }
  return value;
};

const validatePort = (value: string | undefined, name: string): number => {
  const port = parseInt(value || '3000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name}: must be a number between 1 and 65535`);
  }
  return port;
};

const validateBoolean = (value: string | undefined, name: string, defaultValue: boolean): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const validateEnum = <T extends string>(
  value: string | undefined,
  name: string,
  validValues: T[],
  defaultValue: T
): T => {
  if (!value) return defaultValue;
  if (!validValues.includes(value as T)) {
    throw new Error(`Invalid ${name}: must be one of ${validValues.join(', ')}`);
  }
  return value as T;
};

const validateArray = (value: string | undefined, name: string): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error(`Invalid ${name}: must be a JSON array`);
    }
    return parsed;
  } catch {
    throw new Error(`Invalid ${name}: must be a valid JSON array`);
  }
};

// Environment configuration
export const config: EnvironmentConfig = {
  // Application
  NODE_ENV: validateEnum(process.env.NODE_ENV, 'NODE_ENV', ['development', 'production', 'test'], 'development'),
  PORT: validatePort(process.env.PORT, 'PORT'),
  
  // Database
  DATABASE_URL: validateRequired(process.env.DATABASE_URL, 'DATABASE_URL'),
  
  // Authentication
  JWT_SECRET: validateRequired(process.env.JWT_SECRET, 'JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: validatePort(process.env.BCRYPT_ROUNDS, 'BCRYPT_ROUNDS'),
  
  // CORS
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001',
  
  // Security
  ALLOWED_IPS: process.env.ALLOWED_IPS,
  API_KEY: process.env.API_KEY,
  
  // Logging
  LOG_LEVEL: validateEnum(process.env.LOG_LEVEL, 'LOG_LEVEL', ['error', 'warn', 'info', 'debug'], 'info'),
  
  // Redis (optional)
  REDIS_URL: process.env.REDIS_URL,
  
  // Email (optional)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: validatePort(process.env.SMTP_PORT, 'SMTP_PORT'),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  
  // Stripe (optional)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // File uploads
  UPLOAD_MAX_SIZE: validatePort(process.env.UPLOAD_MAX_SIZE, 'UPLOAD_MAX_SIZE'),
  UPLOAD_ALLOWED_TYPES: process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,application/pdf',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: validatePort(process.env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS'),
  RATE_LIMIT_MAX_REQUESTS: validatePort(process.env.RATE_LIMIT_MAX_REQUESTS, 'RATE_LIMIT_MAX_REQUESTS'),
  
  // Slow down
  SLOW_DOWN_WINDOW_MS: validatePort(process.env.SLOW_DOWN_WINDOW_MS, 'SLOW_DOWN_WINDOW_MS'),
  SLOW_DOWN_DELAY_AFTER: validatePort(process.env.SLOW_DOWN_DELAY_AFTER, 'SLOW_DOWN_DELAY_AFTER'),
  SLOW_DOWN_MAX_DELAY_MS: validatePort(process.env.SLOW_DOWN_MAX_DELAY_MS, 'SLOW_DOWN_MAX_DELAY_MS'),
};

// Derived values
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Security configurations
export const securityConfig = {
  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  },
  bcrypt: {
    rounds: config.BCRYPT_ROUNDS,
  },
  cors: {
    origins: config.CORS_ORIGINS.split(',').map(origin => origin.trim()),
    credentials: true,
  },
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
  },
  slowDown: {
    windowMs: config.SLOW_DOWN_WINDOW_MS,
    delayAfter: config.SLOW_DOWN_DELAY_AFTER,
    maxDelayMs: config.SLOW_DOWN_MAX_DELAY_MS,
  },
  upload: {
    maxSize: config.UPLOAD_MAX_SIZE,
    allowedTypes: config.UPLOAD_ALLOWED_TYPES.split(',').map(type => type.trim()),
  },
};

// Database configuration
export const databaseConfig = {
  url: config.DATABASE_URL,
  ssl: config.DATABASE_URL?.includes('ssl=true') || isProduction,
  maxConnections: isProduction ? 20 : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Logging configuration
export const loggingConfig = {
  level: config.LOG_LEVEL,
  format: isDevelopment ? 'dev' : 'json',
  colorize: isDevelopment,
  timestamp: true,
  errors: true,
  warnings: true,
  info: !isProduction,
  debug: isDevelopment,
};

// Email configuration
export const emailConfig = {
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  user: config.SMTP_USER,
  pass: config.SMTP_PASS,
  from: config.EMAIL_FROM,
  secure: config.SMTP_PORT === 465,
};

// Stripe configuration
export const stripeConfig = {
  secretKey: config.STRIPE_SECRET_KEY,
  webhookSecret: config.STRIPE_WEBHOOK_SECRET,
  apiVersion: '2023-10-16',
};

// Redis configuration (if available)
export const redisConfig = config.REDIS_URL ? {
  url: config.REDIS_URL,
  keyPrefix: 'clinic:',
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
} : null;

// Feature flags
export const features = {
  email: !!config.SMTP_HOST,
  stripe: !!config.STRIPE_SECRET_KEY,
  redis: !!redisConfig,
  analytics: isProduction,
  monitoring: isProduction,
};

// Environment-specific settings
export const environmentSettings = {
  development: {
    logging: {
      level: 'debug',
      format: 'dev',
      colorize: true,
    },
    database: {
      ssl: false,
      maxConnections: 5,
    },
    security: {
      rateLimiting: false,
      ipWhitelist: false,
    },
  },
  production: {
    logging: {
      level: 'info',
      format: 'json',
      colorize: false,
    },
    database: {
      ssl: true,
      maxConnections: 20,
    },
    security: {
      rateLimiting: true,
      ipWhitelist: !!config.ALLOWED_IPS,
    },
  },
  test: {
    logging: {
      level: 'error',
      format: 'json',
      colorize: false,
    },
    database: {
      ssl: false,
      maxConnections: 5,
    },
    security: {
      rateLimiting: false,
      ipWhitelist: false,
    },
  },
};

// Get current environment settings
export const currentEnvironmentSettings = environmentSettings[config.NODE_ENV];

// Validation function to check if all required environment variables are set
export const validateEnvironment = (): void => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate database URL format
  try {
    new URL(config.DATABASE_URL);
  } catch {
    throw new Error('Invalid DATABASE_URL format');
  }

  // Validate JWT secret strength
  if (config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate port range
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }

  console.log('✅ Environment variables validated successfully');
};

// Export configuration object
export default {
  config,
  isDevelopment,
  isProduction,
  isTest,
  securityConfig,
  databaseConfig,
  loggingConfig,
  emailConfig,
  stripeConfig,
  redisConfig,
  features,
  currentEnvironmentSettings,
  validateEnvironment,
};
