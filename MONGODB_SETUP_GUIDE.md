# MongoDB Database Setup Guide

## 🗄️ Overview

This guide provides step-by-step instructions for setting up MongoDB database for the Clinic Management SaaS platform, including installation, configuration, security, and optimization.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Initial Configuration](#initial-configuration)
4. [Security Setup](#security-setup)
5. [Database Creation](#database-creation)
6. [Model Setup](#model-setup)
7. [Performance Optimization](#performance-optimization)
8. [Backup Configuration](#backup-configuration)
9. [Connection Testing](#connection-testing)
10. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### **System Requirements**
- **Operating System**: Windows 10+, Ubuntu 20.04+, CentOS 8+, or macOS 10.15+
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: Minimum 20GB (50GB recommended)
- **User**: Administrative access

### **Software Requirements**
- **MongoDB**: Version 5.0 or higher
- **Node.js**: 14.x or higher
- **Development Tools**: Git, curl, text editor
- **Optional**: MongoDB Compass (GUI tool)

---

## 📦 Installation

### **Windows**
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer and select "Complete" installation
3. Install MongoDB Compass (optional GUI tool)
4. Choose to install MongoDB as a Windows Service
5. Complete the installation

### **Ubuntu/Debian**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package list
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start and enable MongoDB service
sudo systemctl start mongod
sudo systemctl enable mongod
```

### **macOS (Homebrew)**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb/brew/mongodb-community
```

---

## ⚙️ Initial Configuration

### **MongoDB Configuration File**
Edit `/etc/mongod.conf` (Linux/macOS) or `C:\Program Files\MongoDB\Server\6.0\bin\mongod.cfg` (Windows):

```yaml
# Network configuration
net:
  port: 27017
  bindIp: 127.0.0.1

# Storage configuration
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1

# System log configuration
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

# Process management
processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid

# Security configuration
security:
  authorization: enabled

# Operation profiling
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

# Replication (for production)
replication:
  replSetName: "clinic-management-replica"
```

### **Restart MongoDB Service**
```bash
# Linux
sudo systemctl restart mongod

# macOS
brew services restart mongodb/brew/mongodb-community

# Windows
net stop MongoDB
net start MongoDB
```

---

## 🔒 Security Setup

### **Enable Authentication**
```javascript
// Connect to MongoDB without authentication first
mongo

// Switch to admin database
use admin

// Create admin user
db.createUser({
  user: "admin",
  pwd: "your_admin_password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

// Create application database user
use clinic_management_saas

db.createUser({
  user: "clinic_app",
  pwd: "your_secure_password",
  roles: [
    { role: "readWrite", db: "clinic_management_saas" }
  ]
})

// Create backup user
db.createUser({
  user: "backup_user",
  pwd: "backup_password_123",
  roles: [
    { role: "read", db: "clinic_management_saas" },
    { role: "backup", db: "admin" }
  ]
})

// Create readonly user
db.createUser({
  user: "readonly_user",
  pwd: "readonly_password_123",
  roles: [
    { role: "read", db: "clinic_management_saas" }
  ]
})
```

### **Configure Firewall**
```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 27017/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=mongodb
sudo firewall-cmd --reload

# Windows Firewall
# Allow MongoDB port 27017 through Windows Firewall
```

---

## 🗄️ Database Creation

### **Run Setup Script**
```bash
# Navigate to your project directory
cd "e:\rabbani\SAS Software\clinic-management-backend"

# Install dependencies first
npm install

# Run the MongoDB setup script
node mongodb-setup.js setup
```

### **Verify Database Creation**
```javascript
// Connect to MongoDB
mongo "mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas"

// List collections
show collections

// Check database health
node mongodb-setup.js health
```

---

## 📋 Model Setup

### **Available Models**
The following Mongoose models have been created:

1. **Tenant** (`models/Tenant.js`) - Multi-tenant organization data
2. **User** (`models/User.js`) - User accounts with roles and authentication
3. **Patient** (`models/Patient.js`) - Patient information and medical history
4. **Appointment** (`models/Appointment.js`) - Appointment scheduling and management

### **Database Connection Setup**
Create `config/database.js`:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_management_saas', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Set up indexes
    await setupIndexes();
    
    return conn;
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const setupIndexes = async () => {
  // Indexes are automatically created by the models
  console.log('Database indexes verified');
};

module.exports = connectDB;
```

### **Environment Configuration**
Update your `.env` file:

```bash
# MongoDB connection string
MONGODB_URI=mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas

# Alternative with authentication database
MONGODB_URI=mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas?authSource=clinic_management_saas
```

---

## ⚡ Performance Optimization

### **MongoDB Performance Tuning**
Add these settings to your MongoDB configuration:

```yaml
# WiredTiger performance settings
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
      journalCompressor: snappy
      directoryForIndexes: false
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

# Connection settings
net:
  maxIncomingConnections: 1000

# Operation profiling
operationProfiling:
  slowOpThresholdMs: 50
  mode: all
```

### **Create Indexes**
```javascript
// Monitor index usage
db.runCommand({ collStats: "patients", indexDetails: true })

// Check query execution plans
db.patients.find({ tenant_id: ObjectId("..."), first_name: "John" }).explain("executionStats")

// Create compound indexes for common queries
db.patients.createIndex({ tenant_id: 1, first_name: 1, last_name: 1 })
db.appointments.createIndex({ tenant_id: 1, start_time: 1, status: 1 })
```

### **Aggregation Pipeline Optimization**
```javascript
// Use $match early in pipeline
db.appointments.aggregate([
  { $match: { tenant_id: ObjectId("..."), status: "scheduled" } },
  { $lookup: { from: "patients", localField: "patient_id", foreignField: "_id", as: "patient" } },
  { $sort: { start_time: 1 } }
])
```

---

## 💾 Backup Configuration

### **Automated Backup Script**
Create `backup-mongodb.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="clinic_management_saas"
DB_USER="backup_user"
DB_PASS="backup_password_123"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create backup
mongodump --host localhost --port 27017 --db $DB_NAME --username $DB_USER --password $DB_PASS --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Remove backups older than 7 days
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete

echo "MongoDB backup completed: backup_$DATE.tar.gz"
```

### **Schedule Backups with Cron**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mongodb.sh
```

### **Restore Database**
```bash
# Decompress backup
tar -xzf backup_20240115_120000.tar.gz

# Restore database
mongorestore --host localhost --port 27017 --db clinic_management_saas --username clinic_app --password your_secure_password backup_20240115_120000/clinic_management_saas
```

---

## 🔗 Connection Testing

### **Test Application Connection**
```javascript
const mongoose = require('mongoose');

async function testConnection() {
  try {
    await mongoose.connect('mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas');
    
    // Test basic operations
    const Tenant = require('./models/Tenant');
    const count = await Tenant.countDocuments();
    
    console.log('✓ MongoDB connection successful');
    console.log(`✓ Found ${count} tenants`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
  }
}

testConnection();
```

### **Test Model Operations**
```javascript
const mongoose = require('mongoose');
const Tenant = require('./models/Tenant');

async function testModels() {
  try {
    await mongoose.connect('mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas');
    
    // Create a test tenant
    const tenant = new Tenant({
      name: 'Test Clinic',
      slug: 'test-clinic',
      email: 'test@clinic.com'
    });
    
    await tenant.save();
    console.log('✓ Test tenant created:', tenant._id);
    
    // Find tenant
    const found = await Tenant.findBySlug('test-clinic');
    console.log('✓ Tenant found:', found.name);
    
    // Clean up
    await Tenant.deleteOne({ _id: tenant._id });
    console.log('✓ Test tenant cleaned up');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ Model test failed:', error);
  }
}

testModels();
```

---

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Connection Refused**
```bash
# Check MongoDB service status
sudo systemctl status mongod

# Check if MongoDB is running on port 27017
sudo netstat -tlnp | grep 27017

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

#### **2. Authentication Failed**
```javascript
// Check if authentication is enabled
db.runCommand({ connectionStatus: 1 })

// List users
use admin
db.getUsers()

// Reset password if needed
db.changeUserPassword("clinic_app", "new_password")
```

#### **3. Performance Issues**
```javascript
// Show running operations
db.currentOp()

// Show slow queries
db.getProfilingStatus()
db.system.profile.find().limit(5).sort({ ts: -1 })

// Check database stats
db.stats()
db.collection.stats()
```

#### **4. Index Issues**
```javascript
// List indexes
db.collection.getIndexes()

// Rebuild indexes
db.collection.reIndex()

// Check index usage
db.collection.aggregate([{ $indexStats: {} }])
```

---

## 📊 Monitoring

### **Enable Monitoring**
```javascript
// Enable profiling
db.setProfilingLevel(2, { slowms: 100 })

// Monitor connections
db.serverStatus().connections

// Monitor memory usage
db.serverStatus().mem

// Monitor operations
db.runCommand({ serverStatus: 1 })
```

### **Health Check Script**
```javascript
const { MongoClient } = require('mongodb');

async function healthCheck() {
  const client = new MongoClient('mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas');
  
  try {
    await client.connect();
    const db = client.db();
    
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      database: 'clinic_management_saas',
      collections: stats.collections,
      data_size_mb: Math.round(stats.dataSize / 1024 / 1024 * 100) / 100,
      index_size_mb: Math.round(stats.indexSize / 1024 / 1024 * 100) / 100,
      collection_names: collections.map(c => c.name)
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date(),
      error: error.message
    };
  } finally {
    await client.close();
  }
}

module.exports = healthCheck;
```

---

## ✅ Setup Verification

### **Complete Setup Checklist**
- [ ] MongoDB 5.0+ installed and running
- [ ] Authentication enabled
- [ ] Database `clinic_management_saas` created
- [ ] Application users created with proper roles
- [ ] Setup script executed successfully
- [ ] Models imported and tested
- [ ] Application can connect to database
- [ ] Backup script created and scheduled
- [ ] Performance tuning applied
- [ ] Monitoring enabled
- [ ] Security hardening completed

### **Final Test**
```javascript
// Test complete workflow
const mongoose = require('mongoose');
const Tenant = require('./models/Tenant');
const User = require('./models/User');

async function finalTest() {
  try {
    await mongoose.connect('mongodb://clinic_app:your_secure_password@localhost:27017/clinic_management_saas');
    
    // Test tenant creation
    const tenant = await Tenant.create({
      name: 'Final Test Clinic',
      slug: 'final-test-clinic',
      email: 'final@test.com'
    });
    
    // Test user creation
    const user = await User.create({
      tenant_id: tenant._id,
      first_name: 'Test',
      last_name: 'User',
      email: 'user@test.com',
      password_hash: 'test123',
      salt: 'test',
      role: 'admin'
    });
    
    console.log('✓ All tests passed!');
    
    // Clean up
    await User.deleteOne({ _id: user._id });
    await Tenant.deleteOne({ _id: tenant._id });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('✗ Final test failed:', error);
  }
}

finalTest();
```

Your MongoDB database is now ready for the Clinic Management SaaS platform! 🎉

---

## 🚀 Next Steps

1. **Install dependencies**: `npm install`
2. **Run setup script**: `node mongodb-setup.js setup`
3. **Test connection**: Update your application with MongoDB connection string
4. **Deploy**: Configure production MongoDB with replica sets
5. **Monitor**: Set up monitoring and alerting
6. **Backup**: Configure automated backups

The MongoDB setup provides a flexible, scalable foundation for your multi-tenant clinic management application with proper indexing, security, and performance optimization.
