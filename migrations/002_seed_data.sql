-- Seed Data for Multi-tenant Clinic Management SaaS
-- This script creates initial data for development and testing

-- ========================================
-- SAMPLE TENANT
-- ========================================
INSERT INTO tenants (
    name, slug, email, phone, address, city, state, country, postal_code, 
    subscription_plan, subscription_status, max_users, max_patients
) VALUES (
    'Demo Medical Center', 
    'demo-medical-center', 
    'admin@democlinic.com', 
    '+1-555-0123', 
    '123 Healthcare Boulevard', 
    'Medical City', 
    'California', 
    'USA', 
    '90210',
    'professional',
    'active',
    50,
    5000
) ON CONFLICT (email) DO NOTHING;

-- ========================================
-- SAMPLE CLINIC
-- ========================================
INSERT INTO clinics (
    tenant_id, name, license_number, phone, email, address, city, state, 
    country, postal_code, timezone, currency, language
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
    'Main Clinic',
    'MED-123456',
    '+1-555-0124',
    'clinic@democlinic.com',
    '123 Healthcare Boulevard',
    'Medical City',
    'California',
    'USA',
    '90210',
    'America/Los_Angeles',
    'USD',
    'en'
) ON CONFLICT DO NOTHING;

-- ========================================
-- DEFAULT ROLES
-- ========================================
INSERT INTO roles (tenant_id, name, description, permissions, is_system_role) VALUES
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Super Admin', 'Full system access', '{"all": true}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Administrator', 'Clinic administration', '{"clinics": ["read", "write"], "users": ["read", "write"], "patients": ["read", "write"], "appointments": ["read", "write"], "billing": ["read", "write"]}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Doctor', 'Medical practitioner access', '{"patients": ["read", "write"], "appointments": ["read", "write"], "diagnostics": ["read", "write"]}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Nurse', 'Nursing staff access', '{"patients": ["read", "write"], "appointments": ["read", "write"]}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Receptionist', 'Front desk access', '{"patients": ["read", "write"], "appointments": ["read", "write"]}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Lab Technician', 'Laboratory access', '{"diagnostics": ["read", "write"]}', true),
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'), 'Billing Staff', 'Billing access', '{"patients": ["read"], "billing": ["read", "write"]}', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ========================================
-- SAMPLE USERS
-- ========================================
-- Super Admin
INSERT INTO users (
    tenant_id, clinic_id, role_id, email, password_hash, first_name, last_name, 
    phone, specialization, is_active
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
    (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
    (SELECT id FROM roles WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center') AND name = 'Super Admin'),
    'admin@democlinic.com',
    '$2b$10$rQZ8ZqKqZqZqZqZqZqZqZO', -- password: admin123
    'John',
    'Doe',
    '+1-555-0125',
    'System Administration',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Sample Doctor
INSERT INTO users (
    tenant_id, clinic_id, role_id, email, password_hash, first_name, last_name, 
    phone, specialization, license_number, npi_number, department, is_active
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
    (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
    (SELECT id FROM roles WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center') AND name = 'Doctor'),
    'dr.smith@democlinic.com',
    '$2b$10$rQZ8ZqKqZqZqZqZqZqZqZO', -- password: doctor123
    'Sarah',
    'Smith',
    '+1-555-0126',
    'General Practitioner',
    'MD-123456',
    '1234567890',
    'Primary Care',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Sample Nurse
INSERT INTO users (
    tenant_id, clinic_id, role_id, email, password_hash, first_name, last_name, 
    phone, specialization, is_active
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
    (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
    (SELECT id FROM roles WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center') AND name = 'Nurse'),
    'nurse.johnson@democlinic.com',
    '$2b$10$rQZ8ZqKqZqZqZqZqZqZqZO', -- password: nurse123
    'Emily',
    'Johnson',
    '+1-555-0127',
    'Registered Nurse',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Sample Receptionist
INSERT INTO users (
    tenant_id, clinic_id, role_id, email, password_hash, first_name, last_name, 
    phone, is_active
) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
    (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
    (SELECT id FROM roles WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center') AND name = 'Receptionist'),
    'reception.brown@democlinic.com',
    '$2b$10$rQZ8ZqKqZqZqZqZqZqZqZO', -- password: reception123
    'Michael',
    'Brown',
    '+1-555-0128',
    true
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- ========================================
-- SAMPLE PATIENTS
-- ========================================
INSERT INTO patients (
    tenant_id, clinic_id, patient_id, first_name, last_name, email, phone,
    date_of_birth, gender, blood_type, marital_status, emergency_contact_name,
    emergency_contact_phone, emergency_contact_relationship, is_active
) VALUES 
-- Patient 1
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 generate_patient_id((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Alice',
 'Williams',
 'alice.williams@email.com',
 '+1-555-0130',
 '1985-03-15',
 'Female',
 'O+',
 'Married',
 'Robert Williams',
 '+1-555-0131',
 'Spouse',
 true),

-- Patient 2
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 generate_patient_id((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Robert',
 'Johnson',
 'robert.johnson@email.com',
 '+1-555-0132',
 '1978-07-22',
 'Male',
 'A+',
 'Single',
 'Mary Johnson',
 '+1-555-0133',
 'Mother',
 true),

-- Patient 3
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 generate_patient_id((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Maria',
 'Garcia',
 'maria.garcia@email.com',
 '+1-555-0134',
 '1992-11-08',
 'Female',
 'B+',
 'Single',
 'Carlos Garcia',
 '+1-555-0135',
 'Father',
 true),

-- Patient 4
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 generate_patient_id((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'James',
 'Miller',
 'james.miller@email.com',
 '+1-555-0136',
 '1965-02-28',
 'Male',
 'AB+',
 'Married',
 'Linda Miller',
 '+1-555-0137',
 'Spouse',
 true),

-- Patient 5
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 generate_patient_id((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Jennifer',
 'Davis',
 'jennifer.davis@email.com',
 '+1-555-0138',
 '1988-09-12',
 'Female',
 'O-',
 'Married',
 'David Davis',
 '+1-555-0139',
 'Spouse',
 true)
ON CONFLICT (tenant_id, patient_id) DO NOTHING;

-- ========================================
-- SAMPLE APPOINTMENTS
-- ========================================
INSERT INTO appointments (
    tenant_id, clinic_id, patient_id, doctor_id, appointment_number,
    title, description, appointment_date, start_time, end_time, duration_minutes,
    appointment_type, status, priority, notes, created_by
) VALUES 
-- Appointment 1
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Alice' AND last_name = 'Williams'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_appointment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Annual Checkup',
 'Routine annual physical examination',
 CURRENT_DATE,
 '09:00:00',
 '09:30:00',
 30,
 'Physical Exam',
 'confirmed',
 'normal',
 'Patient reports feeling generally well',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Appointment 2
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Robert' AND last_name = 'Johnson'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_appointment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Follow-up Consultation',
 'Follow-up on previous blood pressure concerns',
 CURRENT_DATE,
 '10:00:00',
 '10:45:00',
 45,
 'Consultation',
 'confirmed',
 'normal',
 'Monitor blood pressure trends',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Appointment 3
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Maria' AND last_name = 'Garcia'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_appointment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Urgent Care Visit',
 'Patient reports severe headache and fever',
 CURRENT_DATE,
 '11:00:00',
 '11:30:00',
 30,
 'Urgent Care',
 'scheduled',
 'high',
 'Needs immediate attention',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Appointment 4
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'James' AND last_name = 'Miller'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_appointment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Diabetes Management',
 'Routine diabetes check and medication review',
 CURRENT_DATE + INTERVAL '1 day',
 '14:00:00',
 '14:30:00',
 30,
 'Chronic Care',
 'confirmed',
 'normal',
 'Review A1C levels',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Appointment 5
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Jennifer' AND last_name = 'Davis'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_appointment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Prenatal Checkup',
 'Regular prenatal examination',
 CURRENT_DATE + INTERVAL '1 day',
 '15:00:00',
 '16:00:00',
 60,
 'Prenatal',
 'confirmed',
 'normal',
 'First trimester checkup',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com'))
ON CONFLICT (tenant_id, appointment_number) DO NOTHING;

-- ========================================
-- SAMPLE DIAGNOSTIC TESTS
-- ========================================
INSERT INTO diagnostic_tests (
    tenant_id, clinic_id, patient_id, doctor_id, test_number,
    test_name, test_category, description, specimen_type, urgency,
    status, cost, created_by
) VALUES 
-- Test 1
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Alice' AND last_name = 'Williams'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_test_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Complete Blood Count (CBC)',
 'Hematology',
 'Routine blood count for annual checkup',
 'Blood',
 'routine',
 'pending',
 75.00,
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com')),

-- Test 2
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Robert' AND last_name = 'Johnson'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_test_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Lipid Panel',
 'Chemistry',
 'Cholesterol and triglyceride levels',
 'Blood',
 'routine',
 'pending',
 85.00,
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com')),

-- Test 3
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Maria' AND last_name = 'Garcia'),
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'),
 generate_test_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 'Comprehensive Metabolic Panel',
 'Chemistry',
 'Metabolic function tests',
 'Blood',
 'urgent',
 'in_progress',
 120.00,
 (SELECT id FROM users WHERE email = 'dr.smith@democlinic.com'))
ON CONFLICT (tenant_id, test_number) DO NOTHING;

-- ========================================
-- SAMPLE INVOICES
-- ========================================
INSERT INTO invoices (
    tenant_id, clinic_id, patient_id, invoice_number,
    invoice_date, due_date, status, subtotal, tax_amount, 
    total_amount, paid_amount, line_items, created_by
) VALUES 
-- Invoice 1
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Alice' AND last_name = 'Williams'),
 generate_invoice_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 CURRENT_DATE - INTERVAL '7 days',
 CURRENT_DATE,
 'paid',
 150.00,
 12.00,
 162.00,
 162.00,
 '[{"description": "Annual Checkup", "quantity": 1, "unit_price": 150.00, "total": 150.00}]',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Invoice 2
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Robert' AND last_name = 'Johnson'),
 generate_invoice_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 CURRENT_DATE - INTERVAL '3 days',
 CURRENT_DATE + INTERVAL '7 days',
 'sent',
 225.00,
 18.00,
 243.00,
 100.00,
 '[{"description": "Follow-up Consultation", "quantity": 1, "unit_price": 225.00, "total": 225.00}]',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Invoice 3
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM patients WHERE first_name = 'Maria' AND last_name = 'Garcia'),
 generate_invoice_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 CURRENT_DATE,
 CURRENT_DATE + INTERVAL '14 days',
 'draft',
 300.00,
 24.00,
 324.00,
 0.00,
 '[{"description": "Urgent Care Visit", "quantity": 1, "unit_price": 200.00, "total": 200.00}, {"description": "Comprehensive Metabolic Panel", "quantity": 1, "unit_price": 120.00, "total": 120.00}]',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com'))
ON CONFLICT (tenant_id, invoice_number) DO NOTHING;

-- ========================================
-- SAMPLE PAYMENTS
-- ========================================
INSERT INTO payments (
    tenant_id, clinic_id, invoice_id, patient_id, payment_number,
    payment_date, payment_method, payment_type, amount,
    status, processed_by
) VALUES 
-- Payment 1
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM invoices WHERE invoice_number LIKE 'INV000001'),
 (SELECT id FROM patients WHERE first_name = 'Alice' AND last_name = 'Williams'),
 generate_payment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 CURRENT_DATE - INTERVAL '5 days',
 'credit_card',
 'full_payment',
 162.00,
 'paid',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com')),

-- Payment 2
((SELECT id FROM tenants WHERE slug = 'demo-medical-center'),
 (SELECT id FROM clinics WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 (SELECT id FROM invoices WHERE invoice_number LIKE 'INV000002'),
 (SELECT id FROM patients WHERE first_name = 'Robert' AND last_name = 'Johnson'),
 generate_payment_number((SELECT id FROM tenants WHERE slug = 'demo-medical-center')),
 CURRENT_DATE - INTERVAL '1 day',
 'cash',
 'partial_payment',
 100.00,
 'paid',
 (SELECT id FROM users WHERE email = 'reception.brown@democlinic.com'))
ON CONFLICT (tenant_id, payment_number) DO NOTHING;

-- ========================================
-- UPDATE STATISTICS
-- ========================================
ANALYZE;

-- This seed data creates a comprehensive demo environment with:
-- 1 tenant (Demo Medical Center)
-- 1 clinic
-- 7 roles (Super Admin, Administrator, Doctor, Nurse, Receptionist, Lab Tech, Billing Staff)
-- 4 users (Admin, Doctor, Nurse, Receptionist)
-- 5 patients
-- 5 appointments
-- 3 diagnostic tests
-- 3 invoices
-- 2 payments

-- Default credentials:
-- Admin: admin@democlinic.com / admin123
-- Doctor: dr.smith@democlinic.com / doctor123
-- Nurse: nurse.johnson@democlinic.com / nurse123
-- Receptionist: reception.brown@democlinic.com / reception123
