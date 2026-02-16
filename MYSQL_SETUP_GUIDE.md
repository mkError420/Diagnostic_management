# MySQL Database Setup Guide

## 🗄️ Overview

This guide provides step-by-step instructions for setting up MySQL database for the Clinic Management SaaS platform, including installation, configuration, security, and optimization.

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
- **Operating System**: Windows 10+, Ubuntu 20.04+, CentOS 8+, or RHEL 8+
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB (50GB recommended)
- **User**: Administrative access

### **Software Requirements**
- **MySQL**: Version 8.0 or higher
- **Development Tools**: Git, curl, text editor
- **Optional**: MySQL Workbench (for GUI management)

---

## 📦 Installation

### **Windows**
1. Download MySQL Installer from https://dev.mysql.com/downloads/installer/
2. Run the installer and select "Server only" or "Developer Default"
3. Follow the installation wizard
4. Set root password during configuration
5. Start MySQL service

### **Ubuntu/Debian**
```bash
# Update package list
sudo apt update

# Install MySQL server
sudo apt install mysql-server

# Start and enable MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Run security script
sudo mysql_secure_installation
```

### **CentOS/RHEL**
```bash
# Install MySQL repository
sudo yum install mysql80-community-release-el8-1.noarch.rpm

# Install MySQL server
sudo yum install mysql-community-server

# Start and enable MySQL service
sudo systemctl start mysqld
sudo systemctl enable mysqld

# Get temporary root password
sudo grep 'temporary password' /var/log/mysqld.log

# Run security script
sudo mysql_secure_installation
```

---

## ⚙️ Initial Configuration

### **MySQL Configuration File**
Edit `my.cnf` (Linux) or `my.ini` (Windows):

```ini
[mysqld]
# Basic settings
port = 3306
bind-address = 127.0.0.1
datadir = /var/lib/mysql
socket = /var/lib/mysql/mysql.sock

# Character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Performance settings
max_connections = 200
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT

# Query cache (MySQL 5.7 and below)
query_cache_type = 1
query_cache_size = 32M

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Error log
log_error = /var/log/mysql/error.log

# Binary log (for replication/backup)
log_bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7

# Security
local_infile = 0
skip_show_database = 1
```

### **Restart MySQL Service**
```bash
# Linux
sudo systemctl restart mysql

# Windows
net stop mysql
net start mysql
```

---

## 🔒 Security Setup

### **Create Database Users**
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create application database
CREATE DATABASE clinic_management_saas 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER 'clinic_app'@'localhost' IDENTIFIED BY 'your_secure_password';
CREATE USER 'clinic_app'@'%' IDENTIFIED BY 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON clinic_management_saas.* TO 'clinic_app'@'localhost';
GRANT ALL PRIVILEGES ON clinic_management_saas.* TO 'clinic_app'@'%';

-- Create backup user
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'backup_password_123';
GRANT SELECT, LOCK TABLES, SHOW VIEW ON clinic_management_saas.* TO 'backup_user'@'localhost';

-- Create readonly user
CREATE USER 'readonly_user'@'localhost' IDENTIFIED BY 'readonly_password_123';
GRANT SELECT ON clinic_management_saas.* TO 'readonly_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;
```

### **Configure Firewall**
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 3306/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=mysql
sudo firewall-cmd --reload

# Windows Firewall
# Allow MySQL port 3306 through Windows Firewall
```

---

## 🗄️ Database Creation

### **Run Setup Script**
```bash
# Navigate to your project directory
cd e:\rabbani\SAS Software\clinic-management-backend

# Execute the MySQL setup script
mysql -u root -p < mysql-database-setup.sql
```

### **Verify Database Creation**
```sql
-- Connect to MySQL
mysql -u clinic_app -p

-- Switch to your database
USE clinic_management_saas;

-- List tables
SHOW TABLES;

-- Check database health
CALL database_health_check();
```

---

## 🔄 Migration Setup

### **Run Migration Scripts**
```bash
# Run migrations in order
mysql -u clinic_app -p clinic_management_saas < migrations/001_initial_schema_mysql.sql
mysql -u clinic_app -p clinic_management_saas < migrations/002_seed_data_mysql.sql
mysql -u clinic_app -p clinic_management_saas < migrations/003_audit_trails_mysql.sql
mysql -u clinic_app -p clinic_management_saas < migrations/004_subscriptions_billing_mysql.sql
```

### **Verify Migration**
```sql
-- Check if all tables were created
SHOW TABLES;

-- Check table structures
DESCRIBE tenants;
DESCRIBE users;
DESCRIBE patients;
DESCRIBE appointments;
```

---

## ⚡ Performance Optimization

### **MySQL Performance Tuning**
Add these settings to your MySQL configuration:

```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1

# Connection settings
max_connections = 300
max_connect_errors = 1000
connect_timeout = 10
wait_timeout = 600
max_allowed_packet = 64M

# Query optimization
tmp_table_size = 64M
max_heap_table_size = 64M
sort_buffer_size = 2M
read_buffer_size = 2M
read_rnd_buffer_size = 8M

# Performance schema
performance_schema = ON
performance_schema_max_table_instances = 12500
performance_schema_max_table_handles = 4000
```

### **Create Indexes**
```sql
-- Monitor index usage
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SUB_PART,
    PACKED,
    NULLABLE,
    INDEX_TYPE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'clinic_management_saas'
ORDER BY TABLE_NAME, SEQ_IN_INDEX;
```

---

## 💾 Backup Configuration

### **Automated Backup Script**
Create `backup-mysql.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="clinic_management_saas"
DB_USER="backup_user"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u $DB_USER -p clinic_management_saas > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
```

### **Schedule Backups with Cron**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mysql.sh
```

### **Restore Database**
```bash
# Decompress backup if needed
gunzip backup_20240115_120000.sql.gz

# Restore database
mysql -u clinic_app -p clinic_management_saas < backup_20240115_120000.sql
```

---

## 🔗 Connection Testing

### **Test Application Connection**
Update your `.env` file:

```bash
# MySQL connection string
DATABASE_URL=mysql://clinic_app:your_secure_password@localhost:3306/clinic_management_saas

# Alternative format
DB_HOST=localhost
DB_PORT=3306
DB_NAME=clinic_management_saas
DB_USER=clinic_app
DB_PASSWORD=your_secure_password
DB_DIALECT=mysql
```

### **Test Connection with Node.js**
```javascript
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'clinic_app',
      password: 'your_secure_password',
      database: 'clinic_management_saas'
    });
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('Database connection successful:', rows);
    
    await connection.end();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

testConnection();
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Connection Refused**
```bash
# Check MySQL service status
sudo systemctl status mysql

# Check if MySQL is running on port 3306
sudo netstat -tlnp | grep 3306

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

#### **2. Access Denied**
```sql
-- Check user permissions
SELECT user, host FROM mysql.user;
SHOW GRANTS FOR 'clinic_app'@'localhost';

-- Reset password if needed
ALTER USER 'clinic_app'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### **3. Performance Issues**
```sql
-- Show running processes
SHOW PROCESSLIST;

-- Show slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;

-- Show database size
SELECT 
    table_schema 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema;
```

#### **4. Migration Errors**
```bash
# Check MySQL version
mysql --version

# Check character set
mysql -u root -p -e "SHOW VARIABLES LIKE 'character_set%';"

# Check collation
mysql -u root -p -e "SHOW VARIABLES LIKE 'collation%';"
```

---

## 📊 Monitoring

### **Enable Performance Schema**
```sql
-- Enable performance schema
UPDATE performance_schema.setup_instruments 
SET ENABLED = 'YES', TIMED = 'YES' 
WHERE NAME LIKE '%statement/%';

UPDATE performance_schema.setup_consumers 
SET ENABLED = 'YES' 
WHERE NAME LIKE '%statements%';
```

### **Monitor Database Health**
```sql
-- Call the health check procedure
CALL database_health_check();

-- Monitor connections
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';

-- Monitor query performance
SELECT 
    DIGEST_TEXT,
    COUNT_STAR,
    AVG_TIMER_WAIT/1000000000 AS avg_time_seconds,
    MAX_TIMER_WAIT/1000000000 AS max_time_seconds
FROM performance_schema.events_statements_summary_by_digest
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;
```

---

## ✅ Setup Verification

### **Complete Setup Checklist**
- [ ] MySQL 8.0+ installed and running
- [ ] Database `clinic_management_saas` created
- [ ] Application user `clinic_app` created with proper privileges
- [ ] All migration scripts executed successfully
- [ ] Application can connect to database
- [ ] Backup script created and scheduled
- [ ] Performance tuning applied
- [ ] Monitoring enabled
- [ ] Security hardening completed

### **Final Test**
```sql
-- Test database operations
USE clinic_management_saas;

-- Test basic CRUD operations
INSERT INTO tenants (id, name, slug, email) 
VALUES (UUID(), 'Test Clinic', 'test-clinic', 'test@clinic.com');

SELECT * FROM tenants WHERE slug = 'test-clinic';

-- Clean up test data
DELETE FROM tenants WHERE slug = 'test-clinic';
```

Your MySQL database is now ready for the Clinic Management SaaS platform! 🎉
