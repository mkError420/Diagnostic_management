// Test MongoDB Connection and Models
require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Tenant = require('./models/Tenant');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test Tenant model
    console.log('\n📋 Testing Tenant model...');
    const tenantCount = await Tenant.countDocuments();
    console.log(`✓ Found ${tenantCount} tenants`);
    
    const tenant = await Tenant.findOne();
    if (tenant) {
      console.log(`✓ Sample tenant: ${tenant.name} (${tenant.slug})`);
    }
    
    // Test User model
    console.log('\n👤 Testing User model...');
    const userCount = await User.countDocuments();
    console.log(`✓ Found ${userCount} users`);
    
    // Test Patient model
    console.log('\n🏥 Testing Patient model...');
    const patientCount = await Patient.countDocuments();
    console.log(`✓ Found ${patientCount} patients`);
    
    // Test Appointment model
    console.log('\n📅 Testing Appointment model...');
    const appointmentCount = await Appointment.countDocuments();
    console.log(`✓ Found ${appointmentCount} appointments`);
    
    // Create a test user
    console.log('\n➕ Creating test user...');
    const testTenant = await Tenant.findOne();
    if (testTenant) {
      const testUser = new User({
        tenant_id: testTenant._id,
        first_name: 'Test',
        last_name: 'Doctor',
        email: 'test@doctor.com',
        password_hash: 'hashed_password',
        salt: 'test_salt',
        role: 'doctor'
      });
      
      await testUser.save();
      console.log(`✓ Created test user: ${testUser.full_name}`);
      
      // Clean up test user
      await User.deleteOne({ _id: testUser._id });
      console.log('✓ Cleaned up test user');
    }
    
    // Get database stats
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    console.log('\n📊 Database Statistics:');
    console.log(`- Database: ${db.databaseName}`);
    console.log(`- Collections: ${stats.collections}`);
    console.log(`- Data Size: ${Math.round(stats.dataSize / 1024)} KB`);
    console.log(`- Index Size: ${Math.round(stats.indexSize / 1024)} KB`);
    
    console.log('\n🎉 All tests passed! MongoDB is ready for your clinic management system.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testConnection();
}

module.exports = testConnection;
