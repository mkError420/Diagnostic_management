# Production Deployment Guide

## 🚀 Overview

This guide covers the complete production deployment process for the Clinic Management SaaS platform, including security hardening, environment setup, and CI/CDD configuration.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Security Hardening](#security-hardening)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Backend Deployment (Node.js)](#backend-deployment-nodejs)
7. [PostgreSQL Setup](#postgresql-setup)
8. [Docker Deployment](#docker-deployment)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Monitoring and Logging](#monitoring-and-logging)
11. [Backup Strategy](#backup-strategy)
12. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### **System Requirements**
- **Node.js**: 18.x or higher
- **PostgreSQL**: 13 or higher
- **Redis**: 6.0 or higher (optional but recommended)
- **Docker**: 20.10 or higher
- **Nginx**: 1.20 or higher (optional)
- **SSL Certificate**: For HTTPS

### **Required Services**
- Domain name (e.g., yourdomain.com)
- SSL certificate (Let's Encrypt recommended)
- Email service (for notifications)
- Payment processor (Stripe recommended)
- Monitoring service (optional)

---

## 🔒 Security Hardening

### **1. Environment Variables**
Create a secure `.env.production` file:
```bash
# Application
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/clinic_management

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# API Keys
API_KEY=ck_your-api-key-32-characters

# Logging
LOG_LEVEL=info

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Stripe (optional)
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# File Uploads
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
```

### **2. Security Headers**
The application automatically includes these security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### **3. Rate Limiting**
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Tenant-specific**: Configurable per tenant
- **Slow Down**: Progressive delays for brute force attacks

### **4. IP Whitelisting** (Optional)
```bash
# Add to .env.production
ALLOWED_IPS=192.168.1.100,10.0.0.1,203.0.113.42
```

---

## 🌍 Environment Setup

### **1. Production Environment Variables**
```bash
# Create production environment file
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### **2. Security Validation**
```bash
# Validate environment variables
npm run validate:env
```

### **3. Build Application**
```bash
# Build for production
npm run build

# Verify build
ls -la dist/
```

---

## 🗄️ Database Setup

### **1. PostgreSQL Installation**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### **2. Database Configuration**
```sql
-- Create database
CREATE DATABASE clinic_management;

-- Create user
CREATE USER clinic_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE clinic_management TO clinic_user;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Run migrations
\i migrations/001_initial_schema.sql
\i migrations/002_seed_data.sql
\i migrations/003_audit_trails.sql
\i migrations/004_subscriptions_billing.sql
```

### **3. PostgreSQL Security**
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/postgresql.conf

# Add these settings:
ssl = on
password_encryption = scramsha256
shared_preload_libraries = 'pg_stat_statements'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
```

### **4. Redis Setup** (Optional)
```bash
# Ubuntu/Debian
sudo apt install redis-server

# Start Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Add these settings:
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

---

## 🚀 Frontend Deployment (Vercel)

### **1. Install Vercel CLI**
```bash
npm i -g vercel
```

### **2. Build Frontend**
```bash
cd ../clinic-management-frontend
npm run build
```

### **3. Configure Vercel**
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": {
    "dev": {
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3001/api",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
      }
    },
    "production": {
      "env": {
        "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com",
        "NEXT_PUBLIC_APP_URL": "https://yourdomain.com"
      }
    }
  },
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com",
    "NEXT_PUBLIC_APP_URL": "https://yourdomain.com"
  }
}
```

### **4. Deploy to Vercel**
```bash
# Deploy to Vercel
vercel --prod

# Add custom domain
vercel domains add yourdomain.com

# Add SSL certificate
vercel certs add yourdomain.com
```

### **5. Environment Variables in Vercel**
```bash
# Set environment variables
vercel env add NEXT_PUBLIC_API_URL https://api.yourdomain.com
vercel env add NEXT_PUBLIC_APP_URL https://yourdomain.com
```

---

## 🚀 Backend Deployment (Node.js)

### **1. Server Setup**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx
```

### **2. Application Setup**
```bash
# Clone repository
git clone https://github.com/yourusername/clinic-management-backend.git
cd clinic-management-backend

# Install dependencies
npm ci --production

# Build application
npm run build

# Create logs directory
mkdir -p logs
```

### **3. PM2 Configuration**
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'clinic-api',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
  }],
};
```

### **4. Start Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

### **5. Nginx Configuration**
Create `/etc/nginx/sites-available/clinic-api`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;

    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/ssl/certs/yourdomain.com.crt;
    ssl_certificate_key /etc/ssl/private/yourdomain.com.key;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone_api_limit;
    zone_api_limit zone=1m rate=10r/s burst=20 nodelay=0;
    
    # Proxy to Node.js app
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
        proxy_pass_request_headers $http_upgrade;
    }
}
```

### **6. Enable Site**
```bash
sudo ln -s /etc/nginx/sites-available/clinic-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🐘 PostgreSQL Setup

### **1. Production Database Configuration**
```sql
-- postgresql.conf settings for production
listen_addresses = '*'
port = 5432
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### **2. Backup Strategy**
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="clinic_management"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -h localhost -U postgres -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove old backups (keep 7 days)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Database backup completed: backup_$DATE.sql.gz"
EOF

chmod +x backup-db.sh

# Add to crontab
crontab -e
0 2 * * * /path/to/backup-db.sh
```

### **3. Monitoring Setup**
```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create monitoring user
CREATE USER monitoring WITH PASSWORD 'secure_password';
GRANT pg_read_all_stats TO monitoring;
```

---

## 🐳 Docker Deployment

### **1. Build Docker Image**
```bash
# Build application image
docker build -t clinic-api:latest .

# Tag for registry
docker tag clinic-api:latest your-username/clinic-api:latest
docker push your-username/clinic-api:latest
```

### **2. Docker Compose Deployment**
```bash
# Create production environment file
cp docker-compose.yml docker-compose.prod.yml

# Edit production values
nano docker-compose.prod.yml
```

### **3. Deploy with Docker Compose**
```bash
# Deploy services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### **4. Health Checks**
```bash
# Add health check to docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

---

## 🔄 CI/CD Pipeline

### **1. GitHub Actions Workflow**
The `.github/workflows/ci-cd.yml` includes:

- **Testing**: Multiple Node.js versions
- **Security**: npm audit and Snyk scanning
- **Building**: Optimized production builds
- **Deployment**: Automated staging and production deployment
- **Health Checks**: Post-deployment verification

### **2. Pipeline Stages**
1. **Test**: Run tests, linting, and type checking
2. **Build**: Create optimized production build
3. **Security**: Run security audits
4. **Deploy**: Deploy to staging (develop branch) or production (releases)
5. **Migrate**: Run database migrations
6. **Health Check**: Verify deployment health

### **3. Environment Variables in GitHub**
```bash
# Repository secrets
gh secret set DATABASE_URL "postgresql://..."
gh secret set JWT_SECRET "your-jwt-secret"
gh secret set STRIPE_SECRET_KEY "sk_live_..."
gh secret set SLACK_WEBHOOK_URL "https://hooks.slack.com/..."
```

---

## 📊 Monitoring and Logging

### **1. Application Logging**
```typescript
// Production logging configuration
const loggingConfig = {
  level: 'info',
  format: 'json',
  colorize: false,
  timestamp: true,
  errors: true,
  warnings: true,
  info: false,
  debug: false,
};
```

### **2. Monitoring Setup**
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-monit

# Configure PM2 monitoring
pm2 install pm2-logrotate
pm2 install pm2-monit
```

### **3. Log Rotation**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    // ... other config
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
  }],
};

// Log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:rotate-interval='0 0 * * * *'
pm2 set pm2-logrotate:retain=7
pm2 set pm2-logrotate:compress=true
pm2 set pm2-logrotate:compress-dateformat=YYYY-MM-DD
pm2 set pm2-logrotate:dateformat=YYYY-MM-DD
```

### **4. Health Check Endpoint**
```typescript
// src/routes/health.ts
export const healthCheck = async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV,
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };

  res.status(200).json(health);
};
```

---

## 💾 Backup Strategy

### **1. Database Backups**
```bash
# Automated daily backups
0 2 * * * * /path/to/backup-db.sh

# Manual backup
pg_dump -h localhost -U postgres -d clinic_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U postgres -d clinic_management < backup_20240115_120000.sql
```

### **2. Application Backups**
```bash
# Backup application files
tar -czf /backups/app_$(date +%Y%m%d_%H%M%S).tar.gz \
  dist/ \
  package.json \
  docker-compose.yml \
  .env.production \
  nginx.conf
```

### **3. Offsite Backups**
```bash
# AWS S3 backup
aws s3 cp /var/backups/backup_20240115_120000.sql.gz s3://your-backup-bucket/

# Google Drive backup
rclone copy /var/backups/ gdrive:clinic-backups/
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Database Connection Failed**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql

# Test connection
psql -h localhost -U postgres -d clinic_management
```

#### **2. Application Won't Start**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Check environment variables
pm2 env 0
```

#### **3. Rate Limiting Issues**
```bash
# Check rate limit configuration
grep RATE_LIMIT .env.production

# Monitor rate limiting
tail -f logs/combined.log | grep "rate limit"
```

#### **4. SSL Certificate Issues**
```bash
# Check SSL certificate
openssl x509 -in /etc/ssl/certs/yourdomain.com.crt -text -noout

# Test SSL configuration
openssl s_client -connect yourdomain.com:443
```

### **5. Memory Issues**
```bash
# Check memory usage
free -h

# Check Node.js process memory
pm2 monit

# Adjust PM2 memory settings
pm2 restart
```

### **6. Database Performance**
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY total_time DESC
LIMIT 10;

-- Check database size
SELECT pg_size_pretty(pg_database_size('clinic_management));
```

---

## 📚 Production Checklist

### **Security Checklist**
- [ ] Environment variables are properly configured
- [ ] JWT secret is at least 32 characters
- [ ] Database uses strong passwords
- [ ] SSL certificates are valid
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured
- [ ] Security headers are in place
- [ ] IP whitelist is configured (if needed)
- [ ] API keys are secure
- [ ] File upload limits are set

### **Performance Checklist**
- [ ] Application is built for production
- [ ] Database is properly tuned
- [ ] Redis is configured (if used)
- [ ] Nginx is properly configured
- [ ] PM2 cluster mode is enabled
- [ ] Log rotation is configured
- [ ] Health checks are implemented
- [ ] Monitoring is set up

### **Reliability Checklist**
- [ ] Database backups are automated
- [ ] Application backups are automated
- [ ] Offsite backups are configured
- [ ] Health checks are implemented
- [ ] Monitoring alerts are configured
- [ ] Error tracking is set up
- [ ] CI/CD pipeline is working
- [ ] Rollback strategy is in place

### **Deployment Checklist**
- [ ] Environment variables are set
- [ ] Database migrations are run
- [ SSL certificates are installed
- - [ ] Domain is configured
- [ ] DNS is pointing correctly
- [ ] Firewall is configured
- [ ] Load balancer is configured (if needed)
- [ ] Health checks are passing

---

## 📞 Support and Maintenance

### **Monitoring Dashboard**
- **Application Metrics**: Response time, error rate, throughput
- **Database Metrics**: Connection pool, query performance, storage usage
- **System Metrics**: CPU, memory, disk usage
- **Business Metrics**: Active users, subscription status, revenue

### **Alerting**
- **Critical**: Application down, database errors, security breaches
- **Warning**: High error rates, performance degradation
- **Info**: Deployments, SSL certificate expiry

### **Maintenance Windows**
- **Weekly**: Review logs and metrics
- **Monthly**: Update dependencies, security patches
- **Quarterly**: Review and update security configurations
- **Annually**: Major version upgrades

This comprehensive deployment guide ensures your Clinic Management SaaS platform is production-ready with enterprise-grade security, performance, and reliability.
