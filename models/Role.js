const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true
    },
    permissions: {
        // Dashboard permissions
        dashboard: {
            view: { type: Boolean, default: false },
            analytics: { type: Boolean, default: false }
        },
        // Patient management
        patients: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        },
        // Appointment management
        appointments: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            cancel: { type: Boolean, default: false },
            manage_schedule: { type: Boolean, default: false }
        },
        // Medical records
        medical_records: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            export: { type: Boolean, default: false }
        },
        // Prescriptions
        prescriptions: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            print: { type: Boolean, default: false }
        },
        // Lab tests
        lab_tests: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            approve: { type: Boolean, default: false }
        },
        // Billing and invoices
        billing: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            process_payments: { type: Boolean, default: false },
            view_reports: { type: Boolean, default: false }
        },
        // User management
        users: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            manage_roles: { type: Boolean, default: false }
        },
        // Clinic management
        clinics: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            delete: { type: Boolean, default: false },
            manage_settings: { type: Boolean, default: false }
        },
        // Reports
        reports: {
            view: { type: Boolean, default: false },
            create: { type: Boolean, default: false },
            export: { type: Boolean, default: false },
            schedule: { type: Boolean, default: false }
        },
        // System settings
        settings: {
            view: { type: Boolean, default: false },
            edit: { type: Boolean, default: false },
            manage_integrations: { type: Boolean, default: false },
            view_logs: { type: Boolean, default: false }
        }
    },
    is_system_role: {
        type: Boolean,
        default: false
    },
    is_active: {
        type: Boolean,
        default: true
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'roles'
});

// Compound unique index for tenant_id and name
roleSchema.index({ tenant_id: 1, name: 1 }, { unique: true });
roleSchema.index({ tenant_id: 1 });
roleSchema.index({ tenant_id: 1, name: 1 });
roleSchema.index({ tenant_id: 1, is_active: 1 });
roleSchema.index({ tenant_id: 1, deleted_at: 1 });

// Static methods
roleSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .sort({ name: 1 });
};

roleSchema.statics.findActive = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        is_active: true, 
        deleted_at: null 
    })
    .sort({ name: 1 });
};

roleSchema.statics.findByName = function(tenantId, name) {
    return this.findOne({ 
        tenant_id: tenantId, 
        name: name, 
        deleted_at: null 
    });
};

roleSchema.statics.createDefaultRoles = function(tenantId) {
    const defaultRoles = [
        {
            tenant_id: tenantId,
            name: 'Super Admin',
            description: 'Full access to all features',
            permissions: {
                dashboard: { view: true, analytics: true },
                patients: { view: true, create: true, edit: true, delete: true, export: true },
                appointments: { view: true, create: true, edit: true, delete: true, cancel: true, manage_schedule: true },
                medical_records: { view: true, create: true, edit: true, delete: true, export: true },
                prescriptions: { view: true, create: true, edit: true, delete: true, print: true },
                lab_tests: { view: true, create: true, edit: true, delete: true, approve: true },
                billing: { view: true, create: true, edit: true, delete: true, process_payments: true, view_reports: true },
                users: { view: true, create: true, edit: true, delete: true, manage_roles: true },
                clinics: { view: true, create: true, edit: true, delete: true, manage_settings: true },
                reports: { view: true, create: true, export: true, schedule: true },
                settings: { view: true, edit: true, manage_integrations: true, view_logs: true }
            },
            is_system_role: true
        },
        {
            tenant_id: tenantId,
            name: 'Doctor',
            description: 'Medical practitioner with patient care access',
            permissions: {
                dashboard: { view: true, analytics: true },
                patients: { view: true, create: true, edit: true, export: true },
                appointments: { view: true, create: true, edit: true, cancel: true },
                medical_records: { view: true, create: true, edit: true, export: true },
                prescriptions: { view: true, create: true, edit: true, print: true },
                lab_tests: { view: true, create: true, edit: true, approve: true },
                billing: { view: true, view_reports: true },
                reports: { view: true, create: true, export: true }
            },
            is_system_role: true
        },
        {
            tenant_id: tenantId,
            name: 'Nurse',
            description: 'Healthcare assistant with limited medical access',
            permissions: {
                dashboard: { view: true },
                patients: { view: true, create: true, edit: true },
                appointments: { view: true, create: true, edit: true },
                medical_records: { view: true, create: true, edit: true },
                prescriptions: { view: true },
                lab_tests: { view: true, create: true, edit: true },
                billing: { view: true }
            },
            is_system_role: true
        },
        {
            tenant_id: tenantId,
            name: 'Receptionist',
            description: 'Front desk staff with administrative access',
            permissions: {
                dashboard: { view: true },
                patients: { view: true, create: true, edit: true },
                appointments: { view: true, create: true, edit: true, cancel: true, manage_schedule: true },
                medical_records: { view: true },
                prescriptions: { view: true },
                lab_tests: { view: true },
                billing: { view: true, create: true, edit: true, process_payments: true }
            },
            is_system_role: true
        },
        {
            tenant_id: tenantId,
            name: 'Patient',
            description: 'Patient with limited access to own records',
            permissions: {
                dashboard: { view: true },
                patients: { view: true },
                appointments: { view: true, create: true, edit: true, cancel: true },
                medical_records: { view: true },
                prescriptions: { view: true, print: true },
                lab_tests: { view: true },
                billing: { view: true }
            },
            is_system_role: true
        }
    ];

    return this.insertMany(defaultRoles);
};

// Instance methods
roleSchema.methods.hasPermission = function(module, action) {
    return this.permissions[module] && this.permissions[module][action] === true;
};

roleSchema.methods.updatePermissions = function(newPermissions) {
    this.permissions = { ...this.permissions, ...newPermissions };
    return this.save();
};

roleSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

roleSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

// Pre-remove middleware
roleSchema.pre('remove', async function(next) {
    // Update users with this role to have no role
    await mongoose.model('User').updateMany(
        { role_id: this._id },
        { $unset: { role_id: 1 } }
    );
    
    next();
});

module.exports = mongoose.model('Role', roleSchema);
