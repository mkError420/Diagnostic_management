import { Request, Response } from 'express';
import { SubscriptionService } from '../services/subscription.service';
import { ApiError } from '../utils/api-error';

export class SubscriptionController {
  // Get all subscription plans
  static async getPlans(req: Request, res: Response) {
    try {
      const plans = await SubscriptionService.getPlans();
      res.json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription plan by slug
  static async getPlanBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const plan = await SubscriptionService.getPlanBySlug(slug);
      
      if (!plan) {
        throw new ApiError('Plan not found', 404);
      }

      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create subscription plan (admin only)
  static async createPlan(req: Request, res: Response) {
    try {
      const plan = await SubscriptionService.createPlan(req.body);
      res.status(201).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update subscription plan (admin only)
  static async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const plan = await SubscriptionService.updatePlan(id, req.body);
      
      res.json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current tenant subscription
  static async getCurrentSubscription(req: Request, res: Response) {
    try {
      const subscription = await SubscriptionService.getTenantSubscription(req.tenant!.id);
      
      if (!subscription) {
        throw new ApiError('No subscription found', 404);
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create subscription
  static async createSubscription(req: Request, res: Response) {
    try {
      const subscription = await SubscriptionService.createSubscription({
        tenantId: req.tenant!.id,
        ...req.body,
      });
      
      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update subscription
  static async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const subscription = await SubscriptionService.updateSubscription(id, req.body);
      
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel subscription
  static async cancelSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const subscription = await SubscriptionService.cancelSubscription(id, reason);
      
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get invoices
  static async getInvoices(req: Request, res: Response) {
    try {
      const invoices = await SubscriptionService.getInvoices(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: invoices,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get invoice by ID
  static async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const invoice = await SubscriptionService.getInvoice(id);
      
      if (!invoice) {
        throw new ApiError('Invoice not found', 404);
      }

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create invoice
  static async createInvoice(req: Request, res: Response) {
    try {
      const invoice = await SubscriptionService.createInvoice({
        tenantId: req.tenant!.id,
        createdBy: req.user!.id,
        ...req.body,
      });
      
      res.status(201).json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payments
  static async getPayments(req: Request, res: Response) {
    try {
      const payments = await SubscriptionService.getPayments(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create payment
  static async createPayment(req: Request, res: Response) {
    try {
      const payment = await SubscriptionService.createPayment({
        tenantId: req.tenant!.id,
        processedBy: req.user!.id,
        ...req.body,
      });
      
      res.status(201).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get usage metrics
  static async getUsageMetrics(req: Request, res: Response) {
    try {
      const metrics = await SubscriptionService.getUsageMetrics(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // Record usage metric
  static async recordUsageMetric(req: Request, res: Response) {
    try {
      await SubscriptionService.recordUsageMetric({
        tenantId: req.tenant!.id,
        ...req.body,
      });
      
      res.status(201).json({
        success: true,
        message: 'Usage metric recorded',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get billing events
  static async getBillingEvents(req: Request, res: Response) {
    try {
      const events = await SubscriptionService.getBillingEvents(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: events,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription overview
  static async getSubscriptionOverview(req: Request, res: Response) {
    try {
      const overview = await SubscriptionService.getSubscriptionOverview(req.tenant!.id);
      
      if (!overview) {
        throw new ApiError('No subscription found', 404);
      }

      res.json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get revenue report
  static async getRevenueReport(req: Request, res: Response) {
    try {
      const report = await SubscriptionService.getRevenueReport(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get usage analytics
  static async getUsageAnalytics(req: Request, res: Response) {
    try {
      const analytics = await SubscriptionService.getUsageAnalytics(req.tenant!.id, req.query);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check feature availability
  static async checkFeatureAvailability(req: Request, res: Response) {
    try {
      const { feature } = req.params;
      const subscription = await SubscriptionService.getTenantSubscription(req.tenant!.id);
      
      if (!subscription || !subscription.plan) {
        return res.json({
          success: true,
          available: false,
          reason: 'No active subscription',
        });
      }

      const available = subscription.plan.features.includes(feature);
      
      res.json({
        success: true,
        available,
        plan: subscription.plan.name,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check usage limits
  static async checkUsageLimits(req: Request, res: Response) {
    try {
      const { metricType } = req.params;
      const subscription = await SubscriptionService.getTenantSubscription(req.tenant!.id);
      
      if (!subscription || !subscription.plan) {
        return res.json({
          success: true,
          withinLimit: false,
          current: 0,
          limit: 0,
          metricType,
        });
      }

      const limit = subscription.plan.limits[metricType] || 0;
      
      // Get current usage
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const metrics = await SubscriptionService.getUsageMetrics(req.tenant!.id, {
        metricType,
        periodStart,
        periodEnd,
      });
      
      const currentUsage = metrics.reduce((sum, metric) => sum + metric.metricValue, 0);
      
      const withinLimit = limit === -1 || currentUsage <= limit;
      
      res.json({
        success: true,
        withinLimit,
        current: currentUsage,
        limit,
        metricType,
        percentage: limit > 0 ? (currentUsage / limit) * 100 : 0,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription status
  static async getSubscriptionStatus(req: Request, res: Response) {
    try {
      const subscription = await SubscriptionService.getTenantSubscription(req.tenant!.id);
      
      if (!subscription) {
        return res.json({
          success: true,
          status: 'none',
          message: 'No subscription found',
        });
      }

      const daysUntilRenewal = subscription.nextBillingAt 
        ? Math.ceil((subscription.nextBillingAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      res.json({
        success: true,
        status: subscription.status,
        plan: subscription.plan.name,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
        nextBillingAt: subscription.nextBillingAt,
        autoRenew: subscription.autoRenew,
        daysUntilRenewal,
        price: subscription.price,
        currency: subscription.currency,
        billingCycle: subscription.billingCycle,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SubscriptionController;
