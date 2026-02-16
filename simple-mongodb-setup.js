// Simple MongoDB Setup Script for Clinic Management SaaS
const { MongoClient } = require('mongodb');

async function setupDatabase() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('✓ Connected to MongoDB');
        
        const db = client.db('clinic_management_saas');
        console.log('✓ Using database: clinic_management_saas');
        
        // Create collections (they will be created automatically when we insert data)
        console.log('Creating collections...');
        
        // Create a sample tenant to initialize the database
        const tenantsCollection = db.collection('tenants');
        
        const sampleTenant = {
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
        
        // Create indexes for better performance
        console.log('Creating indexes...');
        
        const collections = [
            'tenants',
            'clinics', 
            'users',
            'patients',
            'appointments',
            'medical_records',
            'prescriptions',
            'lab_tests',
            'invoices',
            'payments'
        ];
        
        for (const collectionName of collections) {
            const collection = db.collection(collectionName);
            
            // Create tenant_id index for all collections
            await collection.createIndex({ tenant_id: 1 });
            console.log(`✓ Created tenant_id index on ${collectionName}`);
            
            // Create deleted_at index for soft deletes
            await collection.createIndex({ deleted_at: 1 });
            console.log(`✓ Created deleted_at index on ${collectionName}`);
        }
        
        // Specific indexes for important collections
        await tenantsCollection.createIndex({ slug: 1 }, { unique: true });
        await tenantsCollection.createIndex({ email: 1 }, { unique: true });
        console.log('✓ Created unique indexes on tenants');
        
        const usersCollection = db.collection('users');
        await usersCollection.createIndex({ tenant_id: 1, email: 1 }, { unique: true });
        console.log('✓ Created unique email index on users');
        
        // Get database statistics
        const stats = await db.stats();
        
        console.log('\n=== MongoDB Setup Complete ===');
        console.log(`Database: ${db.databaseName}`);
        console.log(`Collections: ${stats.collections}`);
        console.log(`Data Size: ${Math.round(stats.dataSize / 1024 / 1024 * 100) / 100} MB`);
        console.log(`Index Size: ${Math.round(stats.indexSize / 1024 / 1024 * 100) / 100} MB`);
        
        // Test the connection
        const tenantCount = await tenantsCollection.countDocuments();
        console.log(`Sample tenants: ${tenantCount}`);
        
        console.log('\n✅ MongoDB setup completed successfully!');
        console.log('\nYour MongoDB connection string:');
        console.log('mongodb://localhost:27017/clinic_management_saas');
        
    } catch (error) {
        console.error('✗ Setup failed:', error.message);
        process.exit(1);
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB');
    }
}

// Health check function
async function healthCheck() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        const db = client.db('clinic_management_saas');
        
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
        default:
            console.log('Usage: node simple-mongodb-setup.js [setup|health]');
            console.log('  setup  - Initialize database and create indexes');
            console.log('  health - Check database health');
    }
}

module.exports = { setupDatabase, healthCheck };
