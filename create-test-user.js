require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const Tenant = require('./models/Tenant');
    
    // Find tenant
    const tenant = await Tenant.findBySlug('city-medical-center');
    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }
    
    // Delete existing admin user
    await User.deleteOne({ email: 'admin@city-medical-center.com' });
    
    // Create new admin user with known password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const user = new User({
      tenant_id: tenant._id,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@city-medical-center.com',
      password_hash: 'admin123', // Let the pre-save middleware hash it
      salt: 'admin_salt',
      role: 'admin'
    });
    
    await user.save();
    
    console.log('✅ Created test admin user');
    console.log('   Email: admin@city-medical-center.com');
    console.log('   Password: admin123');
    console.log('   Tenant Slug: city-medical-center');
    
    // Test login
    const testUser = await User.findOne({ 
      email: 'admin@city-medical-center.com',
      tenant_id: tenant._id 
    });
    
    const isMatch = await bcrypt.compare('admin123', testUser.password_hash);
    console.log('Password verification:', isMatch ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createTestUser();
