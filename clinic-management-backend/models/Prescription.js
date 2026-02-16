const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    patient_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: true
    },
    doctor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medical_record_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MedicalRecord'
    },
    prescription_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    medication: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        generic_name: {
            type: String,
            trim: true
        },
        brand_name: {
            type: String,
            trim: true
        },
        strength: {
            type: String,
            trim: true
        },
        form: {
            type: String,
            enum: ['tablet', 'capsule', 'liquid', 'injection', 'ointment', 'cream', 'inhaler', 'patch', 'suppository', 'other'],
            required: true
        },
        ndc_code: {
            type: String,
            trim: true
        }
    },
    dosage: {
        amount: {
            type: String,
            required: true,
            trim: true
        },
        frequency: {
            type: String,
            required: true,
            trim: true
        },
        duration: {
            type: String,
            required: true,
            trim: true
        },
        route: {
            type: String,
            enum: ['oral', 'topical', 'injection', 'inhalation', 'intravenous', 'intramuscular', 'subcutaneous', 'rectal', 'ocular', 'aural', 'nasal', 'other'],
            default: 'oral'
        },
        timing: {
            type: String,
            trim: true
        }
    },
    instructions: {
        patient_instructions: {
            type: String,
            trim: true
        },
        special_instructions: {
            type: String,
            trim: true
        },
        warning_notes: {
            type: String,
            trim: true
        }
    },
    prescribing_info: {
        quantity_prescribed: {
            type: Number,
            required: true,
            min: 1
        },
        refills_authorized: {
            type: Number,
            min: 0,
            default: 0
        },
        refills_used: {
            type: Number,
            min: 0,
            default: 0
        },
        date_prescribed: {
            type: Date,
            default: Date.now
        },
        expires_date: {
            type: Date
        },
        prn: {
            type: Boolean,
            default: false
        },
        controlled_substance: {
            type: Boolean,
            default: false
        },
        dea_schedule: {
            type: String,
            enum: ['II', 'III', 'IV', 'V']
        }
    },
    pharmacy: {
        name: {
            type: String,
            trim: true
        },
        phone: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        },
        fax: {
            type: String,
            trim: true
        }
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'discontinued', 'on_hold', 'expired'],
        default: 'active'
    },
    discontinuation_info: {
        reason: {
            type: String,
            trim: true
        },
        discontinued_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        discontinued_at: {
            type: Date
        }
    },
    fulfillment_history: [{
        filled_date: {
            type: Date,
            required: true
        },
        quantity_dispensed: {
            type: Number,
            required: true,
            min: 1
        },
        pharmacy_name: {
            type: String,
            trim: true
        },
        pharmacist_name: {
            type: String,
            trim: true
        },
        prescription_number_pharmacy: {
            type: String,
            trim: true
        },
        refills_remaining: {
            type: Number,
            min: 0
        }
    }],
    notes: {
        clinical: {
            type: String,
            trim: true
        },
        administrative: {
            type: String,
            trim: true
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
    collection: 'prescriptions'
});

// Compound unique index for tenant_id and prescription_number
prescriptionSchema.index({ tenant_id: 1, prescription_number: 1 }, { unique: true });
prescriptionSchema.index({ tenant_id: 1 });
prescriptionSchema.index({ patient_id: 1 });
prescriptionSchema.index({ doctor_id: 1 });
prescriptionSchema.index({ medical_record_id: 1 });
prescriptionSchema.index({ tenant_id: 1, patient_id: 1, status: 1 });
prescriptionSchema.index({ tenant_id: 1, doctor_id: 1, status: 1 });
prescriptionSchema.index({ tenant_id: 1, is_active: 1 });
prescriptionSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for patient info
prescriptionSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for doctor info
prescriptionSchema.virtual('doctor_info', {
    ref: 'User',
    localField: 'doctor_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for refills remaining
prescriptionSchema.virtual('refills_remaining').get(function() {
    return this.prescribing_info.refills_authorized - this.prescribing_info.refills_used;
});

// Virtual for days until expiration
prescriptionSchema.virtual('days_until_expiration').get(function() {
    if (!this.prescribing_info.expires_date) return null;
    const today = new Date();
    const expiresDate = new Date(this.prescribing_info.expires_date);
    const diffTime = expiresDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static methods
prescriptionSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('doctor_id', 'first_name last_name')
        .sort({ created_at: -1 });
};

prescriptionSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    })
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

prescriptionSchema.statics.findByDoctor = function(tenantId, doctorId) {
    return this.find({ 
        tenant_id: tenantId, 
        doctor_id: doctorId, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ created_at: -1 });
};

prescriptionSchema.statics.findActive = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        status: 'active', 
        is_active: true, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

prescriptionSchema.statics.findControlledSubstances = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        'prescribing_info.controlled_substance': true, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

prescriptionSchema.statics.findExpiringSoon = function(tenantId, days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.find({
        tenant_id: tenantId,
        status: 'active',
        'prescribing_info.expires_date': { $lte: futureDate },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'prescribing_info.expires_date': 1 });
};

prescriptionSchema.statics.searchPrescriptions = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { prescription_number: new RegExp(searchTerm, 'i') },
            { 'medication.name': new RegExp(searchTerm, 'i') },
            { 'medication.brand_name': new RegExp(searchTerm, 'i') },
            { 'medication.generic_name': new RegExp(searchTerm, 'i') }
        ]
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

// Instance methods
prescriptionSchema.methods.discontinue = function(reason, discontinuedBy) {
    this.status = 'discontinued';
    this.discontinuation_info.reason = reason;
    this.discontinuation_info.discontinued_by = discontinuedBy;
    this.discontinuation_info.discontinued_at = new Date();
    this.is_active = false;
    return this.save();
};

prescriptionSchema.methods.complete = function() {
    this.status = 'completed';
    this.is_active = false;
    return this.save();
};

prescriptionSchema.methods.putOnHold = function() {
    this.status = 'on_hold';
    return this.save();
};

prescriptionSchema.methods.activate = function() {
    this.status = 'active';
    this.is_active = true;
    return this.save();
};

prescriptionSchema.methods.addFulfillment = function(fulfillmentData) {
    this.fulfillment_history.push(fulfillmentData);
    
    // Update refills used if applicable
    if (fulfillmentData.refills_remaining !== undefined) {
        this.prescribing_info.refills_used = this.prescribing_info.refills_authorized - fulfillmentData.refills_remaining;
    }
    
    // Check if all refills are used
    if (this.prescribing_info.refills_used >= this.prescribing_info.refills_authorized) {
        this.status = 'completed';
        this.is_active = false;
    }
    
    return this.save();
};

prescriptionSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

prescriptionSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

// Pre-save middleware
prescriptionSchema.pre('save', function(next) {
    // Set expiration date if not provided (typically 1 year from prescription date)
    if (!this.prescribing_info.expires_date && this.prescribing_info.date_prescribed) {
        const expiresDate = new Date(this.prescribing_info.date_prescribed);
        expiresDate.setFullYear(expiresDate.getFullYear() + 1);
        this.prescribing_info.expires_date = expiresDate;
    }
    
    next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
