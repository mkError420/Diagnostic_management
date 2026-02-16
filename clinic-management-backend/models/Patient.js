const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    clinic_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    patient_id: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    first_name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    last_name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        lowercase: true,
        trim: true,
        maxlength: 255
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 50
    },
    date_of_birth: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        required: true
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true,
        maxlength: 100
    },
    state: {
        type: String,
        trim: true,
        maxlength: 100
    },
    country: {
        type: String,
        trim: true,
        maxlength: 100
    },
    postal_code: {
        type: String,
        trim: true,
        maxlength: 20
    },
    emergency_contact: {
        name: {
            type: String,
            trim: true,
            maxlength: 255
        },
        phone: {
            type: String,
            trim: true,
            maxlength: 50
        },
        relationship: {
            type: String,
            trim: true,
            maxlength: 100
        }
    },
    medical_info: {
        blood_group: {
            type: String,
            trim: true,
            maxlength: 10
        },
        allergies: {
            type: String,
            trim: true
        },
        medical_history: {
            type: String,
            trim: true
        },
        current_medications: [{
            name: String,
            dosage: String,
            frequency: String
        }]
    },
    insurance: {
        provider: {
            type: String,
            trim: true,
            maxlength: 255
        },
        policy_number: {
            type: String,
            trim: true,
            maxlength: 100
        },
        group_number: {
            type: String,
            trim: true,
            maxlength: 100
        }
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
    collection: 'patients'
});

// Compound unique index for tenant_id and patient_id
patientSchema.index({ tenant_id: 1, patient_id: 1 }, { unique: true });
patientSchema.index({ tenant_id: 1 });
patientSchema.index({ clinic_id: 1 });
patientSchema.index({ user_id: 1 });
patientSchema.index({ tenant_id: 1, first_name: 1, last_name: 1 });
patientSchema.index({ tenant_id: 1, is_active: 1 });
patientSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for full name
patientSchema.virtual('full_name').get(function() {
    return `${this.first_name} ${this.last_name}`;
});

// Virtual for age
patientSchema.virtual('age').get(function() {
    if (!this.date_of_birth) return null;
    const today = new Date();
    const birthDate = new Date(this.date_of_birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Virtual for emergency contact full info
patientSchema.virtual('emergency_contact_info').get(function() {
    if (!this.emergency_contact.name) return null;
    return `${this.emergency_contact.name} (${this.emergency_contact.relationship}) - ${this.emergency_contact.phone}`;
});

// Static methods
patientSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null });
};

patientSchema.statics.findByPatientId = function(tenantId, patientId) {
    return this.findOne({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    });
};

patientSchema.statics.findByName = function(tenantId, firstName, lastName) {
    const query = { tenant_id: tenantId, deleted_at: null };
    if (firstName) query.first_name = new RegExp(firstName, 'i');
    if (lastName) query.last_name = new RegExp(lastName, 'i');
    return this.find(query);
};

patientSchema.statics.searchPatients = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { first_name: new RegExp(searchTerm, 'i') },
            { last_name: new RegExp(searchTerm, 'i') },
            { patient_id: new RegExp(searchTerm, 'i') },
            { email: new RegExp(searchTerm, 'i') },
            { phone: new RegExp(searchTerm, 'i') }
        ]
    });
};

// Instance methods
patientSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

patientSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

patientSchema.methods.addMedication = function(medication) {
    if (!this.medical_info.current_medications) {
        this.medical_info.current_medications = [];
    }
    this.medical_info.current_medications.push(medication);
    return this.save();
};

patientSchema.methods.removeMedication = function(medicationId) {
    if (!this.medical_info.current_medications) return this;
    this.medical_info.current_medications = this.medical_info.current_medications.filter(
        med => med._id.toString() !== medicationId
    );
    return this.save();
};

// Pre-save middleware
patientSchema.pre('save', function(next) {
    // Normalize email
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    next();
});

// Pre-remove middleware
patientSchema.pre('remove', async function(next) {
    // Remove related records
    await mongoose.model('Appointment').deleteMany({ patient_id: this._id });
    await mongoose.model('MedicalRecord').deleteMany({ patient_id: this._id });
    await mongoose.model('Prescription').deleteMany({ patient_id: this._id });
    await mongoose.model('LabTest').deleteMany({ patient_id: this._id });
    await mongoose.model('Invoice').deleteMany({ patient_id: this._id });
    await mongoose.model('Payment').deleteMany({ patient_id: this._id });
    
    next();
});

module.exports = mongoose.model('Patient', patientSchema);
