const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
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
    test_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    test_info: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            enum: ['blood', 'urine', 'imaging', 'pathology', 'cardiology', 'pulmonary', 'genetic', 'toxicology', 'other'],
            required: true
        },
        type: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        loinc_code: {
            type: String,
            trim: true
        },
        cpt_code: {
            type: String,
            trim: true
        }
    },
    ordering_info: {
        ordered_at: {
            type: Date,
            default: Date.now
        },
        ordered_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        urgency: {
            type: String,
            enum: ['routine', 'stat', 'urgent', 'critical'],
            default: 'routine'
        },
        clinical_indication: {
            type: String,
            trim: true
        },
        special_instructions: {
            type: String,
            trim: true
        }
    },
    specimen: {
        type: {
            type: String,
            enum: ['blood', 'urine', 'swab', 'tissue', 'fluid', 'stool', 'saliva', 'other'],
            required: true
        },
        collected_at: {
            type: Date
        },
        collected_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        collection_method: {
            type: String,
            trim: true
        },
        volume: {
            type: String,
            trim: true
        },
        container: {
            type: String,
            trim: true
        },
        storage_conditions: {
            type: String,
            trim: true
        },
        transport_conditions: {
            type: String,
            trim: true
        }
    },
    processing: {
        received_at_lab: {
            type: Date
        },
        processing_started_at: {
            type: Date
        },
        processing_completed_at: {
            type: Date
        },
        technician: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        laboratory: {
            name: {
                type: String,
                trim: true
            },
            accession_number: {
                type: String,
                trim: true
            },
            contact: {
                phone: String,
                email: String
            }
        }
    },
    results: {
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'cancelled', 'rejected'],
            default: 'pending'
        },
        reported_at: {
            type: Date
        },
        reported_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verified_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        verified_at: {
            type: Date
        },
        components: [{
            name: {
                type: String,
                required: true,
                trim: true
            },
            result: {
                type: mongoose.Schema.Types.Mixed,
                required: true
            },
            unit: {
                type: String,
                trim: true
            },
            reference_range: {
                type: String,
                trim: true
            },
            abnormal_flag: {
                type: String,
                enum: ['L', 'H', 'LL', 'HH', 'AA', '']
            },
            clinical_significance: {
                type: String,
                trim: true
            },
            notes: {
                type: String,
                trim: true
            }
        }],
        interpretation: {
            type: String,
            trim: true
        },
        comments: {
            type: String,
            trim: true
        },
        attachments: [{
            type: {
                type: String,
                enum: ['report', 'image', 'graph', 'other'],
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
            }
        }]
    },
    status: {
        type: String,
        enum: ['ordered', 'specimen_collected', 'in_transit', 'received', 'in_progress', 'completed', 'cancelled', 'rejected'],
        default: 'ordered'
    },
    cancellation_info: {
        reason: {
            type: String,
            trim: true
        },
        cancelled_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        cancelled_at: {
            type: Date
        }
    },
    notes: {
        clinical: {
            type: String,
            trim: true
        },
        laboratory: {
            type: String,
            trim: true
        },
        administrative: {
            type: String,
            trim: true
        }
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'lab_tests'
});

// Compound unique index for tenant_id and test_number
labTestSchema.index({ tenant_id: 1, test_number: 1 }, { unique: true });
labTestSchema.index({ tenant_id: 1 });
labTestSchema.index({ patient_id: 1 });
labTestSchema.index({ doctor_id: 1 });
labTestSchema.index({ appointment_id: 1 });
labTestSchema.index({ tenant_id: 1, patient_id: 1, status: 1 });
labTestSchema.index({ tenant_id: 1, status: 1 });
labTestSchema.index({ tenant_id: 1, 'ordering_info.ordered_at': -1 });
labTestSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for patient info
labTestSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for doctor info
labTestSchema.virtual('doctor_info', {
    ref: 'User',
    localField: 'doctor_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for days since ordered
labTestSchema.virtual('days_since_ordered').get(function() {
    if (!this.ordering_info.ordered_at) return null;
    const today = new Date();
    const orderedDate = new Date(this.ordering_info.ordered_at);
    const diffTime = today - orderedDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Static methods
labTestSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('doctor_id', 'first_name last_name')
        .sort({ 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    })
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.findByDoctor = function(tenantId, doctorId) {
    return this.find({ 
        tenant_id: tenantId, 
        doctor_id: doctorId, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.findByStatus = function(tenantId, status) {
    return this.find({ 
        tenant_id: tenantId, 
        status: status, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.findPending = function(tenantId) {
    return this.find({
        tenant_id: tenantId,
        status: { $in: ['ordered', 'specimen_collected', 'in_transit', 'received', 'in_progress'] },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.findCompleted = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        status: 'completed', 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'results.reported_at': -1 });
};

labTestSchema.statics.findUrgent = function(tenantId) {
    return this.find({
        tenant_id: tenantId,
        'ordering_info.urgency': { $in: ['stat', 'urgent', 'critical'] },
        status: { $ne: 'completed' },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'ordering_info.urgency': -1, 'ordering_info.ordered_at': -1 });
};

labTestSchema.statics.searchLabTests = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { test_number: new RegExp(searchTerm, 'i') },
            { 'test_info.name': new RegExp(searchTerm, 'i') },
            { 'test_info.type': new RegExp(searchTerm, 'i') },
            { 'processing.laboratory.accession_number': new RegExp(searchTerm, 'i') }
        ]
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ 'ordering_info.ordered_at': -1 });
};

// Instance methods
labTestSchema.methods.collectSpecimen = function(collectionData) {
    this.status = 'specimen_collected';
    this.specimen = { ...this.specimen, ...collectionData };
    return this.save();
};

labTestSchema.methods.sendToLab = function() {
    this.status = 'in_transit';
    return this.save();
};

labTestSchema.methods.receiveAtLab = function(receivedData) {
    this.status = 'received';
    this.processing.received_at_lab = new Date();
    if (receivedData) {
        this.processing.laborary = { ...this.processing.laboratory, ...receivedData };
    }
    return this.save();
};

labTestSchema.methods.startProcessing = function(technicianId) {
    this.status = 'in_progress';
    this.processing.processing_started_at = new Date();
    this.processing.technician = technicianId;
    return this.save();
};

labTestSchema.methods.completeTest = function(resultsData) {
    this.status = 'completed';
    this.results = { ...this.results, ...resultsData };
    this.results.reported_at = new Date();
    this.processing.processing_completed_at = new Date();
    return this.save();
};

labTestSchema.methods.verifyResults = function(verifiedBy) {
    this.results.verified_by = verifiedBy;
    this.results.verified_at = new Date();
    return this.save();
};

labTestSchema.methods.cancel = function(reason, cancelledBy) {
    this.status = 'cancelled';
    this.cancellation_info.reason = reason;
    this.cancellation_info.cancelled_by = cancelledBy;
    this.cancellation_info.cancelled_at = new Date();
    return this.save();
};

labTestSchema.methods.reject = function(reason) {
    this.status = 'rejected';
    this.cancellation_info.reason = reason;
    this.cancellation_info.cancelled_at = new Date();
    return this.save();
};

labTestSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    return this.save();
};

labTestSchema.methods.restore = function() {
    this.deleted_at = null;
    return this.save();
};

module.exports = mongoose.model('LabTest', labTestSchema);
