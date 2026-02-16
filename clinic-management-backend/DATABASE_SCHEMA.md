# Multi-tenant Clinic Management SaaS Database Schema

## Overview

This PostgreSQL database schema is designed for a scalable, multi-tenant clinic management SaaS application. It provides complete tenant isolation, comprehensive audit trails, and supports all major clinic operations.

## Architecture

### Multi-tenant Design
- **Row-Level Security (RLS)**: Ensures each tenant can only access their own data
- **Tenant Context**: Application sets `app.current_tenant_id` for automatic isolation
- **Soft Deletes**: All major tables support soft deletion with `deleted_at` timestamps
- **Audit Trails**: Comprehensive logging of all data changes

### Key Features
- ✅ Proper foreign key relationships
- ✅ Comprehensive indexing for performance
- ✅ Soft delete support
- ✅ Created/Updated timestamps
- ✅ Multi-tenant isolation
- ✅ Audit logging
- ✅ Activity tracking
- ✅ Document management
- ✅ Medical records
- ✅ Prescription management

## Database Structure

### Core Tables

#### `tenants`
Root-level table for SaaS tenant management.
```sql
- id (UUID, Primary Key)
- name, slug, email, phone
- subscription_plan, subscription_status
- max_users, max_patients
- settings (JSONB)
- is_active, created_at, updated_at, deleted_at
```

#### `clinics`
Tenant-specific clinic information.
```sql
- tenant_id (Foreign Key → tenants.id)
- name, license_number, tax_id
- contact information
- timezone, currency, language
- settings (JSONB)
```

#### `users`
User management with role-based access.
```sql
- tenant_id, clinic_id, role_id
- email, password_hash
- personal information
- specialization, license_number
- medical-specific fields for doctors
```

#### `roles`
Flexible role-based permissions.
```sql
- tenant_id, name, description
- permissions (JSONB)
- is_system_role, is_active
```

#### `patients`
Comprehensive patient records.
```sql
- tenant_id, clinic_id, patient_id
- personal and contact information
- medical history (JSONB)
- insurance information (JSONB)
- primary care physician
```

### Operational Tables

#### `appointments`
Appointment scheduling and management.
```sql
- patient_id, doctor_id
- scheduling information
- status tracking
- clinical notes and diagnosis
- follow-up management
```

#### `diagnostic_tests`
Laboratory and diagnostic test management.
```sql
- patient_id, doctor_id
- test details and specifications
- status tracking
- cost and insurance information
```

#### `test_reports`
Test results and reporting.
```sql
- diagnostic_test_id
- findings, interpretation, recommendations
- normal ranges and abnormal findings
- verification and quality control
```

#### `invoices`
Billing and invoicing.
```sql
- patient_id
- financial details
- line items (JSONB)
- status and payment tracking
```

#### `payments`
Payment processing and tracking.
```sql
- invoice_id, patient_id
- payment method and gateway information
- amount, status, refunds
```

### Supporting Tables

#### `audit_logs`
Complete audit trail for all data changes.
```sql
- tenant_id, user_id, action
- table_name, record_id
- old_values, new_values (JSONB)
- IP address, user agent
```

#### `activity_logs`
User activity tracking.
```sql
- tenant_id, user_id
- activity_type, description
- metadata (JSONB)
```

#### `notifications`
System notifications.
```sql
- tenant_id, user_id
- title, message, type, priority
- read status, action URL
```

#### `documents`
Document and file management.
```sql
- tenant_id, patient_id, user_id
- file information and metadata
- versioning and access control
```

#### `medical_records`
Detailed medical documentation.
```sql
- patient_id, doctor_id, appointment_id
- comprehensive medical data (JSONB)
- confidentiality controls
```

#### `prescriptions`
Prescription management.
```sql
- patient_id, doctor_id
- medication details
- dosage, frequency, duration
- instructions and tracking
```

## Security Features

### Row-Level Security (RLS)
All tenant-specific tables have RLS policies:
```sql
CREATE POLICY tenant_isolation_table_name ON table_name
    FOR ALL TO public
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);
```

### Tenant Context Function
```sql
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Audit Triggers
Automatic audit logging for all major tables:
```sql
CREATE TRIGGER audit_table_name AFTER INSERT OR UPDATE OR DELETE ON table_name
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

## Performance Optimizations

### Indexing Strategy
- **Composite Indexes**: For common query patterns
- **Partial Indexes**: For filtered queries (e.g., active records only)
- **Foreign Key Indexes**: On all foreign key columns
- **Tenant Indexes**: First column in all composite indexes

### Example Indexes
```sql
-- Composite index for patient lookups
CREATE INDEX idx_patients_tenant_name ON patients(tenant_id, first_name, last_name);

-- Partial index for active records
CREATE INDEX idx_patients_active ON patients(tenant_id) WHERE deleted_at IS NULL;

-- Foreign key index
CREATE INDEX idx_appointments_patient_id ON appointments(tenant_id, patient_id);
```

## Views and Reporting

### Summary Views
- `patient_summary`: Patient statistics and activity
- `doctor_summary`: Doctor performance metrics
- `revenue_summary`: Financial analytics

### Stored Procedures
- `get_patient_dashboard()`: Complete patient dashboard data
- `create_notification()`: System notification creation
- `perform_maintenance()`: Automated maintenance tasks

## Migration Scripts

### 001_initial_schema.sql
Creates the complete database schema with:
- All tables and relationships
- Indexes and constraints
- Row-level security policies
- Auto-generation functions
- Triggers for timestamps

### 002_seed_data.sql
Sample data for development:
- Demo tenant and clinic
- Default roles and users
- Sample patients and appointments
- Test invoices and payments

### 003_audit_trails.sql
Advanced features:
- Audit logging system
- Activity tracking
- Notifications
- Document management
- Medical records
- Prescriptions
- Reporting views

## Usage Examples

### Setting Tenant Context
```sql
SET app.current_tenant_id = 'your-tenant-uuid';
```

### Querying with Tenant Isolation
```sql
-- This automatically applies tenant isolation
SELECT * FROM patients WHERE first_name = 'John';

-- Manual tenant check (for debugging)
SELECT * FROM patients WHERE tenant_id = current_tenant_id();
```

### Creating Records with Auto-Generation
```sql
-- Patient ID is auto-generated
INSERT INTO patients (tenant_id, first_name, last_name, date_of_birth, gender)
VALUES (current_tenant_id(), 'John', 'Doe', '1990-01-01', 'Male');
```

### Audit Trail Query
```sql
-- View recent changes to patient records
SELECT * FROM audit_logs 
WHERE table_name = 'patients' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Best Practices

### Application Integration
1. **Always set tenant context** before any database operation
2. **Use parameterized queries** to prevent SQL injection
3. **Handle soft deletes** by checking `deleted_at IS NULL`
4. **Use transactions** for multi-table operations
5. **Implement retry logic** for connection issues

### Performance
1. **Use appropriate indexes** for query patterns
2. **Monitor slow queries** with `pg_stat_statements`
3. **Regular maintenance** with `ANALYZE` and `VACUUM`
4. **Connection pooling** with PgBouncer in production
5. **Read replicas** for reporting queries

### Security
1. **Never bypass RLS** with superuser privileges in application code
2. **Validate tenant ownership** in application logic
3. **Use prepared statements** for all queries
4. **Implement rate limiting** at application level
5. **Regular security audits** of database access

## Monitoring and Maintenance

### Health Check
```sql
SELECT * FROM database_health_check();
```

### Performance Monitoring
```sql
-- Slow queries
SELECT * FROM monitoring_query_stats;

-- Table sizes
SELECT * FROM pg_stat_user_tables ORDER BY n_live_tup DESC;
```

### Automated Maintenance
```sql
SELECT perform_maintenance();
```

## Backup and Recovery

### Backup Script
```bash
#!/bin/bash
pg_dump -h localhost -U postgres -d clinic_management_saaS \
    --format=custom --compress=9 \
    --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

### Recovery
```bash
pg_restore -h localhost -U postgres -d clinic_management_saaS \
    --clean --if-exists backup_file.dump
```

## Scaling Considerations

### Horizontal Scaling
- **Read Replicas**: For reporting and analytics
- **Connection Pooling**: PgBouncer for connection management
- **Sharding**: Consider for very large deployments

### Vertical Scaling
- **Memory**: Increase `shared_buffers` and `work_mem`
- **Storage**: Use SSDs for better I/O performance
- **CPU**: More cores for parallel query execution

## Troubleshooting

### Common Issues
1. **Tenant context not set**: Ensure `SET app.current_tenant_id` is called
2. **RLS policies blocking queries**: Check user permissions
3. **Performance issues**: Review query plans and indexes
4. **Connection limits**: Configure appropriate pool sizes

### Debug Queries
```sql
-- Check current tenant context
SELECT current_setting('app.current_tenant_id', true);

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'patients';

-- Check table statistics
SELECT * FROM pg_stats WHERE tablename = 'patients';
```

This schema provides a robust, secure, and scalable foundation for a multi-tenant clinic management SaaS application with comprehensive features for healthcare operations.
