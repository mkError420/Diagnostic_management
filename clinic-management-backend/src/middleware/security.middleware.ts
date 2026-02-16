import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { ApiError } from '../utils/api-error';

// Security configuration
const securityConfig = {
  // CORS configuration
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://yourdomain.com',
      'https://www.yourdomain.com',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Tenant-Slug'],
    exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  },

  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 900, // 15 minutes
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Slow down for brute force attacks
  slowDown: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
    delayMs: 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Max delay of 20 seconds
  },

  // Helmet configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  },
};

// Rate limiting middleware
export const rateLimitMiddleware = rateLimit(securityConfig.rateLimit);

// Slow down middleware for brute force protection
export const slowDownMiddleware = slowDown(securityConfig.slowDown);

// CORS middleware
export const corsMiddleware = cors(securityConfig.cors);

// Helmet middleware
export const helmetMiddleware = helmet(securityConfig.helmet);

// Security headers middleware
export const securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Add cache control for API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

// IP whitelist middleware (optional)
export const ipWhitelistMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const allowedIPs = process.env.ALLOWED_IPS?.split(',') || [];
  
  if (allowedIPs.length > 0) {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (!allowedIPs.includes(clientIP as string)) {
      throw new ApiError('Access denied from this IP', 403);
    }
  }
  
  next();
};

// Request validation middleware
export const requestValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Validate content type
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      throw new ApiError('Content-Type must be application/json', 400);
    }
  }
  
  // Validate request size
  const contentLength = req.headers['content-length'];
  const maxContentSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && parseInt(contentLength) > maxContentSize) {
    throw new ApiError('Request too large', 413);
  }
  
  // Validate API version
  const apiVersion = req.headers['api-version'];
  if (apiVersion && apiVersion !== 'v1') {
    throw new ApiError('Unsupported API version', 400);
  }
  
  next();
};

// Tenant-specific rate limiting
export const tenantRateLimitMiddleware = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number; lastReset: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenant?.id || 'anonymous';
    const now = Date.now();
    
    let tenantRequests = requests.get(tenantId);
    
    if (!tenantRequests || now > tenantRequests.resetTime) {
      tenantRequests = { count: 1, resetTime: now + windowMs, lastReset: now };
      requests.set(tenantId, tenantRequests);
      
      // Clean up old entries periodically
      if (requests.size > 1000) {
        for (const [key, value] of requests.entries()) {
          if (now > value.resetTime) {
            requests.delete(key);
          }
        }
      }
      
      return next();
    }

    if (tenantRequests.count >= maxRequests) {
      const resetTime = Math.ceil((tenantRequests.resetTime - now) / 1000);
      
      res.set('X-RateLimit-Limit', maxRequests);
      res.set('X-RateLimit-Remaining', 0);
      res.set('X-RateLimit-Reset', tenantRequests.resetTime);
      
      throw new ApiError(
        `Too many requests. Try again in ${resetTime} seconds.`,
        429
      );
    }

    tenantRequests.count++;
    
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', maxRequests - tenantRequests.count);
    res.set('X-RateLimit-Reset', tenantRequests.resetTime);
    
    next();
  };
};

// Authentication rate limiting (more strict for auth endpoints)
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 auth attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// API key validation middleware (for API access)
export const apiKeyValidationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    throw new ApiError('API key required', 401);
  }
  
  // Validate API key format (example: basic validation)
  if (!apiKey.startsWith('ck_') || apiKey.length !== 32) {
    throw new ApiError('Invalid API key format', 401);
  }
  
  // In a real implementation, you would validate against your database
  // For now, we'll just check if it matches the environment variable
  const validApiKey = process.env.API_KEY;
  
  if (validApiKey && apiKey !== validApiKey) {
    throw new ApiError('Invalid API key', 401);
  }
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    tenantId: req.tenant?.id,
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
  });
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, {
      duration,
      contentLength: res.get('content-length'),
      tenantId: req.tenant?.id,
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Error handling middleware
export const errorHandlerMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    tenantId: req.tenant?.id,
  });
  
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    }),
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method,
  });
};

export default {
  rateLimitMiddleware,
  slowDownMiddleware,
  corsMiddleware,
  helmetMiddleware,
  securityHeadersMiddleware,
  ipWhitelistMiddleware,
  requestValidationMiddleware,
  tenantRateLimitMiddleware,
  authRateLimitMiddleware,
  apiKeyValidationMiddleware,
  requestLoggingMiddleware,
  errorHandlerMiddleware,
  notFoundHandler,
};
