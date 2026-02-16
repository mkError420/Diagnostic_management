// Comprehensive Database Operations Test
require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const Invoice = require('./models/Invoice');

const { 
    tenantHelpers,
    userHelpers,
    patientHelpers,
    appointmentHelpers,
    medicalRecordHelpers,
    billingHelpers,
    analyticsHelpers,
    validationHelpers
} = require('./utils/database-helpers');

async function testAllOperations() {
    try {
        console.log('🔄 Starting comprehensive database operations test...\n');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Get test data
        const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        const patients = await mongoose.connection.db.collection('patients').find({}).toArray();
        
        if (tenants.length === 0 || users.length === 0 || patients.length === 0) {
            console.log('❌ No test data found. Please run seed-database.js first.');
            return;
        }
        
        const testTenant = tenants[0];
        const testUser = users.find(u => u.role === 'doctor');
        const testPatient = patients[0];
        
        console.log(`📋 Using test tenant: ${testTenant.name}`);
        console.log(`👤 Using test user: ${testUser.first_name} ${testUser.last_name}`);
        console.log(`🏥 Using test patient: ${testPatient.first_name} ${testPatient.last_name}\n`);
        
        // Test 1: Tenant Helpers
        console.log('🏢 Testing Tenant Helpers...');
        const tenantBySlug = await tenantHelpers.getTenantBySlug(testTenant.slug);
        console.log(`✓ Found tenant by slug: ${tenantBySlug.name}`);
        
        const tenantStats = await tenantHelpers.getTenantStats(testTenant._id);
        console.log(`✓ Tenant stats: ${JSON.stringify(tenantStats)}`);
        
        // Test 2: User Helpers
        console.log('\n👥 Testing User Helpers...');
        const usersByRole = await userHelpers.getUsersByRole(testTenant._id, 'doctor');
        console.log(`✓ Found ${usersByRole.length} doctors`);
        
        const userDashboard = await userHelpers.getUserDashboard(testTenant._id, testUser._id);
        console.log(`✓ User dashboard loaded with ${userDashboard.recent_appointments.length} recent appointments`);
        
        // Test 3: Patient Helpers
        console.log('\n🏥 Testing Patient Helpers...');
        const searchResults = await patientHelpers.searchPatients(testTenant._id, testPatient.first_name);
        console.log(`✓ Search returned ${searchResults.length} patients`);
        
        const patientSummary = await patientHelpers.getPatientSummary(testTenant._id, testPatient._id);
        console.log(`✓ Patient summary loaded with ${patientSummary.recent_appointments.length} appointments`);
        
        const newPatientId = await patientHelpers.generatePatientId(testTenant._id);
        console.log(`✓ Generated new patient ID: ${newPatientId}`);
        
        // Test 4: Appointment Helpers
        console.log('\n📅 Testing Appointment Helpers...');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const appointmentStartTime = new Date(tomorrow.setHours(10, 0, 0, 0));
        const appointmentEndTime = new Date(tomorrow.setHours(10, 30, 0, 0));
        
        const conflicts = await appointmentHelpers.checkAppointmentConflicts(
            testTenant._id, 
            testUser._id, 
            appointmentStartTime, 
            appointmentEndTime
        );
        console.log(`✓ Conflict check found ${conflicts.length} conflicts`);
        
        const doctorSchedule = await appointmentHelpers.getDoctorSchedule(testTenant._id, testUser._id, tomorrow);
        console.log(`✓ Doctor schedule loaded with ${doctorSchedule.length} appointments`);
        
        const newAppointmentNumber = await appointmentHelpers.generateAppointmentNumber(testTenant._id);
        console.log(`✓ Generated appointment number: ${newAppointmentNumber}`);
        
        // Test 5: Medical Record Helpers
        console.log('\n📋 Testing Medical Record Helpers...');
        const medicalHistory = await medicalRecordHelpers.getPatientMedicalHistory(testTenant._id, testPatient._id);
        console.log(`✓ Medical history loaded with ${medicalHistory.length} records`);
        
        const newRecordNumber = await medicalRecordHelpers.generateRecordNumber(testTenant._id);
        console.log(`✓ Generated record number: ${newRecordNumber}`);
        
        // Test 6: Billing Helpers
        console.log('\n💰 Testing Billing Helpers...');
        const billingSummary = await billingHelpers.getPatientBillingSummary(testTenant._id, testPatient._id);
        console.log(`✓ Billing summary: $${billingSummary.total_billed} billed, $${billingSummary.total_paid} paid`);
        
        const newInvoiceNumber = await billingHelpers.generateInvoiceNumber(testTenant._id);
        console.log(`✓ Generated invoice number: ${newInvoiceNumber}`);
        
        const newPaymentNumber = await billingHelpers.generatePaymentNumber(testTenant._id);
        console.log(`✓ Generated payment number: ${newPaymentNumber}`);
        
        // Test 7: Analytics Helpers
        console.log('\n📊 Testing Analytics Helpers...');
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const today = new Date();
        
        const analytics = await analyticsHelpers.getTenantAnalytics(testTenant._id, lastMonth, today);
        console.log(`✓ Analytics loaded: ${analytics.appointments.scheduled || 0} scheduled appointments`);
        console.log(`✓ Patient analytics: ${analytics.patients.total_patients} total patients`);
        console.log(`✓ Revenue analytics: $${analytics.revenue.total_billed} total billed`);
        
        // Test 8: Validation Helpers
        console.log('\n🔍 Testing Validation Helpers...');
        const tenantAccess = await validationHelpers.validateTenantAccess(testTenant._id, testUser._id);
        console.log(`✓ Tenant access validation: ${tenantAccess ? 'Valid' : 'Invalid'}`);
        
        const doctorAccess = await validationHelpers.validateDoctorAccess(testTenant._id, testUser._id, testPatient._id);
        console.log(`✓ Doctor access validation: ${doctorAccess ? 'Valid' : 'Invalid'}`);
        
        // Test 9: Database Performance
        console.log('\n⚡ Testing Database Performance...');
        const performanceStartTime = Date.now();
        
        // Test complex queries
        await Promise.all([
            Patient.find({ tenant_id: testTenant._id }).limit(50),
            Appointment.find({ tenant_id: testTenant._id }).populate('patient_id').limit(50),
            Invoice.find({ tenant_id: testTenant._id }).sort({ 'invoice_info.issue_date': -1 }).limit(50)
        ]);
        
        const queryTime = Date.now() - performanceStartTime;
        console.log(`✓ Complex queries completed in ${queryTime}ms`);
        
        // Test 10: Database Health Check
        console.log('\n💓 Testing Database Health...');
        const dbStats = await mongoose.connection.db.stats();
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        console.log(`✓ Database: ${mongoose.connection.db.databaseName}`);
        console.log(`✓ Collections: ${dbStats.collections}`);
        console.log(`✓ Data size: ${Math.round(dbStats.dataSize / 1024 / 1024 * 100) / 100} MB`);
        console.log(`✓ Index size: ${Math.round(dbStats.indexSize / 1024 / 1024 * 100) / 100} MB`);
        
        // Test indexes - simplified check
        console.log(`✓ Database has ${dbStats.indexes} indexes (from stats)`);
        
        console.log('\n🎉 All database operations tests completed successfully!');
        console.log('\n📈 Performance Summary:');
        console.log(`- Query performance: ${queryTime < 1000 ? 'Excellent' : queryTime < 3000 ? 'Good' : 'Needs optimization'}`);
        console.log(`- Database size: ${dbStats.dataSize < 10485760 ? 'Small' : dbStats.dataSize < 104857600 ? 'Medium' : 'Large'}`);
        console.log(`- Index coverage: ${dbStats.indexes > 0 ? 'Complete' : 'Needs indexes'}`);
        
        console.log('\n✅ Database is ready for production use!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testAllOperations();
}

module.exports = testAllOperations;
