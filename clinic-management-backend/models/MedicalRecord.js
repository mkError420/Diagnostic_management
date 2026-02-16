const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
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
    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    record_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    visit_info: {
        visit_type: {
            type: String,
            enum: ['new', 'follow_up', 'emergency', 'consultation', 'routine'],
            required: true
        },
        chief_complaint: {
            type: String,
            required: true,
            trim: true
        },
        history_of_present_illness: {
            type: String,
            trim: true
        },
        duration_of_illness: {
            type: String,
            trim: true
        }
    },
    vital_signs: {
        blood_pressure: {
            systolic: { type: Number, min: 0, max: 300 },
            diastolic: { type: Number, min: 0, max: 200 }
        },
        heart_rate: {
            type: Number,
            min: 0,
            max: 300
        },
        respiratory_rate: {
            type: Number,
            min: 0,
            max: 100
        },
        temperature: {
            type: Number,
            min: 0,
            max: 50
        },
        oxygen_saturation: {
            type: Number,
            min: 0,
            max: 100
        },
        height: {
            type: Number,
            min: 0
        },
        weight: {
            type: Number,
            min: 0
        },
        bmi: {
            type: Number,
            min: 0
        }
    },
    examination: {
        general: {
            type: String,
            trim: true
        },
        heent: {
            type: String,
            trim: true
        },
        cardiovascular: {
            type: String,
            trim: true
        },
        respiratory: {
            type: String,
            trim: true
        },
        gastrointestinal: {
            type: String,
            trim: true
        },
        musculoskeletal: {
            type: String,
            trim: true
        },
        neurological: {
            type: String,
            trim: true
        },
        skin: {
            type: String,
            trim: true
        },
        other: {
            type: String,
            trim: true
        }
    },
    diagnosis: [{
        type: {
            type: String,
            enum: ['primary', 'secondary', 'provisional', 'differential'],
            required: true
        },
        code: {
            type: String,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe'],
            default: 'moderate'
        },
        chronic: {
            type: Boolean,
            default: false
        }
    }],
    treatment_plan: {
        plan: {
            type: String,
            required: true,
            trim: true
        },
        instructions: {
            type: String,
            trim: true
        },
        follow_up: {
            required: {
                type: Boolean,
                default: false
            },
            duration: {
                type: String,
                trim: true
            },
            instructions: {
                type: String,
                trim: true
            }
        },
        referrals: [{
            specialty: {
                type: String,
                required: true,
                trim: true
            },
            reason: {
                type: String,
                trim: true
            },
            urgent: {
                type: Boolean,
                default: false
            }
        }],
        investigations: [{
            type: {
                type: String,
                required: true,
                trim: true
            },
            purpose: {
                type: String,
                trim: true
            },
            urgent: {
                type: Boolean,
                default: false
            }
        }]
    },
    prescriptions: [{
        medication: {
            name: {
                type: String,
                required: true,
                trim: true
            },
            strength: {
                type: String,
                trim: true
            },
            form: {
                type: String,
                enum: ['tablet', 'capsule', 'liquid', 'injection', 'ointment', 'cream', 'inhaler', 'other'],
                required: true
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
                enum: ['oral', 'topical', 'injection', 'inhalation', 'other'],
                default: 'oral'
            }
        },
        instructions: {
            type: String,
            trim: true
        },
        prn: {
            type: Boolean,
            default: false
        },
        refills: {
            type: Number,
            min: 0,
            default: 0
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
        },
        patient_instructions: {
            type: String,
            trim: true
        }
    },
    attachments: [{
        type: {
            type: String,
            enum: ['image', 'document', 'lab_result', 'scan', 'other'],
            required: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        description: {
            type: String,
            trim: true
        },
        uploaded_at: {
            type: Date,
            default: Date.now
        }
    }],
    status: {
        type: String,
        enum: ['draft', 'completed', 'reviewed', 'amended'],
        default: 'draft'
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    reviewed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewed_at: {
        type: Date
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'medical_records'
});

// Compound unique index for tenant_id and record_number
medicalRecordSchema.index({ tenant_id: 1, record_number: 1 }, { unique: true });
medicalRecordSchema.index({ tenant_id: 1 });
medicalRecordSchema.index({ patient_id: 1 });
medicalRecordSchema.index({ doctor_id: 1 });
medicalRecordSchema.index({ appointment_id: 1 });
medicalRecordSchema.index({ tenant_id: 1, patient_id: 1, created_at: -1 });
medicalRecordSchema.index({ tenant_id: 1, doctor_id: 1, created_at: -1 });
medicalRecordSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for patient info
medicalRecordSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for doctor info
medicalRecordSchema.virtual('doctor_info', {
    ref: 'User',
    localField: 'doctor_id',
    foreignField: '_id',
    justOne: true
});

// Static methods
medicalRecordSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('doctor_id', 'first_name last_name')
        .sort({ created_at: -1 });
};

medicalRecordSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    })
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

medicalRecordSchema.statics.findByDoctor = function(tenantId, doctorId) {
    return this.find({ 
        tenant_id: tenantId, 
        doctor_id: doctorId, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ created_at: -1 });
};

medicalRecordSchema.statics.findByDateRange = function(tenantId, startDate, endDate) {
    return this.find({
        tenant_id: tenantId,
        created_at: { $gte: startDate, $lte: endDate },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

medicalRecordSchema.statics.searchRecords = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { record_number: new RegExp(searchTerm, 'i') },
            { 'visit_info.chief_complaint': new RegExp(searchTerm, 'i') },
            { 'diagnosis.description': new RegExp(searchTerm, 'i') },
            { 'treatment_plan.plan': new RegExp(searchTerm, 'i') }
        ]
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ created_at: -1 });
};

// Instance methods
medicalRecordSchema.methods.complete = function(reviewedBy) {
    this.status = 'completed';
    if (reviewedBy) {
        this.reviewed_by = reviewedBy;
        this.reviewed_at = new Date();
    }
    return this.save();
};

medicalRecordSchema.methods.review = function(reviewedBy) {
    this.status = 'reviewed';
    this.reviewed_by = reviewedBy;
    this.reviewed_at = new Date();
    return this.save();
};

medicalRecordSchema.methods.amend = function(amendment) {
    this.status = 'amended';
    this.notes.clinical += `\n\n--- Amendment (${new Date().toISOString()}) ---\n${amendment}`;
    return this.save();
};

medicalRecordSchema.methods.addAttachment = function(attachment) {
    this.attachments.push(attachment);
    return this.save();
};

medicalRecordSchema.methods.removeAttachment = function(attachmentId) {
    this.attachments = this.attachments.filter(
        attachment => attachment._id.toString() !== attachmentId
    );
    return this.save();
};

medicalRecordSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    return this.save();
};

medicalRecordSchema.methods.restore = function() {
    this.deleted_at = null;
    return this.save();
};

// Pre-save middleware
medicalRecordSchema.pre('save', function(next) {
    // Calculate BMI if height and weight are provided
    if (this.vital_signs.height && this.vital_signs.weight) {
        const heightInMeters = this.vital_signs.height / 100;
        this.vital_signs.bmi = Math.round((this.vital_signs.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }
    
    next();
});

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
