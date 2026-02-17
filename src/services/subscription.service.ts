import { pool } from '../config/database';
import { ApiError } from '../utils/api-error';

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
  features: string[];
  limits: Record<string, any>;
  isActive: boolean;
  isPublic: boolean;
  trialDays: number;
  setupFee: number;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  planId: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  autoRenew: boolean;
  nextBillingAt?: Date;
  usageStats: Record<string, any>;
  plan?: SubscriptionPlan;
}

export interface Invoice {
  id: string;
  tenantId: string;
  customerId?: string;
  subscriptionId?: string;
  invoiceNumber: string;
  externalInvoiceId?: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  currency: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  dueDate: Date;
  description?: string;
  lineItems: InvoiceLineItem[];
  billingAddress?: Record<string, any>;
  shippingAddress?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, any>;
}

export interface Payment {
  id: string;
  tenantId: string;
  invoiceId?: string;
  customerId?: string;
  subscriptionId?: string;
  paymentNumber: string;
  externalPaymentId?: string;
  paymentIntentId?: string;
  paymentMethodId?: string;
  paymentMethodType?: string;
  paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  description?: string;
  gatewayResponse?: Record<string, any>;
  failureReason?: string;
  refundAmount: number;
  refundReason?: string;
  refundedAt?: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  customerId: string;
  externalPaymentMethodId: string;
  type: string;
  brand?: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  cardholderName?: string;
  billingAddress?: Record<string, any>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageMetrics {
  id: string;
  tenantId: string;
  subscriptionId?: string;
  metricType: string;
  metricValue: number;
  metricUnit: string;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface BillingEvent {
  id: string;
  tenantId: string;
  eventType: string;
  eventData: Record<string, any>;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

class SubscriptionService {
  // Subscription Plans
  static async getPlans(): Promise<SubscriptionPlan[]> {
    const query = `
      SELECT * FROM subscription_plans 
      WHERE is_active = true 
      ORDER BY price ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
    const query = `
      SELECT * FROM subscription_plans 
      WHERE slug = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  }

  static async createPlan(planData: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const query = `
      INSERT INTO subscription_plans (name, slug, description, price, billing_cycle, currency, features, limits, is_active, is_public, trial_days, setup_fee)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      planData.name,
      planData.slug,
      planData.description,
      planData.price,
      planData.billingCycle,
      planData.currency,
      JSON.stringify(planData.features),
      JSON.stringify(planData.limits),
      planData.isActive,
      planData.isPublic,
      planData.trialDays,
      planData.setupFee
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updatePlan(id: string, planData: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (planData.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(planData.name);
    }
    if (planData.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(planData.description);
    }
    if (planData.price !== undefined) {
      fields.push(`price = $${paramIndex++}`);
      values.push(planData.price);
    }
    if (planData.billingCycle !== undefined) {
      fields.push(`billing_cycle = $${paramIndex++}`);
      values.push(planData.billingCycle);
    }
    if (planData.features !== undefined) {
      fields.push(`features = $${paramIndex++}`);
      values.push(JSON.stringify(planData.features));
    }
    if (planData.limits !== undefined) {
      fields.push(`limits = $${paramIndex++}`);
      values.push(JSON.stringify(planData.limits));
    }
    if (planData.isActive !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(planData.isActive);
    }
    if (planData.isPublic !== undefined) {
      fields.push(`is_public = $${paramIndex++}`);
      values.push(planData.isPublic);
    }
    if (planData.trialDays !== undefined) {
      fields.push(`trial_days = $${paramIndex++}`);
      values.push(planData.trialDays);
    }
    if (planData.setupFee !== undefined) {
      fields.push(`setup_fee = $${paramIndex++}`);
      values.push(planData.setupFee);
    }

    if (fields.length === 0) {
      throw new ApiError('No fields to update', 400);
    }

    const query = `
      UPDATE subscription_plans 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Tenant Subscriptions
  static async getTenantSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const query = `
      SELECT ts.*, sp.name as plan_name, sp.slug as plan_slug, sp.features, sp.limits
      FROM tenant_subscriptions ts
      JOIN subscription_plans sp ON ts.plan_id = sp.id
      WHERE ts.tenant_id = $1
    `;
    
    const result = await pool.query(query, [tenantId]);
    
    if (!result.rows[0]) return null;
    
    const subscription = result.rows[0];
    subscription.plan = {
      id: subscription.plan_id,
      name: subscription.plan_name,
      slug: subscription.plan_slug,
      features: subscription.features,
      limits: subscription.limits
    };
    
    return subscription;
  }

  static async createSubscription(subscriptionData: {
    tenantId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    trialDays?: number;
    customerId?: string;
    paymentMethodId?: string;
  }): Promise<TenantSubscription> {
    const plan = await this.getPlanById(subscriptionData.planId);
    if (!plan) {
      throw new ApiError('Plan not found', 404);
    }

    const now = new Date();
    const trialEnd = subscriptionData.trialDays 
      ? new Date(now.getTime() + subscriptionData.trialDays * 24 * 60 * 60 * 1000)
      : null;

    const currentPeriodEnd = subscriptionData.billingCycle === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const query = `
      INSERT INTO tenant_subscriptions (
        tenant_id, plan_id, status, current_period_start, current_period_end,
        trial_end, billing_cycle, price, currency, auto_renew, next_billing_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      subscriptionData.tenantId,
      subscriptionData.planId,
      trialEnd ? 'trial' : 'active',
      now,
      trialEnd || now,
      trialEnd,
      subscriptionData.billingCycle,
      plan.price,
      plan.currency,
      true,
      currentPeriodEnd
    ];

    const result = await pool.query(query, values);
    
    // Record billing event
    await this.createBillingEvent(subscriptionData.tenantId, 'subscription.created', {
      subscriptionId: result.rows[0].id,
      planId: subscriptionData.planId,
      billingCycle: subscriptionData.billingCycle,
      trialDays: subscriptionData.trialDays
    });

    return result.rows[0];
  }

  static async updateSubscription(id: string, updateData: {
    planId?: string;
    status?: string;
    autoRenew?: boolean;
    cancelReason?: string;
  }): Promise<TenantSubscription> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updateData.planId !== undefined) {
      fields.push(`plan_id = $${paramIndex++}`);
      values.push(updateData.planId);
    }
    if (updateData.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updateData.status);
      
      if (updateData.status === 'cancelled') {
        fields.push(`cancelled_at = $${paramIndex++}`);
        values.push(new Date());
      }
    }
    if (updateData.autoRenew !== undefined) {
      fields.push(`auto_renew = $${paramIndex++}`);
      values.push(updateData.autoRenew);
    }
    if (updateData.cancelReason !== undefined) {
      fields.push(`cancel_reason = $${paramIndex++}`);
      values.push(updateData.cancelReason);
    }

    if (fields.length === 0) {
      throw new ApiError('No fields to update', 400);
    }

    const query = `
      UPDATE tenant_subscriptions 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await pool.query(query, values);
    
    // Record billing event
    await this.createBillingEvent(result.rows[0].tenant_id, 'subscription.updated', {
      subscriptionId: id,
      updates: updateData
    });

    return result.rows[0];
  }

  static async cancelSubscription(id: string, reason?: string): Promise<TenantSubscription> {
    return this.updateSubscription(id, {
      status: 'cancelled',
      cancelReason: reason
    });
  }

  // Invoices
  static async createInvoice(invoiceData: {
    tenantId: string;
    customerId?: string;
    subscriptionId?: string;
    dueDate: Date;
    description?: string;
    lineItems: InvoiceLineItem[];
    billingAddress?: Record<string, any>;
    shippingAddress?: Record<string, any>;
    createdBy: string;
  }): Promise<Invoice> {
    const query = `
      INSERT INTO invoices (
        tenant_id, customer_id, subscription_id, invoice_number, status,
        currency, subtotal, tax_amount, discount_amount, total_amount,
        due_date, description, line_items, billing_address, shipping_address,
        created_by
      )
      VALUES ($1, $2, $3, generate_invoice_number($1), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxAmount;

    const values = [
      invoiceData.tenantId,
      invoiceData.customerId,
      invoiceData.subscriptionId,
      invoiceData.dueDate,
      'draft',
      'USD',
      subtotal,
      taxAmount,
      0, // discountAmount
      totalAmount,
      invoiceData.description,
      JSON.stringify(invoiceData.lineItems),
      JSON.stringify(invoiceData.billingAddress || {}),
      JSON.stringify(invoiceData.shippingAddress || {}),
      invoiceData.createdBy
    ];

    const result = await pool.query(query, values);
    
    // Record billing event
    await this.createBillingEvent(invoiceData.tenantId, 'invoice.created', {
      invoiceId: result.rows[0].id,
      amount: totalAmount
    });

    return result.rows[0];
  }

  static async getInvoices(tenantId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<{ invoices: Invoice[]; total: number; page: number; totalPages: number }> {
    let query = `
      SELECT * FROM invoices 
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(params.status);
    }
    if (params.dateFrom) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(params.dateFrom);
    }
    if (params.dateTo) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(params.dateTo);
    }

    query += ` ORDER BY created_at DESC`;

    // Count total
    const countQuery = query.replace('*', 'COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return {
      invoices: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  static async getInvoice(id: string): Promise<Invoice | null> {
    const query = `
      SELECT * FROM invoices 
      WHERE id = $1 AND deleted_at IS NULL
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Payments
  static async createPayment(paymentData: {
    tenantId: string;
    invoiceId?: string;
    customerId?: string;
    subscriptionId?: string;
    amount: number;
    currency?: string;
    description?: string;
    paymentMethodId?: string;
    processedBy: string;
  }): Promise<Payment> {
    const query = `
      INSERT INTO payments (
        tenant_id, invoice_id, customer_id, subscription_id, payment_number,
        amount, currency, description, payment_method_id, processed_by
      )
      VALUES ($1, $2, $3, $4, generate_payment_number($1), $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      paymentData.tenantId,
      paymentData.invoiceId,
      paymentData.customerId,
      paymentData.subscriptionId,
      paymentData.amount,
      paymentData.currency || 'USD',
      paymentData.description,
      paymentData.paymentMethodId,
      paymentData.processedBy
    ];

    const result = await pool.query(query, values);
    
    // Update invoice paid amount
    if (paymentData.invoiceId) {
      await pool.query(
        'UPDATE invoices SET paid_amount = paid_amount + $1 WHERE id = $2',
        [paymentData.amount, paymentData.invoiceId]
      );
    }

    // Record billing event
    await this.createBillingEvent(paymentData.tenantId, 'payment.created', {
      paymentId: result.rows[0].id,
      amount: paymentData.amount,
      invoiceId: paymentData.invoiceId
    });

    return result.rows[0];
  }

  static async getPayments(tenantId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}): Promise<{ payments: Payment[]; total: number; page: number; totalPages: number }> {
    let query = `
      SELECT * FROM payments 
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.status) {
      query += ` AND payment_status = $${paramIndex++}`;
      values.push(params.status);
    }
    if (params.dateFrom) {
      query += ` AND created_at >= $${paramIndex++}`;
      values.push(params.dateFrom);
    }
    if (params.dateTo) {
      query += ` AND created_at <= $${paramIndex++}`;
      values.push(params.dateTo);
    }

    query += ` ORDER BY created_at DESC`;

    // Count total
    const countQuery = query.replace('*', 'COUNT(*)');
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const offset = (page - 1) * limit;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    return {
      payments: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Usage Metrics
  static async recordUsageMetric(metricData: {
    tenantId: string;
    subscriptionId?: string;
    metricType: string;
    metricValue: number;
    metricUnit: string;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<void> {
    const query = `
      INSERT INTO usage_metrics (
        tenant_id, subscription_id, metric_type, metric_value, metric_unit,
        period_start, period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await pool.query(query, [
      metricData.tenantId,
      metricData.subscriptionId,
      metricData.metricType,
      metricData.metricValue,
      metricData.metricUnit,
      metricData.periodStart,
      metricData.periodEnd
    ]);

    // Check usage limits
    await this.checkUsageLimits(metricData.tenantId, metricData.metricType, metricData.metricValue);
  }

  static async getUsageMetrics(tenantId: string, params: {
    metricType?: string;
    periodStart?: Date;
    periodEnd?: Date;
  } = {}): Promise<UsageMetrics[]> {
    let query = `
      SELECT * FROM usage_metrics 
      WHERE tenant_id = $1
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.metricType) {
      query += ` AND metric_type = $${paramIndex++}`;
      values.push(params.metricType);
    }
    if (params.periodStart) {
      query += ` AND period_start >= $${paramIndex++}`;
      values.push(params.periodStart);
    }
    if (params.periodEnd) {
      query += ` AND period_end <= $${paramIndex++}`;
      values.push(params.periodEnd);
    }

    query += ` ORDER BY period_start DESC, metric_type`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Billing Events
  static async createBillingEvent(tenantId: string, eventType: string, eventData: Record<string, any>): Promise<void> {
    const query = `
      INSERT INTO billing_events (tenant_id, event_type, event_data)
      VALUES ($1, $2, $3)
    `;

    await pool.query(query, [tenantId, eventType, JSON.stringify(eventData)]);
  }

  static async getBillingEvents(tenantId: string, params: {
    eventType?: string;
    processed?: boolean;
    limit?: number;
  } = {}): Promise<BillingEvent[]> {
    let query = `
      SELECT * FROM billing_events 
      WHERE tenant_id = $1
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.eventType) {
      query += ` AND event_type = $${paramIndex++}`;
      values.push(params.eventType);
    }
    if (params.processed !== undefined) {
      query += ` AND processed = $${paramIndex++}`;
      values.push(params.processed);
    }

    query += ` ORDER BY created_at DESC`;

    if (params.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(params.limit);
    }

    const result = await pool.query(query, values);
    return result.rows;
  }

  // Helper methods
  private static async getPlanById(id: string): Promise<SubscriptionPlan | null> {
    const query = 'SELECT * FROM subscription_plans WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  private static async checkUsageLimits(tenantId: string, metricType: string, currentValue: number): Promise<void> {
    const subscription = await this.getTenantSubscription(tenantId);
    if (!subscription || !subscription.plan) return;

    const limit = subscription.plan.limits[metricType];
    if (limit && limit > 0 && currentValue > limit) {
      // Create billing event for limit exceeded
      await this.createBillingEvent(tenantId, 'usage_limit_exceeded', {
        metricType,
        currentValue,
        limit,
        plan: subscription.plan.name
      });

      // Could also send notification or email here
      console.warn(`Usage limit exceeded for tenant ${tenantId}: ${metricType} (${currentValue}/${limit})`);
    }
  }

  // Analytics and Reporting
  static async getSubscriptionOverview(tenantId: string): Promise<any> {
    const query = `
      SELECT * FROM subscription_overview
      WHERE tenant_id = $1
    `;
    
    const result = await pool.query(query, [tenantId]);
    return result.rows[0] || null;
  }

  static async getRevenueReport(tenantId: string, params: {
    periodStart?: Date;
    periodEnd?: Date;
  } = {}): Promise<any[]> {
    let query = `
      SELECT * FROM revenue_report
      WHERE tenant_id = $1
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.periodStart) {
      query += ` AND month >= $${paramIndex++}`;
      values.push(params.periodStart);
    }
    if (params.periodEnd) {
      query += ` AND month <= $${paramIndex++}`;
      values.push(params.periodEnd);
    }

    query += ` ORDER BY month DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getUsageAnalytics(tenantId: string, params: {
    metricType?: string;
    periodStart?: Date;
    periodEnd?: Date;
  } = {}): Promise<any[]> {
    let query = `
      SELECT * FROM usage_analytics
      WHERE tenant_id = $1
    `;
    const values = [tenantId];
    let paramIndex = 2;

    if (params.metricType) {
      query += ` AND metric_type = $${paramIndex++}`;
      values.push(params.metricType);
    }
    if (params.periodStart) {
      query += ` AND date >= $${paramIndex++}`;
      values.push(params.periodStart);
    }
    if (params.periodEnd) {
      query += ` AND date <= $${paramIndex++}`;
      values.push(params.periodEnd);
    }

    query += ` ORDER BY date DESC, metric_type`;

    const result = await pool.query(query, values);
    return result.rows;
  }
}

export default SubscriptionService;
