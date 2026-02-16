-- Audit Trails and Additional Features Migration
-- This script adds audit logging, activity tracking, and additional features

-- ========================================
-- AUDIT LOG TABLE
-- ========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT audit_logs_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for audit logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(tenant_id, action);
CREATE INDEX idx_audit_logs_table ON audit_logs(tenant_id, table_name);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(tenant_id, created_at);

-- Enable row level security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL TO public
    USING (tenant_id = current_tenant_id());

-- ========================================
-- ACTIVITY LOG TABLE
-- ========================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT activity_logs_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for activity logs
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(tenant_id, user_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(tenant_id, activity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(tenant_id, created_at);

-- Enable row level security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_activity_logs ON activity_logs
    FOR ALL TO public
    USING (tenant_id = current_tenant_id());

-- ========================================
-- NOTIFICATIONS TABLE
-- ========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT notifications_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for notifications
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_is_read ON notifications(tenant_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(tenant_id, type);
CREATE INDEX idx_notifications_created_at ON notifications(tenant_id, created_at);

-- Enable row level security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notifications ON notifications
    FOR ALL TO public
    USING (tenant_id = current_tenant_id());

-- ========================================
-- DOCUMENTS TABLE (for storing medical documents, images, etc.)
-- ========================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT documents_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for documents
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_clinic_id ON documents(tenant_id, clinic_id);
CREATE INDEX idx_documents_patient_id ON documents(tenant_id, patient_id);
CREATE INDEX idx_documents_user_id ON documents(tenant_id, user_id);
CREATE INDEX idx_documents_type ON documents(tenant_id, document_type);
CREATE INDEX idx_documents_file_hash ON documents(tenant_id, file_hash);
CREATE INDEX idx_documents_deleted_at ON documents(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Enable row level security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

-- ========================================
-- MEDICAL RECORDS TABLE (detailed medical history)
-- ========================================
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    record_type VARCHAR(50) NOT NULL,
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    past_medical_history JSONB DEFAULT '{}',
    family_history JSONB DEFAULT '{}',
    social_history JSONB DEFAULT '{}',
    review_of_systems JSONB DEFAULT '{}',
    physical_examination JSONB DEFAULT '{}',
    assessment TEXT,
    plan TEXT,
    prescriptions JSONB DEFAULT '[]',
    recommendations TEXT,
    follow_up_instructions TEXT,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT medical_records_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for medical records
CREATE INDEX idx_medical_records_tenant_id ON medical_records(tenant_id);
CREATE INDEX idx_medical_records_patient_id ON medical_records(tenant_id, patient_id);
CREATE INDEX idx_medical_records_doctor_id ON medical_records(tenant_id, doctor_id);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(tenant_id, appointment_id);
CREATE INDEX idx_medical_records_type ON medical_records(tenant_id, record_type);
CREATE INDEX idx_medical_records_created_at ON medical_records(tenant_id, created_at);
CREATE INDEX idx_medical_records_deleted_at ON medical_records(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Enable row level security
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_medical_records ON medical_records
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

-- ========================================
-- PRESCRIPTIONS TABLE
-- ========================================
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    prescription_number VARCHAR(50) NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL,
    duration VARCHAR(100),
    quantity INTEGER,
    refills INTEGER DEFAULT 0,
    instructions TEXT,
    indications TEXT,
    contraindications TEXT,
    side_effects TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, prescription_number),
    CONSTRAINT prescriptions_tenant_check CHECK (tenant_id = current_tenant_id())
);

-- Indexes for prescriptions
CREATE INDEX idx_prescriptions_tenant_id ON prescriptions(tenant_id);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(tenant_id, patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(tenant_id, doctor_id);
CREATE INDEX idx_prescriptions_medication ON prescriptions(tenant_id, medication_name);
CREATE INDEX idx_prescriptions_is_active ON prescriptions(tenant_id, is_active);
CREATE INDEX idx_prescriptions_deleted_at ON prescriptions(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Enable row level security
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_prescriptions ON prescriptions
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);

-- ========================================
-- TRIGGERS FOR AUDIT TRAIL
-- ========================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    audit_data JSONB;
BEGIN
    audit_data := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'old', CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        'new', CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by, OLD.created_by),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_diagnostic_tests AFTER INSERT OR UPDATE OR DELETE ON diagnostic_tests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_invoices AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ========================================
-- TRIGGER FOR UPDATED_AT (additional tables)
-- ========================================
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- FUNCTIONS FOR NOTIFICATIONS
-- ========================================

-- Create notification function
CREATE OR REPLACE FUNCTION create_notification(
    p_tenant_id UUID,
    p_user_id UUID,
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        tenant_id, user_id, title, message, type, priority, action_url, metadata
    ) VALUES (
        p_tenant_id, p_user_id, p_title, p_message, p_type, p_priority, p_action_url, p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create bulk notification function
CREATE OR REPLACE FUNCTION create_bulk_notification(
    p_tenant_id UUID,
    p_user_ids UUID[],
    p_title VARCHAR(255),
    p_message TEXT,
    p_type VARCHAR(50) DEFAULT 'info',
    p_priority VARCHAR(20) DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER := 0;
    user_id UUID;
BEGIN
    FOREACH user_id IN ARRAY p_user_ids LOOP
        PERFORM create_notification(p_tenant_id, user_id, p_title, p_message, p_type, p_priority, p_action_url, p_metadata);
        count := count + 1;
    END LOOP;
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- Patient activity summary
CREATE VIEW patient_activity_summary AS
SELECT 
    p.id,
    p.tenant_id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.is_active,
    p.created_at as patient_since,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.appointment_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as appointments_last_30_days,
    COUNT(dt.id) as total_tests,
    COUNT(CASE WHEN dt.status = 'completed' THEN 1 END) as completed_tests,
    COUNT(inv.id) as total_invoices,
    COALESCE(SUM(inv.total_amount), 0) as total_billed,
    COALESCE(SUM(inv.paid_amount), 0) as total_paid,
    COALESCE(SUM(inv.balance_amount), 0) as outstanding_balance,
    MAX(a.appointment_date) as last_appointment_date
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id AND a.deleted_at IS NULL
LEFT JOIN diagnostic_tests dt ON p.id = dt.patient_id AND dt.deleted_at IS NULL
LEFT JOIN invoices inv ON p.id = inv.patient_id AND inv.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.tenant_id, p.patient_id, p.first_name, p.last_name, p.email, p.phone, p.is_active, p.created_at;

-- Doctor performance summary
CREATE VIEW doctor_performance_summary AS
SELECT 
    u.id,
    u.tenant_id,
    u.first_name,
    u.last_name,
    u.email,
    u.specialization,
    u.is_active,
    COUNT(a.id) as total_appointments,
    COUNT(CASE WHEN a.appointment_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as appointments_last_30_days,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    COUNT(DISTINCT p.id) as unique_patients,
    AVG(EXTRACT(EPOCH FROM (a.end_time_actual - a.start_time_actual))/60) as avg_appointment_duration,
    COUNT(dt.id) as tests_ordered,
    COUNT(CASE WHEN dt.status = 'completed' THEN 1 END) as tests_completed,
    COALESCE(SUM(inv.total_amount), 0) as total_revenue_generated
FROM users u
LEFT JOIN appointments a ON u.id = a.doctor_id AND a.deleted_at IS NULL
LEFT JOIN patients p ON a.patient_id = p.id AND p.deleted_at IS NULL
LEFT JOIN diagnostic_tests dt ON u.id = dt.doctor_id AND dt.deleted_at IS NULL
LEFT JOIN invoices inv ON a.id = ANY(
    SELECT jsonb_array_elements(line_items)->>'appointment_id' 
    FROM appointments appt 
    WHERE appt.id = a.id AND appt.deleted_at IS NULL
) AND inv.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.tenant_id, u.first_name, u.last_name, u.email, u.specialization, u.is_active;

-- Revenue analytics view
CREATE VIEW revenue_analytics AS
SELECT 
    i.tenant_id,
    DATE_TRUNC('month', i.invoice_date) as month,
    DATE_TRUNC('year', i.invoice_date) as year,
    COUNT(*) as total_invoices,
    SUM(i.total_amount) as gross_revenue,
    SUM(i.paid_amount) as net_revenue,
    SUM(i.balance_amount) as outstanding_revenue,
    AVG(i.total_amount) as avg_invoice_amount,
    COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_invoices,
    COUNT(CASE WHEN i.status = 'overdue' THEN 1 END) as overdue_invoices,
    COUNT(CASE WHEN i.balance_amount > 0 THEN 1 END) as unpaid_invoices
FROM invoices i
WHERE i.deleted_at IS NULL
GROUP BY i.tenant_id, DATE_TRUNC('month', i.invoice_date), DATE_TRUNC('year', i.invoice_date);

-- ========================================
-- STORED PROCEDURES FOR COMMON OPERATIONS
-- ========================================

-- Get patient dashboard data
CREATE OR REPLACE FUNCTION get_patient_dashboard(p_tenant_id UUID, p_patient_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'patient', row_to_json(p.*),
        'appointments', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'date', a.appointment_date,
                    'time', a.start_time,
                    'status', a.status,
                    'doctor', jsonb_build_object('name', u.first_name || ' ' || u.last_name)
                )
            )
            FROM appointments a
            JOIN users u ON a.doctor_id = u.id
            WHERE a.patient_id = p_patient_id AND a.deleted_at IS NULL
            ORDER BY a.appointment_date DESC, a.start_time DESC
            LIMIT 5
        ),
        'recent_tests', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', dt.id,
                    'test_name', dt.test_name,
                    'status', dt.status,
                    'collection_date', dt.collection_date
                )
            )
            FROM diagnostic_tests dt
            WHERE dt.patient_id = p_patient_id AND dt.deleted_at IS NULL
            ORDER BY dt.created_at DESC
            LIMIT 5
        ),
        'outstanding_balance', (
            SELECT COALESCE(SUM(balance_amount), 0)
            FROM invoices
            WHERE patient_id = p_patient_id AND balance_amount > 0 AND deleted_at IS NULL
        )
    ) INTO result
    FROM patients p
    WHERE p.id = p_patient_id AND p.tenant_id = p_tenant_id AND p.deleted_at IS NULL;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update statistics
ANALYZE;

-- This migration adds comprehensive audit trails, activity logging, notifications,
-- document management, medical records, prescriptions, and reporting views
-- to support a complete clinic management system.
