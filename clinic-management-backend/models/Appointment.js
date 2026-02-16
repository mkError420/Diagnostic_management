const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    clinic_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic',
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
    appointment_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255
    },
    description: {
        type: String,
        trim: true
    },
    start_time: {
        type: Date,
        required: true
    },
    end_time: {
        type: Date,
        required: true
    },
    duration_minutes: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
        default: 'scheduled'
    },
    notes: {
        type: String,
        trim: true
    },
    cancellation: {
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
    reminders: [{
        type: {
            type: String,
            enum: ['email', 'sms', 'push'],
            required: true
        },
        scheduled_for: {
            type: Date,
            required: true
        },
        sent: {
            type: Boolean,
            default: false
        },
        sent_at: {
            type: Date
        }
    }],
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'appointments'
});

// Compound unique index for tenant_id and appointment_number
appointmentSchema.index({ tenant_id: 1, appointment_number: 1 }, { unique: true });
appointmentSchema.index({ tenant_id: 1 });
appointmentSchema.index({ clinic_id: 1 });
appointmentSchema.index({ patient_id: 1 });
appointmentSchema.index({ doctor_id: 1 });
appointmentSchema.index({ tenant_id: 1, start_time: 1 });
appointmentSchema.index({ tenant_id: 1, status: 1 });
appointmentSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for duration
appointmentSchema.virtual('duration').get(function() {
    return `${this.duration_minutes} minutes`;
});

// Virtual for status display
appointmentSchema.virtual('status_display').get(function() {
    return this.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Static methods
appointmentSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('doctor_id', 'first_name last_name')
        .sort({ start_time: 1 });
};

appointmentSchema.statics.findByDateRange = function(tenantId, startDate, endDate) {
    return this.find({
        tenant_id: tenantId,
        start_time: { $gte: startDate, $lte: endDate },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('doctor_id', 'first_name last_name')
    .sort({ start_time: 1 });
};

appointmentSchema.statics.findByDoctor = function(tenantId, doctorId, startDate, endDate) {
    const query = {
        tenant_id: tenantId,
        doctor_id: doctorId,
        deleted_at: null
    };
    
    if (startDate && endDate) {
        query.start_time = { $gte: startDate, $lte: endDate };
    }
    
    return this.find(query)
        .populate('patient_id', 'first_name last_name patient_id')
        .sort({ start_time: 1 });
};

appointmentSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({
        tenant_id: tenantId,
        patient_id: patientId,
        deleted_at: null
    })
    .populate('doctor_id', 'first_name last_name')
    .sort({ start_time: -1 });
};

appointmentSchema.statics.findUpcoming = function(tenantId, doctorId = null) {
    const query = {
        tenant_id: tenantId,
        start_time: { $gte: new Date() },
        status: { $in: ['scheduled', 'confirmed'] },
        deleted_at: null
    };
    
    if (doctorId) {
        query.doctor_id = doctorId;
    }
    
    return this.find(query)
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('doctor_id', 'first_name last_name')
        .sort({ start_time: 1 });
};

appointmentSchema.statics.findConflicts = function(tenantId, doctorId, startTime, endTime, excludeId = null) {
    const query = {
        tenant_id: tenantId,
        doctor_id: doctorId,
        status: { $nin: ['cancelled', 'no_show'] },
        deleted_at: null,
        $or: [
            { start_time: { $lt: endTime, $gte: startTime } },
            { end_time: { $gt: startTime, $lte: endTime } },
            { start_time: { $lte: startTime }, end_time: { $gte: endTime } }
        ]
    };
    
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    
    return this.find(query);
};

// Instance methods
appointmentSchema.methods.confirm = function() {
    this.status = 'confirmed';
    return this.save();
};

appointmentSchema.methods.start = function() {
    this.status = 'in_progress';
    return this.save();
};

appointmentSchema.methods.complete = function() {
    this.status = 'completed';
    return this.save();
};

appointmentSchema.methods.cancel = function(reason, cancelledBy) {
    this.status = 'cancelled';
    this.cancellation.reason = reason;
    this.cancellation.cancelled_by = cancelledBy;
    this.cancellation.cancelled_at = new Date();
    return this.save();
};

appointmentSchema.methods.markNoShow = function() {
    this.status = 'no_show';
    return this.save();
};

appointmentSchema.methods.addReminder = function(type, scheduledFor) {
    this.reminders.push({
        type: type,
        scheduled_for: scheduledFor,
        sent: false
    });
    return this.save();
};

appointmentSchema.methods.markReminderSent = function(reminderId) {
    const reminder = this.reminders.id(reminderId);
    if (reminder) {
        reminder.sent = true;
        reminder.sent_at = new Date();
    }
    return this.save();
};

appointmentSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    return this.save();
};

// Pre-save middleware
appointmentSchema.pre('save', function(next) {
    // Calculate duration if not provided
    if (this.isModified('start_time') || this.isModified('end_time')) {
        if (this.start_time && this.end_time) {
            const durationMs = this.end_time - this.start_time;
            this.duration_minutes = Math.round(durationMs / (1000 * 60));
        }
    }
    next();
});

// Validation
appointmentSchema.pre('save', function(next) {
    // Check if end_time is after start_time
    if (this.start_time && this.end_time && this.end_time <= this.start_time) {
        return next(new Error('End time must be after start time'));
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
