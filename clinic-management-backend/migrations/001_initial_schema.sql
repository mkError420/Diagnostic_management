-- Multi-tenant Clinic Management SaaS Database Schema
-- PostgreSQL Migration Script

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'doctor', 'patient');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE test_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'partially_paid');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Create tenant_id function for row-level security
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS uuid AS $$
BEGIN
  -- This will be set by the application middleware
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TENANT TABLE (Root level)
-- ========================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    max_users INTEGER DEFAULT 10,
    max_patients INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- CLINICS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    tax_id VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    website VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(10) DEFAULT 'en',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT clinics_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for clinics
CREATE INDEX idx_clinics_tenant_id ON clinics(tenant_id);
CREATE INDEX idx_clinics_name ON clinics(tenant_id, name);
CREATE INDEX idx_clinics_is_active ON clinics(tenant_id, is_active);
CREATE INDEX idx_clinics_deleted_at ON clinics(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- ROLES TABLE (Tenant-specific)
-- ========================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, name),
    CONSTRAINT roles_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for roles
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_name ON roles(tenant_id, name);
CREATE INDEX idx_roles_is_active ON roles(tenant_id, is_active);
CREATE INDEX idx_roles_deleted_at ON roles(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- USERS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    specialization VARCHAR(100),
    license_number VARCHAR(100),
    npi_number VARCHAR(20), -- National Provider Identifier
    department VARCHAR(100),
    bio TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(50),
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, email),
    CONSTRAINT users_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for users
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_clinic_id ON users(tenant_id, clinic_id);
CREATE INDEX idx_users_role_id ON users(tenant_id, role_id);
CREATE INDEX idx_users_name ON users(tenant_id, first_name, last_name);
CREATE INDEX idx_users_specialization ON users(tenant_id, specialization);
CREATE INDEX idx_users_is_active ON users(tenant_id, is_active);
CREATE INDEX idx_users_deleted_at ON users(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- PATIENTS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    patient_id VARCHAR(50) NOT NULL, -- Patient number (auto-generated)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    blood_type VARCHAR(10),
    marital_status VARCHAR(20),
    occupation VARCHAR(100),
    employer VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(50),
    primary_care_physician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    referring_physician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    allergies TEXT,
    medical_history JSONB DEFAULT '{}',
    family_history JSONB DEFAULT '{}',
    medications JSONB DEFAULT '{}',
    insurance_info JSONB DEFAULT '{}',
    notes TEXT,
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, patient_id),
    CONSTRAINT patients_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for patients
CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX idx_patients_clinic_id ON patients(tenant_id, clinic_id);
CREATE INDEX idx_patients_patient_id ON patients(tenant_id, patient_id);
CREATE INDEX idx_patients_name ON patients(tenant_id, first_name, last_name);
CREATE INDEX idx_patients_email ON patients(tenant_id, email);
CREATE INDEX idx_patients_phone ON patients(tenant_id, phone);
CREATE INDEX idx_patients_dob ON patients(tenant_id, date_of_birth);
CREATE INDEX idx_patients_primary_care ON patients(tenant_id, primary_care_physician_id);
CREATE INDEX idx_patients_is_active ON patients(tenant_id, is_active);
CREATE INDEX idx_patients_deleted_at ON patients(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- APPOINTMENTS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_number VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    appointment_type VARCHAR(100),
    status appointment_status DEFAULT 'scheduled',
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    start_time_actual TIMESTAMP WITH TIME ZONE,
    end_time_actual TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    rescheduled_from UUID REFERENCES appointments(id) ON DELETE SET NULL,
    rescheduled_to UUID REFERENCES appointments(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, appointment_number),
    CONSTRAINT appointments_tenant_check CHECK (tenant_id = current_tenant_id()),
    CONSTRAINT appointments_time_check CHECK (end_time > start_time),
    CONSTRAINT appointments_date_check CHECK (appointment_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- Indexes for appointments
CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX idx_appointments_clinic_id ON appointments(tenant_id, clinic_id);
CREATE INDEX idx_appointments_patient_id ON appointments(tenant_id, patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(tenant_id, doctor_id);
CREATE INDEX idx_appointments_date ON appointments(tenant_id, appointment_date);
CREATE INDEX idx_appointments_datetime ON appointments(tenant_id, appointment_date, start_time);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status);
CREATE INDEX idx_appointments_created_by ON appointments(tenant_id, created_by);
CREATE INDEX idx_appointments_deleted_at ON appointments(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- DIAGNOSTIC_TESTS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE diagnostic_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_number VARCHAR(50) NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_category VARCHAR(100),
    test_code VARCHAR(50),
    description TEXT,
    instructions TEXT,
    specimen_type VARCHAR(100),
    collection_date DATE,
    collection_time TIME,
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    lab_name VARCHAR(255),
    lab_reference VARCHAR(100),
    urgency VARCHAR(20) DEFAULT 'routine',
    status test_status DEFAULT 'pending',
    scheduled_date DATE,
    scheduled_time TIME,
    estimated_completion_date DATE,
    actual_completion_date DATE,
    cost DECIMAL(10, 2),
    insurance_coverage BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, test_number),
    CONSTRAINT diagnostic_tests_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for diagnostic_tests
CREATE INDEX idx_diagnostic_tests_tenant_id ON diagnostic_tests(tenant_id);
CREATE INDEX idx_diagnostic_tests_clinic_id ON diagnostic_tests(tenant_id, clinic_id);
CREATE INDEX idx_diagnostic_tests_patient_id ON diagnostic_tests(tenant_id, patient_id);
CREATE INDEX idx_diagnostic_tests_doctor_id ON diagnostic_tests(tenant_id, doctor_id);
CREATE INDEX idx_diagnostic_tests_status ON diagnostic_tests(tenant_id, status);
CREATE INDEX idx_diagnostic_tests_date ON diagnostic_tests(tenant_id, collection_date);
CREATE INDEX idx_diagnostic_tests_test_name ON diagnostic_tests(tenant_id, test_name);
CREATE INDEX idx_diagnostic_tests_deleted_at ON diagnostic_tests(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- TEST_REPORTS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE test_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    diagnostic_test_id UUID NOT NULL REFERENCES diagnostic_tests(id) ON DELETE CASCADE,
    report_number VARCHAR(50) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'final',
    findings TEXT,
    interpretation TEXT,
    impression TEXT,
    recommendations TEXT,
    normal_ranges JSONB DEFAULT '{}',
    abnormal_findings JSONB DEFAULT '[]',
    critical_values JSONB DEFAULT '[]',
    reference_ranges JSONB DEFAULT '{}',
    methodology TEXT,
    limitations TEXT,
    quality_control JSONB DEFAULT '{}',
    specimen_details JSONB DEFAULT '{}',
    report_date DATE,
    report_time TIME,
    pathologist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'draft',
    pdf_url TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    requires_follow_up BOOLEAN DEFAULT false,
    follow_up_instructions TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, report_number),
    CONSTRAINT test_reports_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for test_reports
CREATE INDEX idx_test_reports_tenant_id ON test_reports(tenant_id);
CREATE INDEX idx_test_reports_diagnostic_test_id ON test_reports(tenant_id, diagnostic_test_id);
CREATE INDEX idx_test_reports_status ON test_reports(tenant_id, status);
CREATE INDEX idx_test_reports_date ON test_reports(tenant_id, report_date);
CREATE INDEX idx_test_reports_pathologist_id ON test_reports(tenant_id, pathologist_id);
CREATE INDEX idx_test_reports_is_abnormal ON test_reports(tenant_id, is_abnormal);
CREATE INDEX idx_test_reports_deleted_at ON test_reports(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- INVOICES TABLE (Tenant-specific)
-- ========================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status invoice_status DEFAULT 'draft',
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(50),
    notes TEXT,
    line_items JSONB DEFAULT '[]',
    insurance_info JSONB DEFAULT '{}',
    billing_address JSONB DEFAULT '{}',
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
CREATE INDEX idx_invoices_clinic_id ON invoices(tenant_id, clinic_id);
CREATE INDEX idx_invoices_patient_id ON invoices(tenant_id, patient_id);
CREATE INDEX idx_invoices_number ON invoices(tenant_id, invoice_number);
CREATE INDEX idx_invoices_date ON invoices(tenant_id, invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(tenant_id, due_date);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_balance ON invoices(tenant_id, balance_amount) WHERE balance_amount > 0;
CREATE INDEX idx_invoices_deleted_at ON invoices(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- PAYMENTS TABLE (Tenant-specific)
-- ========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    payment_type VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_id VARCHAR(255),
    gateway VARCHAR(100),
    gateway_response JSONB DEFAULT '{}',
    status payment_status DEFAULT 'pending',
    notes TEXT,
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, payment_number),
    CONSTRAINT payments_tenant_check CHECK (tenant_id = current_tenant_id()),
    CONSTRAINT payments_amount_check CHECK (amount >= 0 AND refund_amount >= 0 AND refund_amount <= amount)
);

-- Indexes for payments
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_clinic_id ON payments(tenant_id, clinic_id);
CREATE INDEX idx_payments_invoice_id ON payments(tenant_id, invoice_id);
CREATE INDEX idx_payments_patient_id ON payments(tenant_id, patient_id);
CREATE INDEX idx_payments_number ON payments(tenant_id, payment_number);
CREATE INDEX idx_payments_date ON payments(tenant_id, payment_date);
CREATE INDEX idx_payments_status ON payments(tenant_id, status);
CREATE INDEX idx_payments_transaction_id ON payments(tenant_id, transaction_id);
CREATE INDEX idx_payments_deleted_at ON payments(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diagnostic_tests_updated_at BEFORE UPDATE ON diagnostic_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_reports_updated_at BEFORE UPDATE ON test_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================
-- Enable row level security
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for tenant isolation
CREATE POLICY tenant_isolation_clinics ON clinics
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_roles ON roles
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_patients ON patients
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_appointments ON appointments
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_diagnostic_tests ON diagnostic_tests
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_test_reports ON test_reports
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_invoices ON invoices
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

CREATE POLICY tenant_isolation_payments ON payments
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

-- ========================================
-- FUNCTIONS FOR AUTO-GENERATION
-- ========================================

-- Generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    new_id TEXT;
BEGIN
    SELECT COALESCE(MAX(patient_id), 'P000000') INTO last_id
    FROM patients
    WHERE tenant_id = p_tenant_id;
    
    new_id := 'P' || LPAD((SUBSTRING(last_id FROM 2) + 1)::TEXT, 6, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Generate appointment number
CREATE OR REPLACE FUNCTION generate_appointment_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    new_id TEXT;
BEGIN
    SELECT COALESCE(MAX(appointment_number), 'A000000') INTO last_id
    FROM appointments
    WHERE tenant_id = p_tenant_id;
    
    new_id := 'A' || LPAD((SUBSTRING(last_id FROM 2) + 1)::TEXT, 6, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Generate test number
CREATE OR REPLACE FUNCTION generate_test_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    last_id TEXT;
    new_id TEXT;
BEGIN
    SELECT COALESCE(MAX(test_number), 'T000000') INTO last_id
    FROM diagnostic_tests
    WHERE tenant_id = p_tenant_id;
    
    new_id := 'T' || LPAD((SUBSTRING(last_id FROM 2) + 1)::TEXT, 6, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- ========================================
-- VIEWS FOR COMMON QUERIES
-- ========================================

-- Patient summary view
CREATE VIEW patient_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.date_of_birth,
    p.gender,
    p.blood_type,
    p.is_active,
    p.created_at,
    COUNT(a.id) as appointment_count,
    COUNT(dt.id) as test_count,
    COUNT(inv.id) as invoice_count,
    COALESCE(SUM(inv.total_amount), 0) as total_revenue
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id AND a.deleted_at IS NULL
LEFT JOIN diagnostic_tests dt ON p.id = dt.patient_id AND dt.deleted_at IS NULL
LEFT JOIN invoices inv ON p.id = inv.patient_id AND inv.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.tenant_id, p.patient_id, p.first_name, p.last_name, p.email, p.phone, p.date_of_birth, p.gender, p.blood_type, p.is_active, p.created_at;

-- Doctor summary view
CREATE VIEW doctor_summary AS
SELECT 
    u.id,
    u.tenant_id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone,
    u.specialization,
    u.is_active,
    u.created_at,
    COUNT(a.id) as appointment_count,
    COUNT(DISTINCT p.id) as patient_count,
    COUNT(dt.id) as test_count
FROM users u
LEFT JOIN appointments a ON u.id = a.doctor_id AND a.deleted_at IS NULL
LEFT JOIN patients p ON a.patient_id = p.id AND p.deleted_at IS NULL
LEFT JOIN diagnostic_tests dt ON u.id = dt.doctor_id AND dt.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.tenant_id, u.first_name, u.last_name, u.email, u.phone, u.specialization, u.is_active, u.created_at;

-- Revenue summary view
CREATE VIEW revenue_summary AS
SELECT 
    i.tenant_id,
    DATE_TRUNC('month', i.invoice_date) as month,
    COUNT(*) as invoice_count,
    SUM(i.total_amount) as total_revenue,
    SUM(i.paid_amount) as paid_amount,
    SUM(i.balance_amount) as outstanding_amount
FROM invoices i
WHERE i.deleted_at IS NULL
GROUP BY i.tenant_id, DATE_TRUNC('month', i.invoice_date);

-- ========================================
-- SAMPLE DATA (Optional - for development)
-- ========================================

-- Create a sample tenant (commented out for production)
-- INSERT INTO tenants (name, slug, email, phone, address, city, state, country, postal_code) 
-- VALUES ('Test Clinic', 'test-clinic', 'admin@testclinic.com', '+1234567890', '123 Main St', 'Test City', 'TS', 'USA', '12345');

-- This migration script creates a comprehensive multi-tenant clinic management database schema
-- with proper relationships, indexing, soft deletes, and row-level security for tenant isolation.
