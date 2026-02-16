// Database Seeding Script for Clinic Management SaaS
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const Tenant = require('./models/Tenant');
const Role = require('./models/Role');
const Clinic = require('./models/Clinic');
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabTest = require('./models/LabTest');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');

// Helper function to generate random data
const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];
const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

// Sample data
const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Mary'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
const streets = ['Main St', 'Oak Ave', 'Elm St', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Washington Blvd', 'Park Ave'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'FL', 'GA'];
const medications = ['Amoxicillin', 'Ibuprofen', 'Lisinopril', 'Metformin', 'Atorvastatin', 'Albuterol', 'Omeprazole', 'Losartan'];
const labTestNames = ['Complete Blood Count', 'Comprehensive Metabolic Panel', 'Lipid Panel', 'Hemoglobin A1c', 'Urinalysis', 'Chest X-ray', 'Electrocardiogram', 'MRI', 'CT Scan', 'Ultrasound'];

async function seedDatabase() {
    try {
        console.log('🔄 Starting database seeding...');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Clear existing data (optional - comment out if you want to preserve data)
        console.log('🗑️  Clearing existing data...');
        await Promise.all([
            Payment.deleteMany({}),
            Invoice.deleteMany({}),
            LabTest.deleteMany({}),
            Prescription.deleteMany({}),
            MedicalRecord.deleteMany({}),
            Appointment.deleteMany({}),
            Patient.deleteMany({}),
            User.deleteMany({}),
            Clinic.deleteMany({}),
            Role.deleteMany({}),
            Tenant.deleteMany({})
        ]);
        
        // 1. Create Tenants
        console.log('📋 Creating tenants...');
        const tenants = [];
        
        const tenantData = [
            {
                name: 'City Medical Center',
                slug: 'city-medical-center',
                email: 'info@citymedical.com',
                phone: '+1-555-0101',
                address: '123 Healthcare Blvd',
                city: 'New York',
                state: 'NY',
                country: 'USA',
                postal_code: '10001',
                subscription_plan: 'professional',
                max_users: 50,
                max_patients: 5000
            },
            {
                name: 'Family Health Clinic',
                slug: 'family-health-clinic',
                email: 'contact@familyhealth.com',
                phone: '+1-555-0102',
                address: '456 Wellness Ave',
                city: 'Los Angeles',
                state: 'CA',
                country: 'USA',
                postal_code: '90001',
                subscription_plan: 'basic',
                max_users: 20,
                max_patients: 2000
            }
        ];
        
        for (const data of tenantData) {
            const tenant = new Tenant(data);
            await tenant.save();
            tenants.push(tenant);
            console.log(`✓ Created tenant: ${tenant.name}`);
        }
        
        // 2. Create Roles for each tenant
        console.log('👥 Creating roles...');
        for (const tenant of tenants) {
            await Role.createDefaultRoles(tenant._id);
            console.log(`✓ Created default roles for ${tenant.name}`);
        }
        
        // 3. Create Clinics
        console.log('🏥 Creating clinics...');
        const clinics = [];
        
        for (const tenant of tenants) {
            const clinicCount = randomNumber(1, 3);
            for (let i = 0; i < clinicCount; i++) {
                const clinic = new Clinic({
                    tenant_id: tenant._id,
                    name: `${tenant.name} - Location ${i + 1}`,
                    contact: {
                        phone: `+1-555-01${(i + 1) * 10}`,
                        email: `location${i + 1}@${tenant.slug}.com`
                    },
                    address: {
                        street: `${randomNumber(100, 999)} ${randomChoice(streets)}`,
                        city: randomChoice(cities),
                        state: randomChoice(states),
                        postal_code: String(randomNumber(10000, 99999))
                    },
                    settings: {
                        timezone: 'America/New_York',
                        currency: 'USD'
                    }
                });
                await clinic.save();
                clinics.push(clinic);
                console.log(`✓ Created clinic: ${clinic.name}`);
            }
        }
        
        // 4. Create Users
        console.log('👤 Creating users...');
        const users = [];
        const roles = await Role.find({ tenant_id: tenants[0]._id });
        
        for (const tenant of tenants) {
            const tenantRoles = await Role.find({ tenant_id: tenant._id });
            const tenantClinics = clinics.filter(c => c.tenant_id.toString() === tenant._id.toString());
            
            // Create admin user
            const adminRole = tenantRoles.find(r => r.name === 'Super Admin');
            const adminUser = new User({
                tenant_id: tenant._id,
                role_id: adminRole._id,
                first_name: 'Admin',
                last_name: 'User',
                email: `admin@${tenant.slug}.com`,
                password_hash: await bcrypt.hash('admin123', 12),
                salt: 'admin_salt',
                role: 'admin'
            });
            await adminUser.save();
            users.push(adminUser);
            
            // Create doctors
            const doctorRole = tenantRoles.find(r => r.name === 'Doctor');
            for (let i = 0; i < 3; i++) {
                const doctor = new User({
                    tenant_id: tenant._id,
                    role_id: doctorRole._id,
                    clinic_id: randomChoice(tenantClinics)._id,
                    first_name: randomChoice(['Dr. ', '']) + randomChoice(firstNames),
                    last_name: randomChoice(lastNames),
                    email: `doctor${i + 1}@${tenant.slug}.com`,
                    password_hash: await bcrypt.hash('doctor123', 12),
                    salt: 'doctor_salt',
                    role: 'doctor'
                });
                await doctor.save();
                users.push(doctor);
            }
            
            // Create staff
            const staffRole = tenantRoles.find(r => r.name === 'Receptionist');
            for (let i = 0; i < 2; i++) {
                const staff = new User({
                    tenant_id: tenant._id,
                    role_id: staffRole._id,
                    clinic_id: randomChoice(tenantClinics)._id,
                    first_name: randomChoice(firstNames),
                    last_name: randomChoice(lastNames),
                    email: `staff${i + 1}@${tenant.slug}.com`,
                    password_hash: await bcrypt.hash('staff123', 12),
                    salt: 'staff_salt',
                    role: 'staff'
                });
                await staff.save();
                users.push(staff);
            }
        }
        
        console.log(`✓ Created ${users.length} users`);
        
        // 5. Create Patients
        console.log('🏥 Creating patients...');
        const patients = [];
        
        for (const tenant of tenants) {
            const tenantClinics = clinics.filter(c => c.tenant_id.toString() === tenant._id.toString());
            const patientCount = randomNumber(20, 50);
            
            for (let i = 0; i < patientCount; i++) {
                const patient = new Patient({
                    tenant_id: tenant._id,
                    clinic_id: randomChoice(tenantClinics)._id,
                    patient_id: `PT-${tenant.slug.toUpperCase()}-${String(i + 1).padStart(4, '0')}`,
                    first_name: randomChoice(firstNames),
                    last_name: randomChoice(lastNames),
                    email: `patient${i + 1}@example.com`,
                    phone: `+1-555-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
                    date_of_birth: randomDate(new Date(1950, 0, 1), new Date(2000, 11, 31)),
                    gender: randomChoice(['male', 'female']),
                    address: `${randomNumber(100, 999)} ${randomChoice(streets)}`,
                    city: randomChoice(cities),
                    state: randomChoice(states),
                    postal_code: String(randomNumber(10000, 99999)),
                    emergency_contact: {
                        name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
                        phone: `+1-555-${randomNumber(100, 999)}-${randomNumber(1000, 9999)}`,
                        relationship: randomChoice(['Spouse', 'Parent', 'Sibling', 'Friend'])
                    },
                    medical_info: {
                        blood_group: randomChoice(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']),
                        allergies: randomChoice(['None', 'Penicillin', 'Latex', 'Pollen', 'Nuts']),
                        medical_history: randomChoice(['None', 'Hypertension', 'Diabetes', 'Asthma', 'Heart Disease'])
                    }
                });
                await patient.save();
                patients.push(patient);
            }
        }
        
        console.log(`✓ Created ${patients.length} patients`);
        
        // 6. Create Appointments
        console.log('📅 Creating appointments...');
        const appointments = [];
        const doctors = users.filter(u => u.role === 'doctor');
        
        for (let i = 0; i < 100; i++) {
            const patient = randomChoice(patients);
            const doctor = randomChoice(doctors.filter(d => d.tenant_id.toString() === patient.tenant_id.toString()));
            const startTime = randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31));
            const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes
            
            const appointment = new Appointment({
                tenant_id: patient.tenant_id,
                clinic_id: patient.clinic_id,
                patient_id: patient._id,
                doctor_id: doctor._id,
                appointment_number: `APT-${String(i + 1).padStart(6, '0')}`,
                title: randomChoice(['General Checkup', 'Follow-up', 'Consultation', 'Urgent Care']),
                description: 'Regular appointment',
                start_time: startTime,
                end_time: endTime,
                duration_minutes: 30,
                status: randomChoice(['scheduled', 'confirmed', 'completed', 'cancelled']),
                created_by: doctor._id
            });
            await appointment.save();
            appointments.push(appointment);
        }
        
        console.log(`✓ Created ${appointments.length} appointments`);
        
        // 7. Create Medical Records
        console.log('📋 Creating medical records...');
        const medicalRecords = [];
        const completedAppointments = appointments.filter(a => a.status === 'completed');
        
        for (const appointment of completedAppointments.slice(0, 50)) {
            const record = new MedicalRecord({
                tenant_id: appointment.tenant_id,
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id,
                appointment_id: appointment._id,
                record_number: `MR-${String(medicalRecords.length + 1).padStart(6, '0')}`,
                visit_info: {
                    visit_type: randomChoice(['new', 'follow_up', 'consultation']),
                    chief_complaint: randomChoice(['Headache', 'Chest Pain', 'Fever', 'Cough', 'Fatigue', 'Abdominal Pain'])
                },
                vital_signs: {
                    blood_pressure: {
                        systolic: randomNumber(110, 140),
                        diastolic: randomNumber(70, 90)
                    },
                    heart_rate: randomNumber(60, 100),
                    temperature: randomNumber(36, 38),
                    weight: randomNumber(120, 200)
                },
                diagnosis: [{
                    type: 'primary',
                    description: randomChoice(['Hypertension', 'Diabetes Type 2', 'Upper Respiratory Infection', 'Gastroenteritis'])
                }],
                treatment_plan: {
                    plan: 'Continue current treatment and follow up in 1 month',
                    follow_up: {
                        required: true,
                        duration: '1 month'
                    }
                },
                status: 'completed',
                created_by: appointment.doctor_id
            });
            await record.save();
            medicalRecords.push(record);
        }
        
        console.log(`✓ Created ${medicalRecords.length} medical records`);
        
        // 8. Create Prescriptions
        console.log('💊 Creating prescriptions...');
        const prescriptions = [];
        
        for (const record of medicalRecords.slice(0, 30)) {
            const prescription = new Prescription({
                tenant_id: record.tenant_id,
                patient_id: record.patient_id,
                doctor_id: record.doctor_id,
                medical_record_id: record._id,
                prescription_number: `RX-${String(prescriptions.length + 1).padStart(6, '0')}`,
                medication: {
                    name: randomChoice(medications),
                    form: randomChoice(['tablet', 'capsule', 'liquid'])
                },
                dosage: {
                    amount: `${randomNumber(1, 2)} ${randomChoice(['tablet', 'capsule'])}`,
                    frequency: randomChoice(['once daily', 'twice daily', 'three times daily']),
                    duration: `${randomNumber(7, 30)} days`
                },
                prescribing_info: {
                    quantity_prescribed: randomNumber(14, 60),
                    refills_authorized: randomNumber(0, 3)
                },
                status: 'active'
            });
            await prescription.save();
            prescriptions.push(prescription);
        }
        
        console.log(`✓ Created ${prescriptions.length} prescriptions`);
        
        // 9. Create Lab Tests
        console.log('🔬 Creating lab tests...');
        const labTests = [];
        
        for (let i = 0; i < 80; i++) {
            const patient = randomChoice(patients);
            const doctor = randomChoice(doctors.filter(d => d.tenant_id.toString() === patient.tenant_id.toString()));
            
            const labTest = new LabTest({
                tenant_id: patient.tenant_id,
                patient_id: patient._id,
                doctor_id: doctor._id,
                test_number: `LAB-${String(i + 1).padStart(6, '0')}`,
                test_info: {
                    name: randomChoice(labTestNames),
                    category: randomChoice(['blood', 'imaging', 'other']),
                    type: 'Routine',
                    description: 'Routine test'
                },
                specimen: {
                    type: randomChoice(['blood', 'urine', 'swab']),
                    collected_at: new Date()
                },
                ordering_info: {
                    ordered_by: doctor._id,
                    urgency: randomChoice(['routine', 'stat'])
                },
                status: randomChoice(['ordered', 'specimen_collected', 'received', 'in_progress', 'completed'])
            });
            await labTest.save();
            labTests.push(labTest);
        }
        
        console.log(`✓ Created ${labTests.length} lab tests`);
        
        // 10. Create Invoices
        console.log('💰 Creating invoices...');
        const invoices = [];
        
        for (let i = 0; i < 60; i++) {
            const patient = randomChoice(patients);
            
            const invoice = new Invoice({
                tenant_id: patient.tenant_id,
                patient_id: patient._id,
                invoice_number: `INV-${String(i + 1).padStart(6, '0')}`,
                invoice_info: {
                    issue_date: randomDate(new Date(2024, 0, 1), new Date()),
                    due_date: randomDate(new Date(2024, 0, 1), new Date(2024, 11, 31))
                },
                items: [{
                    type: 'consultation',
                    description: 'General Consultation',
                    quantity: 1,
                    unit_price: randomNumber(100, 300),
                    total: 0
                }],
                totals: {
                    subtotal: 0,
                    total_amount: 0,
                    balance_due: 0
                },
                status: randomChoice(['draft', 'sent', 'paid', 'overdue']),
                created_by: randomChoice(users.filter(u => u.tenant_id.toString() === patient.tenant_id.toString()))._id
            });
            
            // Calculate totals (will be done by pre-save middleware)
            await invoice.save();
            invoices.push(invoice);
        }
        
        console.log(`✓ Created ${invoices.length} invoices`);
        
        // 11. Create Payments
        console.log('💳 Creating payments...');
        const payments = [];
        
        for (const invoice of invoices.filter(inv => inv.status === 'paid')) {
            const payment = new Payment({
                tenant_id: invoice.tenant_id,
                patient_id: invoice.patient_id,
                invoice_id: invoice._id,
                payment_number: `PAY-${String(payments.length + 1).padStart(6, '0')}`,
                payment_info: {
                    amount: invoice.totals.total_amount,
                    method: randomChoice(['cash', 'credit_card', 'check'])
                },
                status: 'completed',
                created_by: randomChoice(users.filter(u => u.tenant_id.toString() === invoice.tenant_id.toString()))._id
            });
            await payment.save();
            payments.push(payment);
        }
        
        console.log(`✓ Created ${payments.length} payments`);
        
        // Summary
        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`- Tenants: ${tenants.length}`);
        console.log(`- Clinics: ${clinics.length}`);
        console.log(`- Users: ${users.length}`);
        console.log(`- Patients: ${patients.length}`);
        console.log(`- Appointments: ${appointments.length}`);
        console.log(`- Medical Records: ${medicalRecords.length}`);
        console.log(`- Prescriptions: ${prescriptions.length}`);
        console.log(`- Lab Tests: ${labTests.length}`);
        console.log(`- Invoices: ${invoices.length}`);
        console.log(`- Payments: ${payments.length}`);
        
        console.log('\n🔑 Login Credentials:');
        console.log('Admin: admin@citymedical.com / admin123');
        console.log('Doctor: doctor1@citymedical.com / doctor123');
        console.log('Staff: staff1@citymedical.com / staff123');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
