-- SaaS Subscription and Billing System Migration
-- This script adds subscription management, billing, and payment processing

-- ========================================
-- SUBSCRIPTION PLANS TABLE
-- ========================================
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
    currency VARCHAR(3) DEFAULT 'USD',
    features JSONB NOT NULL DEFAULT '[]',
    limits JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT true,
    trial_days INTEGER DEFAULT 0,
    setup_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT subscription_plans_tenant_check CHECK (tenant_id IS NULL)
);

-- Indexes for subscription plans
CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_is_public ON subscription_plans(is_public);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, slug, description, price, billing_cycle, features, limits, trial_days) VALUES
('Basic', 'basic', 'Essential features for small clinics', 99.00, 'monthly', 
 '["appointments", "patients", "doctors", "basic_reports"]',
 '{"users": 5, "patients": 500, "appointments_per_month": 1000, "storage_gb": 10}',
  14),
('Professional', 'professional', 'Advanced features for growing practices', 299.00, 'monthly',
 '["appointments", "patients", "doctors", "diagnostics", "billing", "analytics", "api_access", "priority_support"]',
 '{"users": 25, "patients": 5000, "appointments_per_month": 10000, "storage_gb": 100}',
  14),
('Enterprise', 'enterprise', 'Complete solution for large organizations', 999.00, 'monthly',
 '["appointments", "patients", "doctors", "diagnostics", "billing", "analytics", "api_access", "priority_support", "white_label", "custom_integrations", "dedicated_account_manager"]',
 '{"users": -1, "patients": -1, "appointments_per_month": -1, "storage_gb": 1000}',
  30);

-- ========================================
-- TENANT SUBSCRIPTIONS TABLE
-- ========================================
CREATE TABLE tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'trial', -- trial, active, past_due, cancelled, suspended
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    billing_cycle VARCHAR(20) NOT NULL, -- monthly, yearly
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    auto_renew BOOLEAN DEFAULT true,
    payment_method_id UUID,
    last_payment_at TIMESTAMP WITH TIME ZONE,
    next_billing_at TIMESTAMP WITH TIME ZONE,
    usage_stats JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id),
    CONSTRAINT tenant_subscriptions_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for tenant subscriptions
CREATE INDEX idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_next_billing ON tenant_subscriptions(next_billing_at) WHERE status = 'active';

-- ========================================
-- CUSTOMER PORTAL SESSIONS TABLE
-- ========================================
CREATE TABLE customer_portal_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    customer_id VARCHAR(255) NOT NULL, -- Stripe customer ID
    return_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT customer_portal_sessions_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for customer portal sessions
CREATE INDEX idx_customer_portal_sessions_tenant_id ON customer_portal_sessions(tenant_id);
CREATE INDEX idx_customer_portal_sessions_token ON customer_portal_sessions(session_token);
CREATE INDEX idx_customer_portal_sessions_expires ON customer_portal_sessions(expires_at);

-- ========================================
-- INVOICES TABLE (Enhanced)
-- ========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id VARCHAR(255), -- Stripe customer ID
    subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL,
    external_invoice_id VARCHAR(255), -- Stripe invoice ID
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, open, paid, void, uncollectible
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    due_date DATE NOT NULL,
    description TEXT,
    line_items JSONB DEFAULT '[]',
    billing_address JSONB DEFAULT '{}',
    shipping_address JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, invoice_number),
    CONSTRAINT invoices_tenant_check CHECK (tenant_id = current_tenant_id()),
    CONSTRAINT invoices_amount_check CHECK (total_amount >= 0 AND paid_amount >= 0 AND paid_amount <= total_amount)
);

-- Indexes for invoices
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON invoices(tenant_id, customer_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(tenant_id, subscription_id);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due_date ON invoices(tenant_id, due_date);
CREATE INDEX idx_invoices_balance ON invoices(tenant_id, balance_amount) WHERE balance_amount > 0;
CREATE INDEX idx_invoices_deleted_at ON invoices(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- PAYMENTS TABLE (Enhanced)
-- ========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    customer_id VARCHAR(255), -- Stripe customer ID
    subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    payment_number VARCHAR(50) NOT NULL,
    external_payment_id VARCHAR(255), -- Stripe payment ID
    payment_intent_id VARCHAR(255), -- Stripe payment intent ID
    payment_method_id VARCHAR(255), -- Stripe payment method ID
    payment_method_type VARCHAR(50), -- card, bank_transfer, etc.
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed, canceled, refunded
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    fee DECIMAL(12, 2) DEFAULT 0, -- Processing fee
    net_amount DECIMAL(12, 2) GENERATED ALWAYS AS (amount - fee) STORED,
    description TEXT,
    gateway_response JSONB DEFAULT '{}',
    failure_reason TEXT,
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    processed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, payment_number),
    CONSTRAINT payments_tenant_check CHECK (tenant_id = current_tenant_id()),
    CONSTRAINT payments_amount_check CHECK (amount >= 0 AND fee >= 0 AND refund_amount >= 0 AND refund_amount <= amount)
);

-- Indexes for payments
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON payments(tenant_id, invoice_id);
CREATE INDEX idx_payments_customer_id ON payments(tenant_id, customer_id);
CREATE INDEX idx_payments_subscription_id ON payments(tenant_id, subscription_id);
CREATE INDEX idx_payments_status ON payments(tenant_id, payment_status);
CREATE INDEX idx_payments_external_id ON payments(tenant_id, external_payment_id);
CREATE INDEX idx_payments_deleted_at ON payments(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- PAYMENT METHODS TABLE
-- ========================================
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id VARCHAR(255) NOT NULL, -- Stripe customer ID
    external_payment_method_id VARCHAR(255) NOT NULL UNIQUE, -- Stripe payment method ID
    type VARCHAR(50) NOT NULL, -- card, bank_account, etc.
    brand VARCHAR(50), -- visa, mastercard, etc.
    last4 VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    cardholder_name VARCHAR(255),
    billing_address JSONB DEFAULT '{}',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT payment_methods_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for payment methods
CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_customer_id ON payment_methods(tenant_id, customer_id);
CREATE INDEX idx_payment_methods_external_id ON payment_methods(external_payment_method_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(tenant_id, is_default) WHERE is_default = true;

-- ========================================
-- USAGE METRICS TABLE
-- ========================================
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES tenant_subscriptions(id) ON DELETE SET NULL,
    metric_type VARCHAR(50) NOT NULL, -- users, patients, appointments, storage, api_calls
    metric_value INTEGER NOT NULL,
    metric_unit VARCHAR(20), -- count, gb, calls, etc.
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT usage_metrics_tenant_check CHECK (tenant_id = current_tenant_id()),
    CONSTRAINT usage_metrics_period_check CHECK (period_end > period_start)
);

-- Indexes for usage metrics
CREATE INDEX idx_usage_metrics_tenant_id ON usage_metrics(tenant_id);
CREATE INDEX idx_usage_metrics_type ON usage_metrics(tenant_id, metric_type);
CREATE INDEX idx_usage_metrics_period ON usage_metrics(tenant_id, period_start, period_end);

-- ========================================
-- BILLING EVENTS TABLE
-- ========================================
CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- subscription.created, subscription.updated, invoice.paid, payment.failed
    event_data JSONB NOT NULL DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT billing_events_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for billing events
CREATE INDEX idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_type ON billing_events(tenant_id, event_type);
CREATE INDEX idx_billing_events_processed ON billing_events(tenant_id, processed) WHERE processed = false;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenant_subscriptions_updated_at BEFORE UPDATE ON tenant_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTIONS FOR BILLING OPERATIONS
-- ========================================

-- Calculate usage for a tenant
CREATE OR REPLACE FUNCTION calculate_tenant_usage(
    p_tenant_id UUID,
    p_metric_type VARCHAR(50),
    p_period_start TIMESTAMP WITH TIME ZONE,
    p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
    usage_count INTEGER := 0;
BEGIN
    CASE p_metric_type
        WHEN 'users' THEN
            SELECT COUNT(*) INTO usage_count
            FROM users
            WHERE tenant_id = p_tenant_id 
              AND created_at >= p_period_start 
              AND created_at <= p_period_end
              AND deleted_at IS NULL;
        
        WHEN 'patients' THEN
            SELECT COUNT(*) INTO usage_count
            FROM patients
            WHERE tenant_id = p_tenant_id 
              AND created_at >= p_period_start 
              AND created_at <= p_period_end
              AND deleted_at IS NULL;
        
        WHEN 'appointments' THEN
            SELECT COUNT(*) INTO usage_count
            FROM appointments
            WHERE tenant_id = p_tenant_id 
              AND appointment_date >= DATE(p_period_start) 
              AND appointment_date <= DATE(p_period_end)
              AND deleted_at IS NULL;
        
        WHEN 'storage' THEN
            -- Calculate storage usage in GB (simplified)
            SELECT CEIL(SUM(pg_column_size(data)::NUMERIC / 1024 / 1024 / 1024)) INTO usage_count
            FROM documents
            WHERE tenant_id = p_tenant_id 
              AND created_at >= p_period_start 
              AND created_at <= p_period_end
              AND deleted_at IS NULL;
        
        ELSE
            usage_count := 0;
    END CASE;
    
    RETURN usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record usage metrics
CREATE OR REPLACE FUNCTION record_usage_metric(
    p_tenant_id UUID,
    p_subscription_id UUID,
    p_metric_type VARCHAR(50),
    p_metric_value INTEGER,
    p_metric_unit VARCHAR(20),
    p_period_start TIMESTAMP WITH TIME ZONE,
    p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO usage_metrics (
        tenant_id, subscription_id, metric_type, metric_value, metric_unit,
        period_start, period_end
    ) VALUES (
        p_tenant_id, p_subscription_id, p_metric_type, p_metric_value, p_metric_unit,
        p_period_start, p_period_end
    );
    
    -- Check if usage exceeds limits
    PERFORM check_usage_limits(p_tenant_id, p_metric_type, p_metric_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check usage against subscription limits
CREATE OR REPLACE FUNCTION check_usage_limits(
    p_tenant_id UUID,
    p_metric_type VARCHAR(50),
    p_current_usage INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_limit INTEGER;
    v_plan_name VARCHAR(100);
BEGIN
    -- Get current subscription limits
    SELECT sp.limits->>p_metric_type, sp.name
    INTO v_limit, v_plan_name
    FROM tenant_subscriptions ts
    JOIN subscription_plans sp ON ts.plan_id = sp.id
    WHERE ts.tenant_id = p_tenant_id 
      AND ts.status = 'active';
    
    -- Check if limit exists and is exceeded
    IF v_limit IS NOT NULL AND v_limit > 0 AND p_current_usage > v_limit THEN
        -- Create billing event for limit exceeded
        INSERT INTO billing_events (tenant_id, event_type, event_data)
        VALUES (
            p_tenant_id,
            'usage_limit_exceeded',
            jsonb_build_object(
                'metric_type', p_metric_type,
                'current_usage', p_current_usage,
                'limit', v_limit,
                'plan', v_plan_name
            )
        );
        
        -- Could also send notification or email here
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    new_id TEXT;
BEGIN
    SELECT COALESCE(MAX(invoice_number), 'INV000000') INTO last_id
    FROM invoices
    WHERE tenant_id = p_tenant_id;
    
    new_id := 'INV' || LPAD((SUBSTRING(last_id FROM 4) + 1)::TEXT, 6, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    new_id TEXT;
BEGIN
    SELECT COALESCE(MAX(payment_number), 'PAY000000') INTO last_id
    FROM payments
    WHERE tenant_id = p_tenant_id;
    
    new_id := 'PAY' || LPAD((SUBSTRING(last_id FROM 4) + 1)::TEXT, 6, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VIEWS FOR BILLING REPORTING
-- ========================================

-- Subscription overview view
CREATE VIEW subscription_overview AS
SELECT 
    ts.id,
    ts.tenant_id,
    t.name as tenant_name,
    t.email as tenant_email,
    sp.name as plan_name,
    sp.slug as plan_slug,
    ts.status,
    ts.current_period_start,
    ts.current_period_end,
    ts.trial_end,
    ts.price,
    ts.currency,
    ts.billing_cycle,
    ts.auto_renew,
    ts.next_billing_at,
    CASE 
        WHEN ts.status = 'trial' THEN EXTRACT(EPOCH FROM (ts.trial_end - CURRENT_TIMESTAMP))/86400
        WHEN ts.status = 'active' THEN EXTRACT(EPOCH FROM (ts.current_period_end - CURRENT_TIMESTAMP))/86400
        ELSE NULL
    END as days_remaining,
    um.users_usage,
    um.patients_usage,
    um.appointments_usage,
    um.storage_usage
FROM tenant_subscriptions ts
JOIN tenants t ON ts.tenant_id = t.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
LEFT JOIN LATERAL (
    SELECT 
        tenant_id,
        subscription_id,
        MAX(CASE WHEN metric_type = 'users' THEN metric_value END) as users_usage,
        MAX(CASE WHEN metric_type = 'patients' THEN metric_value END) as patients_usage,
        MAX(CASE WHEN metric_type = 'appointments' THEN metric_value END) as appointments_usage,
        MAX(CASE WHEN metric_type = 'storage' THEN metric_value END) as storage_usage
    FROM usage_metrics 
    WHERE period_start >= CURRENT_DATE - INTERVAL '30 days'
      AND period_end <= CURRENT_DATE
    GROUP BY tenant_id, subscription_id
) um ON ts.id = um.subscription_id
WHERE ts.deleted_at IS NULL;

-- Revenue reporting view
CREATE VIEW revenue_report AS
SELECT 
    DATE_TRUNC('month', i.created_at) as month,
    sp.name as plan_name,
    COUNT(*) as invoice_count,
    SUM(i.total_amount) as total_revenue,
    SUM(i.paid_amount) as paid_revenue,
    SUM(i.balance_amount) as outstanding_revenue,
    AVG(i.total_amount) as avg_invoice_amount,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN i.status = 'open' THEN 1 END) as open_invoices
FROM invoices i
JOIN tenant_subscriptions ts ON i.subscription_id = ts.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE i.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', i.created_at), sp.name
ORDER BY month DESC;

-- Usage analytics view
CREATE VIEW usage_analytics AS
SELECT 
    DATE_TRUNC('day', um.period_start) as date,
    um.metric_type,
    um.metric_unit,
    SUM(um.metric_value) as total_usage,
    AVG(um.metric_value) as avg_usage,
    MAX(um.metric_value) as peak_usage,
    COUNT(*) as data_points,
    t.name as tenant_name,
    sp.name as plan_name
FROM usage_metrics um
JOIN tenants t ON um.tenant_id = t.id
JOIN tenant_subscriptions ts ON um.subscription_id = ts.id
JOIN subscription_plans sp ON ts.plan_id = sp.id
WHERE um.period_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', um.period_start), um.metric_type, um.metric_unit, t.name, sp.name
ORDER BY date DESC, metric_type;

-- Update statistics
ANALYZE;

-- This migration adds comprehensive subscription and billing functionality
-- including plan management, invoicing, payment processing, usage tracking,
-- and analytics for the multi-tenant clinic management SaaS platform.
