require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function debugLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const Tenant = require('./models/Tenant');
    
    // Find tenant
    const tenant = await Tenant.findBySlug('city-medical-center');
    console.log('Tenant:', tenant ? tenant.name : 'Not found');
    
    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }
    
    // Find user
    const user = await User.findOne({ 
      email: 'admin@city-medical-center.com', 
      tenant_id: tenant._id,
      deleted_at: null 
    });
    
    console.log('User:', user ? user.first_name + ' ' + user.last_name : 'Not found');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('User is_active:', user.is_active);
    console.log('Password hash exists:', !!user.password_hash);
    
    // Test password comparison
    const isMatch = await bcrypt.compare('admin123', user.password_hash);
    console.log('Password match:', isMatch);
    
    if (isMatch) {
      console.log('✅ Login should work!');
    } else {
      console.log('❌ Password does not match');
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

debugLogin();
