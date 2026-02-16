// MongoDB Database Setup Script for Multi-tenant Clinic Management SaaS
// Run this script to set up the database and initial configuration

const { MongoClient } = require('mongodb');

// Configuration
const config = {
    uri: 'mongodb://localhost:27017',
    databaseName: 'clinic_management_saas',
    options: {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
};

// Database setup data
const setupData = {
    // Create users with different roles
    users: [
        {
            user: 'clinic_app',
            pwd: 'your_secure_password',
            roles: [
                { role: 'readWrite', db: 'clinic_management_saas' }
            ]
        },
        {
            user: 'backup_user',
            pwd: 'backup_password_123',
            roles: [
                { role: 'read', db: 'clinic_management_saas' }
            ]
        },
        {
            user: 'readonly_user',
            pwd: 'readonly_password_123',
            roles: [
                { role: 'read', db: 'clinic_management_saas' }
            ]
        }
    ],
    
    // Create indexes for performance
    indexes: [
        // Tenants collection indexes
        { collection: 'tenants', index: { slug: 1 }, unique: true },
        { collection: 'tenants', index: { email: 1 }, unique: true },
        { collection: 'tenants', index: { is_active: 1 } },
        { collection: 'tenants', index: { deleted_at: 1 } },
        
        // Clinics collection indexes
        { collection: 'clinics', index: { tenant_id: 1 } },
        { collection: 'clinics', index: { tenant_id: 1, name: 1 } },
        { collection: 'clinics', index: { tenant_id: 1, is_active: 1 } },
        { collection: 'clinics', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Users collection indexes
        { collection: 'users', index: { tenant_id: 1 } },
        { collection: 'users', index: { tenant_id: 1, email: 1 }, unique: true },
        { collection: 'users', index: { tenant_id: 1, role: 1 } },
        { collection: 'users', index: { tenant_id: 1, is_active: 1 } },
        { collection: 'users', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Patients collection indexes
        { collection: 'patients', index: { tenant_id: 1 } },
        { collection: 'patients', index: { tenant_id: 1, patient_id: 1 }, unique: true },
        { collection: 'patients', index: { tenant_id: 1, first_name: 1, last_name: 1 } },
        { collection: 'patients', index: { tenant_id: 1, is_active: 1 } },
        { collection: 'patients', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Appointments collection indexes
        { collection: 'appointments', index: { tenant_id: 1 } },
        { collection: 'appointments', index: { tenant_id: 1, appointment_number: 1 }, unique: true },
        { collection: 'appointments', index: { tenant_id: 1, start_time: 1 } },
        { collection: 'appointments', index: { tenant_id: 1, status: 1 } },
        { collection: 'appointments', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Medical records collection indexes
        { collection: 'medical_records', index: { tenant_id: 1 } },
        { collection: 'medical_records', index: { tenant_id: 1, record_number: 1 }, unique: true },
        { collection: 'medical_records', index: { tenant_id: 1, patient_id: 1 } },
        { collection: 'medical_records', index: { tenant_id: 1, doctor_id: 1 } },
        { collection: 'medical_records', index: { tenant_id: 1, created_at: 1 } },
        { collection: 'medical_records', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Prescriptions collection indexes
        { collection: 'prescriptions', index: { tenant_id: 1 } },
        { collection: 'prescriptions', index: { tenant_id: 1, prescription_number: 1 }, unique: true },
        { collection: 'prescriptions', index: { tenant_id: 1, patient_id: 1 } },
        { collection: 'prescriptions', index: { tenant_id: 1, is_active: 1 } },
        { collection: 'prescriptions', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Lab tests collection indexes
        { collection: 'lab_tests', index: { tenant_id: 1 } },
        { collection: 'lab_tests', index: { tenant_id: 1, test_number: 1 }, unique: true },
        { collection: 'lab_tests', index: { tenant_id: 1, status: 1 } },
        { collection: 'lab_tests', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Invoices collection indexes
        { collection: 'invoices', index: { tenant_id: 1 } },
        { collection: 'invoices', index: { tenant_id: 1, invoice_number: 1 }, unique: true },
        { collection: 'invoices', index: { tenant_id: 1, status: 1 } },
        { collection: 'invoices', index: { tenant_id: 1, due_date: 1 } },
        { collection: 'invoices', index: { tenant_id: 1, deleted_at: 1 } },
        
        // Payments collection indexes
        { collection: 'payments', index: { tenant_id: 1 } },
        { collection: 'payments', index: { tenant_id: 1, payment_number: 1 }, unique: true },
        { collection: 'payments', index: { tenant_id: 1, status: 1 } },
        { collection: 'payments', index: { tenant_id: 1, deleted_at: 1 } }
    ]
};

async function setupDatabase() {
    const client = new MongoClient(config.uri, config.options);
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        
        const db = client.db(config.databaseName);
        console.log(`Connected to database: ${config.databaseName}`);
        
        // Create users
        console.log('Creating database users...');
        const adminDb = client.db().admin();
        
        for (const user of setupData.users) {
            try {
                await adminDb.addUser(user.user, user.pwd, {
                    roles: user.roles
                });
                console.log(`✓ Created user: ${user.user}`);
            } catch (error) {
                if (error.code === 51003) {
                    console.log(`⚠ User ${user.user} already exists`);
                } else {
                    console.error(`✗ Error creating user ${user.user}:`, error.message);
                }
            }
        }
        
        // Create collections and indexes
        console.log('Creating collections and indexes...');
        
        for (const indexConfig of setupData.indexes) {
            try {
                const collection = db.collection(indexConfig.collection);
                await collection.createIndex(indexConfig.index, {
                    unique: indexConfig.unique || false,
                    background: true
                });
                console.log(`✓ Created index on ${indexConfig.collection}: ${JSON.stringify(indexConfig.index)}`);
            } catch (error) {
                if (error.code === 85) {
                    console.log(`⚠ Index already exists on ${indexConfig.collection}`);
                } else {
                    console.error(`✗ Error creating index on ${indexConfig.collection}:`, error.message);
                }
            }
        }
        
        // Insert sample tenant for testing
        console.log('Creating sample tenant...');
        const tenantsCollection = db.collection('tenants');
        
        const sampleTenant = {
            _id: new require('mongodb').ObjectId(),
            name: 'Demo Clinic',
            slug: 'demo-clinic',
            email: 'demo@clinic.com',
            phone: '+1-555-0123',
            address: '123 Main St',
            city: 'Demo City',
            state: 'Demo State',
            country: 'Demo Country',
            postal_code: '12345',
            settings: {
                timezone: 'UTC',
                currency: 'USD',
                language: 'en'
            },
            subscription_plan: 'basic',
            subscription_status: 'active',
            max_users: 10,
            max_patients: 1000,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        try {
            await tenantsCollection.insertOne(sampleTenant);
            console.log('✓ Created sample tenant');
        } catch (error) {
            if (error.code === 11000) {
                console.log('⚠ Sample tenant already exists');
            } else {
                console.error('✗ Error creating sample tenant:', error.message);
            }
        }
        
        // Create database statistics function
        console.log('Creating database statistics...');
        const stats = await db.stats();
        
        console.log('\n=== Database Setup Complete ===');
        console.log(`Database: ${config.databaseName}`);
        console.log(`Collections: ${stats.collections}`);
        console.log(`Data Size: ${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`);
        console.log(`Index Size: ${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`);
        console.log('\n✓ MongoDB setup completed successfully!');
        
    } catch (error) {
        console.error('✗ Database setup failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Health check function
async function healthCheck() {
    const client = new MongoClient(config.uri, config.options);
    
    try {
        await client.connect();
        const db = client.db(config.databaseName);
        
        const stats = await db.stats();
        const collections = await db.listCollections().toArray();
        
        return {
            status: 'healthy',
            timestamp: new Date(),
            database: config.databaseName,
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

// Maintenance function
async function performMaintenance() {
    const client = new MongoClient(config.uri, config.options);
    
    try {
        await client.connect();
        const db = client.db(config.databaseName);
        
        // Get all collections
        const collections = await db.listCollections().toArray();
        
        console.log('Performing database maintenance...');
        
        for (const collection of collections) {
            const coll = db.collection(collection.name);
            
            // Compact collection (requires MongoDB Enterprise or specific setup)
            try {
                await db.command({ compact: collection.name });
                console.log(`✓ Compacted collection: ${collection.name}`);
            } catch (error) {
                console.log(`⚠ Could not compact ${collection.name}: ${error.message}`);
            }
            
            // Rebuild indexes
            try {
                await coll.reIndex();
                console.log(`✓ Rebuilt indexes for: ${collection.name}`);
            } catch (error) {
                console.error(`✗ Error rebuilding indexes for ${collection.name}:`, error.message);
            }
        }
        
        // Get database statistics
        const stats = await db.stats();
        console.log('\n=== Maintenance Complete ===');
        console.log(`Database: ${config.databaseName}`);
        console.log(`Collections: ${stats.collections}`);
        console.log(`Data Size: ${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`);
        console.log(`Index Size: ${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`);
        
        return { success: true, message: 'Maintenance completed successfully' };
        
    } catch (error) {
        console.error('✗ Maintenance failed:', error.message);
        return { success: false, error: error.message };
    } finally {
        await client.close();
    }
}

// Export functions for use in other modules
module.exports = {
    setupDatabase,
    healthCheck,
    performMaintenance,
    config
};

// Run setup if this file is executed directly
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'setup':
            setupDatabase();
            break;
        case 'health':
            healthCheck().then(result => console.log(JSON.stringify(result, null, 2)));
            break;
        case 'maintenance':
            performMaintenance();
            break;
        default:
            console.log('Usage: node mongodb-setup.js [setup|health|maintenance]');
            console.log('  setup       - Initialize database and create users/indexes');
            console.log('  health      - Check database health');
            console.log('  maintenance - Perform database maintenance');
    }
}
