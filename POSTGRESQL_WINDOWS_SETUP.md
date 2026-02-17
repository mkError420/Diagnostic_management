# PostgreSQL Installation Guide for Windows

## 🗄️ Overview

This guide covers multiple methods for installing PostgreSQL on Windows, including official installer, package managers, and Docker setup for the Clinic Management SaaS platform.

## 📋 Table of Contents

1. [Installation Methods](#installation-methods)
2. [Official Installer](#official-installer)
3. [Chocolatey Package Manager](#chocolatey-setup)
4. [Docker Desktop](#docker-desktop)
5. [WSL2](#wsl2)
6. [PostgreSQL Setup](#postgresql-setup)
7. [Connection Testing](#connection-testing)
8. [Troubleshooting](#troubleshooting)

---

## 🪟 Installation Methods

### **1. Official Installer (Recommended)**
**Download from PostgreSQL Website**
1. Visit [https://www.enterprisedb.org/download/windows/](https://www.enterprisedb.org/download/windows/)
2. Select your Windows version
3. Choose the latest stable version
4. Download the installer (e.g., `postgresql-16.1.1-windows-x64.exe`)
5. Run installer as administrator

### **2. Chocolatey Package Manager**
**Install Chocolatey**
```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass
[System.Net.ServicePointManager::Set-DefaultSource https://chocolatey.org/api/v2/
```

### **3. Docker Desktop**
**Install Docker Desktop**
```powershell
# Install Docker Desktop
wsl --install -d docker-desktop
```

### **4. WSL2 (Windows Subsystem for Linux 2)**
**Enable WSL2**
```powershell
# Enable WSL2
dism.exe /online /mnt/c /c /usr/bin
wsl --set-default-version 2

# Install PostgreSQL via WSL2
wsl --install postgresql
```

---

## 📦 Official Installer (Recommended)

### **Step 1: Download Installer**
1. Go to [https://www.enterprisedb.org/download/windows/](https://www.enterprisedb.org/download/windows/)
2. Select your Windows version
3. Choose the latest stable version
4. Download the installer (e.g., `postgresql-16.1.1-windows-x64.exe`)

### **Step 2: Run Installer**
```powershell
# Run as Administrator
# Right-click installer and select "Run as administrator"
# Or run from command line
.\postgresql-16.1.1-windows-x64.exe

# Installation wizard steps:
# 1. Select installation directory (default: C:\Program Files\PostgreSQL\16)
# 2. Select components (Server, pgAdmin, Command Line Tools)
# 3. Set superuser password
# 4. Set port (default: 5432)
# 5. Configure locale
# 6. Install
```

### **Step 3: Configure PostgreSQL**
```sql
-- After installation, run Stack Builder
# Start pgAdmin 4 (Start > PostgreSQL > Tools > pgAdmin 4)
# Configure database connection
```

---

## 🍍 Chocolatey Setup

### **Step 1: Install Chocolatey**
```powershell
# Install Chocolatey
Set-ExecutionPolicy Bypass
[System.Net.ServicePointManager::Set-DefaultSource https://chocolatey.org/api/v2/
```

### **Step 2: Install PostgreSQL**
```powershell
# Install PostgreSQL
choco install postgresql --version=16
```

### **Step 3: Initialize Database**
```powershell
# Initialize database
initdb -U postgres -D clinic_management -E UTF-8 -W
```

### **Start PostgreSQL Service**
```powershell
# Start PostgreSQL service
chocolatey start postgresql
```

### **Step 4: Set Auto-start**
```powershell
# Enable auto-start
choco install postgresql-service --automatic-startup
```

### **Step 5: Test Connection**
```powershell
# Test connection
psql -U postgres -d clinic_management
```

---

## 🐳 Docker Desktop Setup

### **Step 1: Install Docker Desktop**
```powershell
# Install Docker Desktop
wsl --install -d docker-desktop
```

### **Step 2: Pull PostgreSQL Image**
```powershell
# Pull PostgreSQL image
docker pull postgres:16
```

### **Step 3: Create Docker Compose File**
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    container_name: postgres
    restart: always
    environment:
      POSTGRES_DB: clinic_management
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secure_password_123
      POSTGRES_INITDB_ARGS: "-E UTF8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:/docker-entrypoint-initdb.d
    networks:
      - clinic-network
```

### **Step 4: Start Database**
```powershell
# Start PostgreSQL
docker-compose up -d

# Check status
docker-compose ps
```

---

## 🪟 WSL2 Setup

### **Step 1: Enable WSL2**
```powershell
# Enable WSL2
dism.exe /online /mnt/c /c /usr/bin
wsl --set-default-version 2

# Update packages
wsl --update
```

### **Step 2: Install PostgreSQL**
```powershell
# Install PostgreSQL
wsl --install postgresql
```

### **Step 3: Initialize Database**
```powershell
# Initialize database
sudo -u postgres createdb clinic_management
sudo -u postgres psql -d clinic_management -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"
```

### **Step 4: Start PostgreSQL**
```powershell
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## 🔧 PostgreSQL Setup

### **1. Create Database**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE clinic_management;

-- Create application user
CREATE USER clinic_app WITH PASSWORD 'secure_password_123!';
GRANT ALL PRIVILEGES ON DATABASE clinic_management TO clinic_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO clinic_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO clinic_app;
```

### **2. Enable Extensions**
```sql
-- Connect to database
\c clinic_management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### **3. Run Migrations**
```bash
# Navigate to project directory
cd /path/to/clinic-management-backend

# Run all migrations in order
psql -d clinic_management < migrations/001_initial_schema.sql
psql -d clinic_management < migrations/002_seed_data.sql
psql -d clinic_management < migrations/3_audit_trails.sql
psql -d clinic_management < migrations/4_subscriptions_billing.sql
```

### **4. Verify Setup**
```sql
-- Check created tables
\dt clinic_management
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS policies
\dp
SELECT schemaname, tablename, permissive
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 🔍 Connection Testing

### **1. Test Local Connection**
```sql
# Test as postgres
psql -h localhost -U postgres -d clinic_management

# Test as application user
psql -h localhost -U clinic_app -d clinic_management

# Test as read-only user
psql -h localhost -U clinic_readonly -d clinic_management
```

### **2. Test Remote Connection**
```sql
# Test remote connection
psql -h your-server.com -U clinic_app -d clinic_management \
  sslmode=require

# Test with specific host
psql -h 192.168.1.100 -U clinic_app -d clinic_management
```

### **3. Test Application Connection**
```typescript
// Test from Node.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    await client.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}
```

### **4. Test Row-Level Security**
```sql
-- Test tenant function
SELECT current_tenant_id();

-- Test RLS policy
SELECT COUNT(*) FROM patients WHERE tenant_id = 'test-tenant-id';

-- Test with different tenant (should return no rows)
SELECT COUNT(*) FROM patients WHERE tenant_id = 'wrong-tenant-id';
```

---

## 🔧 Troubleshooting

### **Common Windows Issues**

#### **Installation Fails**
```bash
# Clear previous installations
sudo apt-get remove --purge postgresql postgresql postgresql-contrib

# Clear Chocolatey cache
choco clean --yes
```

#### **Permission Denied**
```bash
# Fix ownership
sudo chown -R postgres:postgres /var/lib/postgresql/
sudo chmod 700 /var/lib/postgresql/
```

#### **Service Won't Start**
```bash
# Check service status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql

# Check port conflicts
netstat -an | grep :5432
```

#### **Connection Refused**
```bash
# Kill existing connections
sudo pkill -f postgres
sudo systemctl restart postgresql
```

#### **Migration Errors**
```bash
# Check migration files
ls -la migrations/

# Run migrations individually
psql -d clinic_management < migrations/001_initial_schema.sql
psql -d clinic_management < migrations/002_seed_data.sql
```

### **Performance Issues**

#### **Slow Queries**
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY total_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('clinic_management'));
```

#### **Memory Issues**
```sql
-- Show memory usage
SELECT 
  datname,
  pg_size_pretty(pg_database_size(datname)),
  pg_size_pretty(pg_total_relation_size(datname))
FROM pg_database
ORDER BY pg_size_pretty(pg_database_size(datname));
```

---

## 📚 Quick Reference

### **Essential Commands**
```bash
# PostgreSQL service commands
sudo systemctl start postgresql
sudo systemctl stop postgresql
sudo systemctl restart postgresql
sudo systemctl status postgresql

# Database connection
psql -h localhost -U postgres
psql -h localhost -U clinic_app

# Database operations
CREATE DATABASE database_name;
DROP DATABASE database_name;
CREATE DATABASE database_name;
GRANT ALL PRIVILEGES ON DATABASE_NAME TO user_name;
```

### **Configuration Files**
```bash
# PostgreSQL config location
/etc/postgresql/13/main/postgresql.conf
/etc/postgresql/13/main/pg_hba.conf
/var/lib/postgresql/data/
```

### **Connection Strings**
```bash
# Local connection
DATABASE_URL="postgresql://username:password@localhost:5432/clinic_management"

# Remote connection
DATABASE_URL="postgresql://user:password@your-server.com:5432/clinic_management"

# SSL connection
DATABASE_URL="postgresql://user:password@your-server.com:5432/clinic_management?sslmode=require"
```

---

## 🎯 Next Steps

After setting up PostgreSQL:

1. **Run database migrations** to create the database schema
2. **Configure application** to use the database connection string
3. **Test all connections** (local, remote, application)
4. **Set up monitoring** and alerting
5. **Configure backups** and test restore procedures
6. **Configure performance** tuning and optimization

The database is now ready for the Clinic Management SaaS platform! 🎉
