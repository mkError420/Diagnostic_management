-- Database Setup Script for Multi-tenant Clinic Management SaaS
-- Run this script to set up the database and initial configuration

-- ========================================
-- DATABASE CREATION (if not exists)
-- ========================================
-- Uncomment and modify for your environment:
-- CREATE DATABASE clinic_management_saaS;
-- CREATE USER clinic_app WITH PASSWORD 'your_secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE clinic_management_saaS TO clinic_app;

-- ========================================
-- DATABASE CONFIGURATION
-- ========================================

-- Set timezone
SET timezone = 'UTC';

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ========================================
-- SECURITY CONFIGURATION
-- ========================================

-- Create application user role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH NOLOGIN;
    END IF;
END
$$;

-- Grant necessary permissions to app_user
GRANT CONNECT ON DATABASE clinic_management_saaS TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ========================================
-- PERFORMANCE CONFIGURATION
-- ========================================

-- Create indexes for better performance (these will be created by migrations)
-- The migration scripts already include comprehensive indexing

-- Configure shared buffers (adjust based on available memory)
-- This should be set in postgresql.conf:
-- shared_buffers = 256MB (for 1GB RAM)
-- shared_buffers = 512MB (for 2GB RAM)
-- shared_buffers = 1GB (for 4GB RAM)

-- Configure work_mem (for complex queries)
-- work_mem = 4MB

-- Configure maintenance_work_mem (for index creation, VACUUM, etc.)
-- maintenance_work_mem = 64MB

-- ========================================
-- BACKUP CONFIGURATION
-- ========================================

-- Create backup user
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup_user') THEN
        CREATE ROLE backup_user WITH LOGIN PASSWORD 'backup_password_123';
    END IF;
END
$$;

-- Grant backup permissions
GRANT CONNECT ON DATABASE clinic_management_saaS TO backup_user;
GRANT USAGE ON SCHEMA public TO backup_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_user;

-- ========================================
-- MONITORING CONFIGURATION
-- ========================================

-- Enable pg_stat_statements for query monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Reset statistics for clean monitoring
SELECT pg_stat_statements_reset();

-- Create monitoring view
CREATE OR REPLACE VIEW monitoring_query_stats AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 20;

-- ========================================
-- CONNECTION POOLING RECOMMENDATIONS
-- ========================================

-- For production, consider using PgBouncer for connection pooling
-- Install PgBouncer and configure it to connect to your database

-- Sample PgBouncer configuration (pgbouncer.ini):
-- [databases]
-- clinic_management_saaS = host=localhost port=5432 dbname=clinic_management_saaS user=app_user
-- 
-- [pgbouncer]
-- listen_port = 6432
-- listen_addr = 127.0.0.1
-- auth_type = md5
-- auth_file = /etc/pgbouncer/userlist.txt
-- logfile = /var/log/pgbouncer/pgbouncer.log
-- pidfile = /var/run/pgbouncer/pgbouncer.pid
-- admin_users = postgres
-- stats_users = stats, postgres
-- 
-- [pool_mode]
-- pool_mode = transaction
-- 
-- [connection_limits]
-- default_pool_size = 20
-- min_pool_size = 5
-- reserve_pool_size = 5
-- reserve_pool_timeout = 5
-- max_db_connections = 100
-- max_user_connections = 50

-- ========================================
-- ENVIRONMENT-SPECIFIC SETTINGS
-- ========================================

-- Development environment settings
-- These should be set in postgresql.conf for development:

-- max_connections = 100
-- shared_buffers = 128MB
-- effective_cache_size = 4GB
-- maintenance_work_mem = 64MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1
-- effective_io_concurrency = 200

-- Production environment settings
-- These should be set in postgresql.conf for production:

-- max_connections = 200
-- shared_buffers = 2GB
-- effective_cache_size = 6GB
-- maintenance_work_mem = 512MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 64MB
-- default_statistics_target = 100
-- random_page_cost = 1.1
-- effective_io_concurrency = 200
-- work_mem = 8MB
-- min_wal_size = 1GB
-- max_wal_size = 4GB

-- ========================================
-- SECURITY BEST PRACTICES
-- ========================================

-- Create separate roles for different purposes
DO $$
BEGIN
    -- Read-only role for reporting
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user WITH NOLOGIN;
    END IF;
    
    -- Write role for application
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'write_user') THEN
        CREATE ROLE write_user WITH NOLOGIN;
    END IF;
    
    -- Admin role for database management
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_user') THEN
        CREATE ROLE admin_user WITH LOGIN PASSWORD 'admin_password_123';
    END IF;
END
$$;

-- Grant permissions to roles
GRANT CONNECT ON DATABASE clinic_management_saaS TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

GRANT CONNECT ON DATABASE clinic_management_saaS TO write_user;
GRANT USAGE ON SCHEMA public TO write_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO write_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO write_user;

-- Grant admin permissions
GRANT admin_user TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin_user;

-- ========================================
-- LOGGING CONFIGURATION
-- ========================================

-- These settings should be in postgresql.conf:

-- Logging configuration
-- log_destination = 'stderr'
-- logging_collector = on
-- log_directory = 'pg_log'
-- log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
-- log_statement = 'all'
-- log_min_duration_statement = 1000
-- log_checkpoints = on
-- log_connections = on
-- log_disconnections = on
-- log_lock_waits = on
-- log_temp_files = 0

-- ========================================
-- AUTOMATED MAINTENANCE
-- ========================================

-- Create maintenance function
CREATE OR REPLACE FUNCTION perform_maintenance()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE;
    
    -- Clean up old audit logs (keep 1 year)
    DELETE FROM audit_logs WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
    
    -- Clean up old activity logs (keep 6 months)
    DELETE FROM activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '6 months';
    
    -- Clean up old notifications (keep 3 months)
    DELETE FROM notifications WHERE created_at < CURRENT_DATE - INTERVAL '3 months' AND is_read = true;
    
    -- Update table statistics again
    ANALYZE;
    
    RAISE NOTICE 'Maintenance completed successfully';
END;
$$ LANGUAGE plpgsql;

-- Create a function to check database health
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    connection_count INTEGER;
    database_size BIGINT;
    table_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Get connection count
    SELECT count(*) INTO connection_count
    FROM pg_stat_activity;
    
    -- Get database size
    SELECT pg_database_size(current_database()) INTO database_size;
    
    -- Get table count
    SELECT count(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    
    -- Get index count
    SELECT count(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public';
    
    result := jsonb_build_object(
        'timestamp', CURRENT_TIMESTAMP,
        'connections', connection_count,
        'database_size_bytes', database_size,
        'database_size_mb', ROUND(database_size / 1024 / 1024, 2),
        'table_count', table_count,
        'index_count', index_count,
        'status', 'healthy'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- SAMPLE QUERIES FOR TESTING
-- ========================================

-- Test tenant isolation
-- SET app.current_tenant_id = 'your-tenant-id';
-- SELECT * FROM patients LIMIT 1;

-- Test audit logging
-- INSERT INTO patients (tenant_id, patient_id, first_name, last_name, date_of_birth, gender)
-- VALUES ('your-tenant-id', generate_patient_id('your-tenant-id'), 'Test', 'Patient', '1990-01-01', 'Male');

-- Check audit logs
-- SELECT * FROM audit_logs WHERE table_name = 'patients' ORDER BY created_at DESC LIMIT 1;

-- Test row-level security
-- This should only return data for the current tenant
-- SELECT COUNT(*) FROM patients;

-- ========================================
-- PERFORMANCE MONITORING QUERIES
-- ========================================

-- Monitor slow queries
-- SELECT query, calls, total_time, mean_time, rows
-- FROM pg_stat_statements
-- ORDER BY mean_time DESC
-- LIMIT 10;

-- Monitor table sizes
-- SELECT 
--     schemaname,
--     tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
--     pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor index usage
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan,
--     idx_tup_read,
--     idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- ========================================
-- BACKUP SCRIPTS
-- ========================================

-- Create backup script (save as backup_database.sh)
-- #!/bin/bash
-- BACKUP_DIR="/var/backups/postgresql"
-- DATE=$(date +%Y%m%d_%H%M%S)
-- DB_NAME="clinic_management_saaS"
-- 
-- # Create backup directory if it doesn't exist
-- mkdir -p $BACKUP_DIR
-- 
-- # Create backup
-- pg_dump -h localhost -U postgres -d $DB_NAME -f $BACKUP_DIR/backup_$DATE.sql
-- 
-- # Compress backup
-- gzip $BACKUP_DIR/backup_$DATE.sql
-- 
-- # Remove backups older than 7 days
-- find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
-- 
-- echo "Backup completed: backup_$DATE.sql.gz"

-- ========================================
-- RESTORE SCRIPT
-- ========================================

-- Create restore script (save as restore_database.sh)
-- #!/bin/bash
-- BACKUP_FILE=$1
-- DB_NAME="clinic_management_saaS"
-- 
-- if [ -z "$BACKUP_FILE" ]; then
--     echo "Usage: $0 <backup_file>"
--     exit 1
-- fi
-- 
-- # Decompress backup if needed
-- if [[ $BACKUP_FILE == *.gz ]]; then
--     gunzip -c $BACKUP_FILE | psql -h localhost -U postgres -d $DB_NAME
-- else
--     psql -h localhost -U postgres -d $DB_NAME < $BACKUP_FILE
-- fi
-- 
-- echo "Database restored from: $BACKUP_FILE"

-- ========================================
-- NEXT STEPS
-- ========================================

-- 1. Run the migration scripts in order:
--    psql -d clinic_management_saaS -f migrations/001_initial_schema.sql
--    psql -d clinic_management_saaS -f migrations/002_seed_data.sql
--    psql -d clinic_management_saaS -f migrations/003_audit_trails.sql

-- 2. Configure your application to set the tenant_id context:
--    SET app.current_tenant_id = 'tenant-uuid';

-- 3. Set up proper connection pooling with PgBouncer for production

-- 4. Configure automated backups using the backup script

-- 5. Set up monitoring using the health check function

-- 6. Configure logging and alerting for database issues

-- This setup provides a robust, scalable foundation for a multi-tenant
-- clinic management SaaS application with proper security, performance,
-- and maintainability.
