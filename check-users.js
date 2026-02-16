require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('./models/User');
const Tenant = require('./models/Tenant');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const users = await User.find({}).populate('tenant_id');
    
    console.log(`\nFound ${users.length} users:\n`);
    
    users.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Tenant: ${user.tenant_id?.name || 'N/A'}`);
      console.log(`  Active: ${user.is_active}`);
      console.log('');
    });
    
    // Test login credentials
    const adminUser = users.find(u => u.email === 'admin@citymedical.com');
    if (adminUser) {
      console.log('✅ Admin user found - credentials should work');
      console.log('   Email: admin@citymedical.com');
      console.log('   Password: admin123');
      console.log('   Tenant Slug: city-medical-center');
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkUsers();
