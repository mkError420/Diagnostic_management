# PostgreSQL Database Setup Guide

## 🗄️ Overview

This guide provides step-by-step instructions for setting up PostgreSQL database for the Clinic Management SaaS platform, including installation, configuration, security, and optimization.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Initial Configuration](#initial-configuration)
4. [Security Setup](#security-setup)
5. [Database Creation](#database-creation)
6. [Migration Setup](#migration-setup)
7. [Performance Optimization](#performance-optimization)
8. [Backup Configuration](#backup-configuration)
9. [Connection Testing](#connection-testing)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### **System Requirements**
- **Operating System**: Ubuntu 20.04+, CentOS 8+, or RHEL 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB (50GB recommended)
- **User**: Root or sudo access

### **Software Requirements**
- **PostgreSQL**: Version 13 or higher
- **Development Tools**: Git, curl, nano/vim
- **Optional**: pgAdmin (for GUI management)

---

## 📦 Installation

### **Ubuntu/Debian**
```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install PostgreSQL and contrib
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### **CentOS/RHEL**
```bash
# Install PostgreSQL repository
sudo yum install -y postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup-initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### **macOS (Homebrew)**
```bash
# Install PostgreSQL
brew install postgresql

# Start PostgreSQL service
brew services start postgresql
brew services enable postgresql
```

### **Windows**
```bash
# Download PostgreSQL installer
# Visit https://www.postgresql.org/download/windows/

# Run installer as administrator
# Follow installation wizard
```

---

## ⚙️ Initial Configuration

### **1. PostgreSQL Configuration File**
```bash
# Locate postgresql.conf
sudo -u postgres psql -c 'SHOW config_file;'

# Edit configuration file
sudo nano /etc/postgresql/13/main/postgresql.conf
```

### **2. Key Settings**
```conf
# Connection settings
listen_addresses = '*'
port = 5432
max_connections = 200
superuser_reserved_connections = 3

# Memory settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# WAL settings
wal_buffers = 64MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms
max_wal_size = 1GB

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 100

# Logging
logging_collector = 'jsonlog'
log_destination = 'stderr'
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation = 'daily'
log_truncate_on_rotation = false
log_min_error_statement = 'error'
log_min_warning_statement = 'warning'
log_min_message_statement = 'info'
```

### **3. pg_hba.conf (Host-Based Authentication)**
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf
```

```conf
# TYPE  DATABASE        USER        ADDRESS        METHOD

# Local connections
host    all             all             127.0.0.1/32           md5
host    all             all             ::1/128               md5

# Application connections
host    clinic_app       clinic_user        10.0.0.0/16           md5
host    clinic_app       clinic_user        192.168.1.0/24       md5

# Replication connections
host    replication     replicator        10.0.0.0/16           md5
```

### **4. Restart PostgreSQL**
```bash
sudo systemctl restart postgresql
```

---

## 🔐 Security Setup

### **1. Database Security**
```sql
-- Create database user (if not exists)
CREATE USER clinic_user WITH PASSWORD 'secure_password_123!';
CREATE USER clinic_readonly WITH PASSWORD 'readonly_password_123!';

-- Grant permissions to application user
GRANT ALL PRIVILEGES ON DATABASE clinic_management TO clinic_user;
GRANT CONNECT ON DATABASE clinic_management TO clinic_readonly;

-- Grant read-only permissions
GRANT USAGE ON SCHEMA public TO clinic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO clinic_readonly;
```

### **2. Enable Extensions**
```sql
-- Connect to database
\c clinic_management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### **3. Set Row-Level Security**
```sql
-- Enable RLS (Row-Level Security)
ALTER DATABASE clinic_management SET row_security = on;

-- Example RLS policy for patients table
CREATE POLICY tenant_isolation_patients ON patients
    FOR ALL TO clinic_user
    USING (tenant_id = current_tenant_id() AND deleted_at IS NULL);
```

### **4. SSL Configuration**
```bash
# Generate SSL certificates
sudo mkdir -p /var/lib/postgresql/ssl
cd /var/lib/postgresql/ssl

# Create self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey \
  -keyout /var/lib/postgresql/ssl/server.key \
  -out /var/lib/postgresql/ssl/server.crt \
  -subj /C=US -C=US \
  -in /etc/ssl/openssl.cnf \
  -key /var/lib/postgresql/ssl/server.key \
  -out /var/lib/postgresql/ssl/server.crt

# Set permissions
sudo chmod 600 /var/lib/postgresql/server.key
sudo chmod 644 /var/lib/postgresql/server.crt
sudo chown postgres:postgres /var/lib/postgresql/ssl/*
```

### **5. Update PostgreSQL Configuration for SSL**
```conf
# SSL settings
ssl = on
ssl_cert_file = '/var/lib/postgresql/server.crt'
ssl_key_file = '/var/lib/postgresql/server.key'
ssl_ca_file = '/var/lib/postgresql/server.crt'
```

---

## 🗄️ Database Creation

### **1. Create Database**
```sql
-- Connect to PostgreSQL
\c postgres

-- Create main database
CREATE DATABASE clinic_management;

-- Create additional databases (if needed)
CREATE DATABASE clinic_management_test;
CREATE DATABASE clinic_management_staging;
```

### **2. Create Application User**
```sql
-- Connect to database
\c clinic_management

-- Create application user
CREATE USER clinic_app WITH PASSWORD 'secure_app_password_123!';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE clinic_management TO clinic_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO clinic_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clinic_app;
```

### **3. Create Read-Only User**
```sql
-- Create read-only user for reporting
CREATE USER clinic_readonly WITH PASSWORD 'readonly_password_123!';

-- Grant read permissions
GRANT CONNECT ON DATABASE clinic_management TO clinic_readonly;
GRANT USAGE ON SCHEMA public TO clinic_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO clinic_readonly;
```

### **4. Create Monitoring User**
```sql
-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'monitor_password_123!';

-- Grant monitoring permissions
GRANT pg_read_all_stats TO monitoring;
GRANT SELECT ON pg_stat_statements TO monitoring;
GRANT SELECT ON pg_stat_user_activities TO monitoring;
```

---

## 🔄 Migration Setup

### **1. Run Database Migrations**
```bash
# Navigate to project directory
cd /path/to/clinic-management-backend

# Run all migration scripts in order
psql -d clinic_management < migrations/001_initial_schema.sql
psql -d clinic_management < migrations/002_seed_data.sql
psql -d clinic_management < migrations/003_audit_trails.sql
psql -d clinic_management < migrations/004_subscriptions_billing.sql
```

### **2. Verify Migration Success**
```sql
-- Check created tables
\dt clinic_management
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check row-level security policies
\dp
SELECT schemaname, tablename, permissive
FROM pg_policies 
WHERE schemaname = 'public';
```

### **3. Create Functions**
```sql
-- Verify tenant function exists
\df current_tenant_id();

-- Test tenant function
SELECT current_tenant_id();
```

---

## ⚡ Performance Optimization

### **1. Connection Pooling**
```sql
-- Update postgresql.conf for connection pooling
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### **2. Query Optimization**
```sql
-- Enable statistics collection
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;

-- Update statistics
SELECT pg_stat_statements_reset();
```

### **3. Indexing Strategy**
```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX idx_appointments_date ON patients(appointment_date, tenant_id);
CREATE INDEX idx_users_email ON users(email, tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status, tenant_id);
CREATE INDEX idx_payments_status ON payments(payment_status, tenant_id);
```

### **4. Vacuum and Analyze**
```bash
# Create maintenance script
cat > maintenance.sh << 'EOF'
#!/bin/bash
echo "Running database maintenance..."

# Vacuum analyze
psql -d clinic_management -c "VACUUM ANALYZE"

# Reindex
psql -d clinic_management -c "REINDEX DATABASE clinic_management"

# Update statistics
psql -d clinic_management -c "ANALYZE"

echo "Maintenance completed!"
EOF

chmod +x maintenance.sh

# Add to crontab
crontab -e "0 2 * * * * /path/to/maintenance.sh"
```

---

## 💾 Backup Configuration

### **1. Backup Script**
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="clinic_management"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U postgres -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
EOF

chmod +x backup-db.sh
```

### **2. Restore Script**
```bash
# Create restore script
cat > restore-db.sh << 'EOF
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="clinic_management"

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

BACKUP_FILE=$1

# Decompress backup if compressed
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE
fi

# Restore database
psql -h localhost -U postgres -d $DB_NAME < $BACKUP_FILE

echo "Restore completed from: $BACKUP_FILE"
EOF

chmod +x restore-db.sh
```

### **3. Automated Backups**
```bash
# Add to crontab
crontab -e "0 2 * * * /path/to/backup-db.sh"
crontab -e "0 3 * * 1 /path/to/backup-db.sh"
crontab -e "0 4 * * 0 /path/to/backup-db.sh"
```

### **4. Offsite Backups**
```bash
# AWS S3 backup
cat > backup-s3.sh << 'EOF
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="your-backup-bucket"

# Upload to S3
aws s3 cp /var/backups/postgresql/backup_$DATE.sql.gz s3://$S3_BUCKET/clinic-db/

echo "Backup uploaded to S3: backup_$DATE.sql.gz"
EOF

chmod +x backup-s3.sh
```

---

## 🔍 Connection Testing

### **1. Test Local Connection**
```bash
# Test connection as postgres
psql -h localhost -U postgres -d clinic_management

# Test connection as application user
psql -h localhost -U clinic_app -d clinic_management

# Test connection as read-only user
psql -h localhost -U clinic_readonly -d clinic_management
```

### **2. Test Remote Connection**
```bash
# Test remote connection
psql -h your-server.com -U clinic_app -d clinic_management

# Test with SSL
psql -h your-server.com -U clinic_app -d clinic_management \
  sslmode=require
```

### **3. Test Application Connection**
```bash
# Test from application
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
    await client.end();
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
"
```

### **4. Test Row-Level Security**
```sql
-- Test tenant function
SELECT current_tenant_id();

-- Test RLS policy
SELECT * FROM patients WHERE tenant_id = 'test-tenant-id';

-- Test with different tenant (should return no rows)
SELECT * FROM patients WHERE tenant_id = 'wrong-tenant-id';
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Connection Refused**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql

# Check port usage
sudo netstat -tlnp | grep :5432

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### **2. Permission Denied**
```bash
# Check user permissions
sudo -u postgres -c "\du"
ls -la /var/lib/postgresql/

# Fix ownership
sudo chown -R postgres:postgres /var/lib/postgresql/
sudo chmod 700 /var/lib/postgresql/
```

#### **3. Authentication Failed**
```bash
# Check pg_hba.conf
sudo -u postgres -c "SELECT * FROM pg_hba.conf"

# Test authentication
psql -h localhost -U postgres
```

#### **4. Migration Errors**
```bash
# Check migration files
ls -la migrations/

# Run migrations individually
psql -d clinic_management < migrations/001_initial_schema.sql
psql -d clinic_management < migrations/002_seed_data.sql
```

#### **5. Performance Issues**
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY total_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('clinic_management'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_total_relation_size(pg_total_relation_size(tableoid))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tableoid) DESC
LIMIT 10;
```

---

## 📚 Production Best Practices

### **1. Security**
- Use strong passwords (minimum 12 characters)
- Enable SSL for all connections
- Use row-level security for data isolation
- Regular security updates
- Limit database access to application users
- Monitor for unusual activity

### **2. Performance**
- Regularly run VACUUM and ANALYZE
- Monitor connection pool usage
- Optimize slow queries
- Use appropriate indexing strategy
- Monitor disk space usage
- Set appropriate memory limits

### **3. Reliability**
- Implement automated backups
- Test restore procedures
- Set up monitoring and alerting
- Implement disaster recovery plan
- Document all procedures
- Regular security audits

### **4. Maintenance**
- Schedule regular maintenance windows
- Keep PostgreSQL updated
- Monitor disk space usage
- Review and optimize queries
- Archive old data if needed

---

## 📚 Quick Reference

### **Essential Commands**
```bash
# Start PostgreSQL
sudo systemctl start postgresql

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -h localhost -U postgres -d clinic_management

# Run migrations
psql -d clinic_management < migrations/001_initial_schema.sql

# Create backup
./backup-db.sh

# Restore backup
./restore-db.sh backup_20240115_120000.sql.gz
```

### **Configuration Files**
```bash
# PostgreSQL configuration
/etc/postgresql/13/main/postgresql.conf

# Host-based authentication
/etc/postgresql/13/main/pg_hba.conf

# Environment variables
~/.env.production
```

### **Useful Queries**
```sql
-- Check database version
SELECT version();

-- List all databases
\l

-- List all tables
\dt

-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Check database size
SELECT pg_size_pretty(pg_database_size('clinic_management'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_total_relation_size(pg_total_relation_size(tableid))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tableid) DESC;
```

This comprehensive setup ensures your PostgreSQL database is properly configured for production use with the Clinic Management SaaS platform.
