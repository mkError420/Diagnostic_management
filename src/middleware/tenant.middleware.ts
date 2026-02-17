import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';

// Extend Request interface to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        name: string;
        settings?: Record<string, any>;
      };
    }
  }
}

/**
 * Tenant Middleware
 * 
 * This middleware extracts tenant information from the request headers
 * and sets it in the request object for use in controllers and services.
 * 
 * It supports multiple ways to identify the tenant:
 * 1. X-Tenant-ID header (preferred)
 * 2. X-Tenant-Slug header (for public endpoints)
 * 3. JWT token payload (for authenticated requests)
 */
export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let tenantId: string | undefined;
    let tenantSlug: string | undefined;
    let tenant: any = null;

    // Method 1: Get tenant from headers (preferred)
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const headerTenantSlug = req.headers['x-tenant-slug'] as string;

    if (headerTenantId) {
      tenantId = headerTenantId;
    } else if (headerTenantSlug) {
      tenantSlug = headerTenantSlug;
    }

    // Method 2: Get tenant from JWT token (for authenticated requests)
    if (!tenantId && !tenantSlug && req.user) {
      // Assuming JWT payload contains tenant information
      const tokenPayload = req.user as any;
      tenantId = tokenPayload.tenantId;
      tenantSlug = tokenPayload.tenantSlug;
    }

    // Method 3: Get tenant from subdomain (for web applications)
    if (!tenantId && !tenantSlug && req.hostname) {
      const subdomain = req.hostname.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
        tenantSlug = subdomain;
      }
    }

    // Validate tenant exists and is active
    if (tenantId || tenantSlug) {
      const { pool } = require('../config/database');
      
      let query = `
        SELECT id, slug, name, settings, is_active 
        FROM tenants 
        WHERE is_active = true
      `;
      
      const params: any[] = [];
      
      if (tenantId) {
        query += ' AND id = $1';
        params.push(tenantId);
      } else if (tenantSlug) {
        query += ' AND slug = $1';
        params.push(tenantSlug);
      }
      
      const result = await pool.query(query, params);
      
      if (result.rows.length === 0) {
        throw new ApiError('Tenant not found or inactive', 404);
      }
      
      tenant = result.rows[0];
    }

    // For public endpoints, we might not require tenant
    // But for protected endpoints, tenant is required
    const isProtectedEndpoint = req.path.startsWith('/api/') && 
                            !req.path.startsWith('/api/auth/login') &&
                            !req.path.startsWith('/api/auth/register') &&
                            !req.path.startsWith('/api/public');

    if (isProtectedEndpoint && !tenant) {
      throw new ApiError('Tenant context required', 400);
    }

    // Set tenant in request object
    if (tenant) {
      req.tenant = {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        settings: tenant.settings || {},
      };
    }

    // Set tenant context for database queries
    if (tenant && pool) {
      await pool.query('SET app.current_tenant_id = $1', [tenant.id]);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Tenant Middleware
 * 
 * This middleware makes tenant optional for certain endpoints
 * like public pages or tenant discovery.
 */
export const optionalTenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Try to get tenant but don't fail if not found
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const headerTenantSlug = req.headers['x-tenant-slug'] as string;

    if (headerTenantId || headerTenantSlug) {
      // Use the regular tenant middleware
      return tenantMiddleware(req, res, next);
    }

    // Continue without tenant
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Tenant Validation Middleware
 * 
 * This middleware validates that the user has access to the tenant
 */
export const tenantAccessMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      throw new ApiError('Tenant context required', 400);
    }

    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    const { pool } = require('../config/database');
    
    // Check if user belongs to this tenant
    const result = await pool.query(
      'SELECT id FROM users WHERE tenant_id = $1 AND id = $2 AND is_active = true',
      [req.tenant.id, (req.user as any).id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Access denied: User does not belong to this tenant', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Tenant Admin Middleware
 * 
 * This middleware validates that the user is an admin for the tenant
 */
export const tenantAdminMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenant) {
      throw new ApiError('Tenant context required', 400);
    }

    if (!req.user) {
      throw new ApiError('Authentication required', 401);
    }

    const { pool } = require('../config/database');
    
    // Check if user is admin for this tenant
    const result = await pool.query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.tenant_id = $1 
         AND u.id = $2 
         AND u.is_active = true
         AND r.name = 'admin'`,
      [req.tenant.id, (req.user as any).id]
    );

    if (result.rows.length === 0) {
      throw new ApiError('Access denied: Admin privileges required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Tenant Subscription Middleware
 * 
 * This middleware validates that the tenant's subscription allows the requested feature
 */
export const tenantSubscriptionMiddleware = (feature: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.tenant) {
        throw new ApiError('Tenant context required', 400);
      }

      const { pool } = require('../config/database');
      
      // Get tenant subscription details
      const result = await pool.query(
        'SELECT subscription_plan, subscription_status FROM tenants WHERE id = $1',
        [req.tenant.id]
      );

      if (result.rows.length === 0) {
        throw new ApiError('Tenant not found', 404);
      }

      const { subscription_plan, subscription_status } = result.rows[0];

      // Check if subscription is active
      if (subscription_status !== 'active') {
        throw new ApiError('Tenant subscription is not active', 403);
      }

      // Check if feature is available in current plan
      const planFeatures = {
        basic: ['appointments', 'patients', 'doctors'],
        professional: ['appointments', 'patients', 'doctors', 'diagnostics', 'billing'],
        enterprise: ['appointments', 'patients', 'doctors', 'diagnostics', 'billing', 'analytics', 'api'],
      };

      const availableFeatures = planFeatures[subscription_plan as keyof typeof planFeatures] || [];
      
      if (!availableFeatures.includes(feature)) {
        throw new ApiError(`Feature '${feature}' not available in ${subscription_plan} plan`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Tenant Rate Limiting Middleware
 * 
 * This middleware applies rate limiting per tenant
 */
export const tenantRateLimitMiddleware = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.tenant?.id || 'anonymous';
      const now = Date.now();
      
      let tenantRequests = requests.get(tenantId);
      
      if (!tenantRequests || now > tenantRequests.resetTime) {
        tenantRequests = { count: 1, resetTime: now + windowMs };
        requests.set(tenantId, tenantRequests);
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
    } catch (error) {
      next(error);
    }
  };
};

export default {
  tenantMiddleware,
  optionalTenantMiddleware,
  tenantAccessMiddleware,
  tenantAdminMiddleware,
  tenantSubscriptionMiddleware,
  tenantRateLimitMiddleware,
};
