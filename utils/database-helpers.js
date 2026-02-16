// Database Helper Functions for Clinic Management SaaS
const mongoose = require('mongoose');

// Import models
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const LabTest = require('../models/LabTest');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

/**
 * Tenant-related helpers
 */
const tenantHelpers = {
    async getTenantBySlug(slug) {
        return await Tenant.findBySlug(slug);
    },
    
    async getTenantStats(tenantId) {
        const stats = await Promise.all([
            User.countDocuments({ tenant_id: tenantId, deleted_at: null }),
            Patient.countDocuments({ tenant_id: tenantId, deleted_at: null }),
            Appointment.countDocuments({ tenant_id: tenantId, deleted_at: null }),
            MedicalRecord.countDocuments({ tenant_id: tenantId, deleted_at: null }),
            Invoice.countDocuments({ tenant_id: tenantId, deleted_at: null })
        ]);
        
        return {
            users: stats[0],
            patients: stats[1],
            appointments: stats[2],
            medical_records: stats[3],
            invoices: stats[4]
        };
    }
};

/**
 * User-related helpers
 */
const userHelpers = {
    async authenticateUser(tenantId, email, password) {
        const user = await User.findByEmail(tenantId, email);
        if (!user) return null;
        
        const isMatch = await user.comparePassword(password);
        return isMatch ? user : null;
    },
    
    async getUsersByRole(tenantId, role) {
        return await User.findByRole(tenantId, role);
    },
    
    async getUserDashboard(tenantId, userId) {
        const user = await User.findById(userId);
        if (!user) return null;
        
        let dashboardData = {
            user: user,
            recent_appointments: [],
            upcoming_appointments: [],
            notifications: []
        };
        
        if (user.role === 'doctor') {
            dashboardData.recent_appointments = await Appointment.find({ 
                doctor_id: userId, 
                tenant_id: tenantId,
                deleted_at: null 
            })
            .populate('patient_id', 'first_name last_name')
            .sort({ start_time: -1 })
            .limit(5);
            
            dashboardData.upcoming_appointments = await Appointment.findUpcoming(tenantId, userId);
        } else if (user.role === 'patient') {
            const patient = await Patient.findOne({ user_id: userId, tenant_id: tenantId });
            if (patient) {
                dashboardData.recent_appointments = await Appointment.findByPatient(tenantId, patient._id)
                    .populate('doctor_id', 'first_name last_name')
                    .sort({ start_time: -1 })
                    .limit(5);
                    
                dashboardData.upcoming_appointments = await Appointment.find({
                    tenant_id: tenantId,
                    patient_id: patient._id,
                    start_time: { $gte: new Date() },
                    status: { $in: ['scheduled', 'confirmed'] },
                    deleted_at: null
                })
                .populate('doctor_id', 'first_name last_name')
                .sort({ start_time: 1 });
            }
        }
        
        return dashboardData;
    }
};

/**
 * Patient-related helpers
 */
const patientHelpers = {
    async searchPatients(tenantId, searchTerm) {
        return await Patient.searchPatients(tenantId, searchTerm);
    },
    
    async getPatientSummary(tenantId, patientId) {
        const patient = await Patient.findById(patientId);
        if (!patient || patient.tenant_id.toString() !== tenantId.toString()) {
            return null;
        }
        
        const [appointments, medicalRecords, prescriptions, labTests, invoices] = await Promise.all([
            Appointment.findByPatient(tenantId, patientId)
                .populate('doctor_id', 'first_name last_name')
                .sort({ start_time: -1 })
                .limit(10),
            MedicalRecord.findByPatient(tenantId, patientId)
                .populate('doctor_id', 'first_name last_name')
                .sort({ created_at: -1 })
                .limit(10),
            Prescription.findByPatient(tenantId, patientId)
                .sort({ created_at: -1 })
                .limit(10),
            LabTest.findByPatient(tenantId, patientId)
                .sort({ 'ordering_info.ordered_at': -1 })
                .limit(10),
            Invoice.findByPatient(tenantId, patientId)
                .sort({ 'invoice_info.issue_date': -1 })
                .limit(10)
        ]);
        
        return {
            patient,
            recent_appointments: appointments,
            medical_records: medicalRecords,
            prescriptions: prescriptions,
            lab_tests: labTests,
            invoices: invoices
        };
    },
    
    async generatePatientId(tenantId) {
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return null;
        
        const lastPatient = await Patient.findOne({ tenant_id: tenantId })
            .sort({ patient_id: -1 });
        
        let nextNumber = 1;
        if (lastPatient && lastPatient.patient_id) {
            const parts = lastPatient.patient_id.split('-');
            nextNumber = parseInt(parts[parts.length - 1]) + 1;
        }
        
        return `PT-${tenant.slug.toUpperCase()}-${String(nextNumber).padStart(4, '0')}`;
    }
};

/**
 * Appointment-related helpers
 */
const appointmentHelpers = {
    async checkAppointmentConflicts(tenantId, doctorId, startTime, endTime, excludeId = null) {
        return await Appointment.findConflicts(tenantId, doctorId, startTime, endTime, excludeId);
    },
    
    async getDoctorSchedule(tenantId, doctorId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        return await Appointment.find({
            tenant_id: tenantId,
            doctor_id: doctorId,
            start_time: { $gte: startOfDay, $lte: endOfDay },
            deleted_at: null
        })
        .populate('patient_id', 'first_name last_name')
        .sort({ start_time: 1 });
    },
    
    async generateAppointmentNumber(tenantId) {
        const lastAppointment = await Appointment.findOne({ tenant_id: tenantId })
            .sort({ appointment_number: -1 });
        
        let nextNumber = 1;
        if (lastAppointment && lastAppointment.appointment_number) {
            const parts = lastAppointment.appointment_number.split('-');
            nextNumber = parseInt(parts[parts.length - 1]) + 1;
        }
        
        return `APT-${String(nextNumber).padStart(6, '0')}`;
    }
};

/**
 * Medical record helpers
 */
const medicalRecordHelpers = {
    async getPatientMedicalHistory(tenantId, patientId) {
        return await MedicalRecord.findByPatient(tenantId, patientId)
            .populate('doctor_id', 'first_name last_name')
            .sort({ created_at: -1 });
    },
    
    async generateRecordNumber(tenantId) {
        const lastRecord = await MedicalRecord.findOne({ tenant_id: tenantId })
            .sort({ record_number: -1 });
        
        let nextNumber = 1;
        if (lastRecord && lastRecord.record_number) {
            const parts = lastRecord.record_number.split('-');
            nextNumber = parseInt(parts[parts.length - 1]) + 1;
        }
        
        return `MR-${String(nextNumber).padStart(6, '0')}`;
    }
};

/**
 * Billing helpers
 */
const billingHelpers = {
    async getPatientBillingSummary(tenantId, patientId) {
        const [invoices, payments] = await Promise.all([
            Invoice.findByPatient(tenantId, patientId),
            Payment.findByPatient(tenantId, patientId)
        ]);
        
        const totalBilled = invoices.reduce((sum, inv) => sum + inv.totals.total_amount, 0);
        const totalPaid = payments.reduce((sum, pay) => sum + pay.payment_info.amount, 0);
        const balanceDue = totalBilled - totalPaid;
        
        return {
            invoices,
            payments,
            total_billed: totalBilled,
            total_paid: totalPaid,
            balance_due: balanceDue
        };
    },
    
    async generateInvoiceNumber(tenantId) {
        const lastInvoice = await Invoice.findOne({ tenant_id: tenantId })
            .sort({ invoice_number: -1 });
        
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.invoice_number) {
            const parts = lastInvoice.invoice_number.split('-');
            nextNumber = parseInt(parts[parts.length - 1]) + 1;
        }
        
        return `INV-${String(nextNumber).padStart(6, '0')}`;
    },
    
    async generatePaymentNumber(tenantId) {
        const lastPayment = await Payment.findOne({ tenant_id: tenantId })
            .sort({ payment_number: -1 });
        
        let nextNumber = 1;
        if (lastPayment && lastPayment.payment_number) {
            const parts = lastPayment.payment_number.split('-');
            nextNumber = parseInt(parts[parts.length - 1]) + 1;
        }
        
        return `PAY-${String(nextNumber).padStart(6, '0')}`;
    }
};

/**
 * Analytics helpers
 */
const analyticsHelpers = {
    async getTenantAnalytics(tenantId, startDate, endDate) {
        const [appointmentStats, patientStats, revenueStats] = await Promise.all([
            this.getAppointmentAnalytics(tenantId, startDate, endDate),
            this.getPatientAnalytics(tenantId, startDate, endDate),
            this.getRevenueAnalytics(tenantId, startDate, endDate)
        ]);
        
        return {
            appointments: appointmentStats,
            patients: patientStats,
            revenue: revenueStats
        };
    },
    
    async getAppointmentAnalytics(tenantId, startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    tenant_id: new mongoose.Types.ObjectId(tenantId),
                    start_time: { $gte: startDate, $lte: endDate },
                    deleted_at: null
                }
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ];
        
        const results = await Appointment.aggregate(pipeline);
        const stats = {};
        results.forEach(result => {
            stats[result._id] = result.count;
        });
        
        return stats;
    },
    
    async getPatientAnalytics(tenantId, startDate, endDate) {
        const [newPatients, totalPatients] = await Promise.all([
            Patient.countDocuments({
                tenant_id: tenantId,
                created_at: { $gte: startDate, $lte: endDate },
                deleted_at: null
            }),
            Patient.countDocuments({
                tenant_id: tenantId,
                deleted_at: null
            })
        ]);
        
        return {
            new_patients: newPatients,
            total_patients: totalPatients
        };
    },
    
    async getRevenueAnalytics(tenantId, startDate, endDate) {
        const pipeline = [
            {
                $match: {
                    tenant_id: new mongoose.Types.ObjectId(tenantId),
                    'invoice_info.issue_date': { $gte: startDate, $lte: endDate },
                    deleted_at: null
                }
            },
            {
                $group: {
                    _id: null,
                    total_billed: { $sum: '$totals.total_amount' },
                    total_paid: { $sum: '$totals.paid_amount' },
                    invoice_count: { $sum: 1 }
                }
            }
        ];
        
        const result = await Invoice.aggregate(pipeline);
        return result[0] || {
            total_billed: 0,
            total_paid: 0,
            invoice_count: 0
        };
    }
};

/**
 * Data validation helpers
 */
const validationHelpers = {
    async validateTenantAccess(tenantId, userId) {
        const user = await User.findById(userId);
        return user && user.tenant_id.toString() === tenantId.toString();
    },
    
    async validateDoctorAccess(tenantId, doctorId, patientId = null) {
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.tenant_id.toString() !== tenantId.toString()) {
            return false;
        }
        
        if (patientId) {
            const patient = await Patient.findById(patientId);
            return patient && patient.tenant_id.toString() === tenantId.toString();
        }
        
        return true;
    }
};

module.exports = {
    tenantHelpers,
    userHelpers,
    patientHelpers,
    appointmentHelpers,
    medicalRecordHelpers,
    billingHelpers,
    analyticsHelpers,
    validationHelpers
};
