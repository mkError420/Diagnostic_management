import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscription.controller';
import { tenantMiddleware, tenantAdminMiddleware, tenantSubscriptionMiddleware } from '../middleware/tenant.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Apply tenant and auth middleware to all subscription routes
router.use(tenantMiddleware);
router.use(authMiddleware);

// Subscription Plans (public)
router.get('/plans', SubscriptionController.getPlans);
router.get('/plans/:slug', SubscriptionController.getPlanBySlug);

// Plan Management (admin only)
router.post('/plans', tenantAdminMiddleware, SubscriptionController.createPlan);
router.put('/plans/:id', tenantAdminMiddleware, SubscriptionController.updatePlan);

// Tenant Subscription Management
router.get('/current', SubscriptionController.getCurrentSubscription);
router.post('/create', SubscriptionController.createSubscription);
router.put('/update/:id', SubscriptionController.updateSubscription);
router.delete('/cancel/:id', SubscriptionController.cancelSubscription);

// Invoices
router.get('/invoices', SubscriptionController.getInvoices);
router.get('/invoices/:id', SubscriptionController.getInvoice);
router.post('/invoices', SubscriptionController.createInvoice);

// Payments
router.get('/payments', SubscriptionController.getPayments);
router.post('/payments', SubscriptionController.createPayment);

// Usage Metrics
router.get('/usage', SubscriptionController.getUsageMetrics);
router.post('/usage', SubscriptionController.recordUsageMetric);

// Billing Events
router.get('/events', SubscriptionController.getBillingEvents);

// Analytics and Reporting
router.get('/overview', SubscriptionController.getSubscriptionOverview);
router.get('/revenue', SubscriptionController.getRevenueReport);
router.get('/analytics', SubscriptionController.getUsageAnalytics);

// Feature and Limit Checking
router.get('/features/:feature', SubscriptionController.checkFeatureAvailability);
router.get('/limits/:metricType', SubscriptionController.checkUsageLimits);
router.get('/status', SubscriptionController.getSubscriptionStatus);

export default router;
