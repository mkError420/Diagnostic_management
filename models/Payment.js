const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    },
    payment_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    payment_info: {
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: 'USD',
            maxlength: 3
        },
        payment_date: {
            type: Date,
            default: Date.now
        },
        method: {
            type: String,
            enum: ['cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'online_payment', 'insurance', 'payment_plan', 'other'],
            required: true
        },
        method_details: {
            // Credit/Debit Card
            card_type: {
                type: String,
                enum: ['visa', 'mastercard', 'amex', 'discover', 'other']
            },
            card_last_four: {
                type: String,
                trim: true,
                maxlength: 4
            },
            card_expiry: {
                type: String,
                trim: true
            },
            authorization_code: {
                type: String,
                trim: true
            },
            transaction_id: {
                type: String,
                trim: true
            },
            // Check
            check_number: {
                type: String,
                trim: true
            },
            bank_name: {
                type: String,
                trim: true
            },
            routing_number: {
                type: String,
                trim: true
            },
            account_number: {
                type: String,
                trim: true
            },
            // Bank Transfer
            transfer_reference: {
                type: String,
                trim: true
            },
            sender_account: {
                type: String,
                trim: true
            },
            receiver_account: {
                type: String,
                trim: true
            },
            // Insurance
            claim_number: {
                type: String,
                trim: true
            },
            explanation_of_benefits: {
                type: String,
                trim: true
            },
            allowed_amount: {
                type: Number,
                min: 0
            },
            deductible: {
                type: Number,
                min: 0
            },
            coinsurance: {
                type: Number,
                min: 0
            }
        }
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
        default: 'pending'
    },
    processing_info: {
        processed_at: {
            type: Date
        },
        processed_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        processor: {
            type: String,
            trim: true
        },
        batch_number: {
            type: String,
            trim: true
        },
        settlement_date: {
            type: Date
        }
    },
    refund_info: {
        refund_amount: {
            type: Number,
            min: 0,
            default: 0
        },
        refund_reason: {
            type: String,
            trim: true
        },
        refunded_at: {
            type: Date
        },
        refunded_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        refund_method: {
            type: String,
            enum: ['original', 'cash', 'bank_transfer', 'store_credit', 'other'],
            default: 'original'
        },
        refund_reference: {
            type: String,
            trim: true
        }
    },
    allocation: [{
        invoice_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
            required: true
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        allocated_at: {
            type: Date,
            default: Date.now
        }
    }],
    notes: {
        internal: {
            type: String,
            trim: true
        },
        patient: {
            type: String,
            trim: true
        }
    },
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
    collection: 'payments'
});

// Compound unique index for tenant_id and payment_number
paymentSchema.index({ tenant_id: 1, payment_number: 1 }, { unique: true });
paymentSchema.index({ tenant_id: 1 });
paymentSchema.index({ patient_id: 1 });
paymentSchema.index({ invoice_id: 1 });
paymentSchema.index({ tenant_id: 1, status: 1 });
paymentSchema.index({ tenant_id: 1, 'payment_info.payment_date': -1 });
paymentSchema.index({ tenant_id: 1, 'payment_info.method': 1 });
paymentSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for patient info
paymentSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for invoice info
paymentSchema.virtual('invoice_info', {
    ref: 'Invoice',
    localField: 'invoice_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for refundable amount
paymentSchema.virtual('refundable_amount').get(function() {
    if (this.status !== 'completed') return 0;
    const totalRefunded = this.refund_info.refund_amount;
    return this.payment_info.amount - totalRefunded;
});

// Static methods
paymentSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('invoice_id', 'invoice_number total_amount')
        .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    })
    .populate('invoice_id', 'invoice_number total_amount')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findByInvoice = function(tenantId, invoiceId) {
    return this.find({ 
        tenant_id: tenantId, 
        invoice_id: invoiceId, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findByStatus = function(tenantId, status) {
    return this.find({ 
        tenant_id: tenantId, 
        status: status, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('invoice_id', 'invoice_number total_amount')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findByMethod = function(tenantId, method) {
    return this.find({ 
        tenant_id: tenantId, 
        'payment_info.method': method, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findByDateRange = function(tenantId, startDate, endDate) {
    return this.find({
        tenant_id: tenantId,
        'payment_info.payment_date': { $gte: startDate, $lte: endDate },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('invoice_id', 'invoice_number total_amount')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.findPending = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        status: 'pending', 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('invoice_id', 'invoice_number total_amount')
    .sort({ 'payment_info.payment_date': -1 });
};

paymentSchema.statics.searchPayments = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { payment_number: new RegExp(searchTerm, 'i') },
            { 'payment_info.method_details.transaction_id': new RegExp(searchTerm, 'i') },
            { 'payment_info.method_details.check_number': new RegExp(searchTerm, 'i') },
            { 'payment_info.method_details.transfer_reference': new RegExp(searchTerm, 'i') }
        ]
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .populate('invoice_id', 'invoice_number total_amount')
    .sort({ 'payment_info.payment_date': -1 });
};

// Instance methods
paymentSchema.methods.process = function(processedBy) {
    this.status = 'completed';
    this.processing_info.processed_at = new Date();
    this.processing_info.processed_by = processedBy;
    return this.save();
};

paymentSchema.methods.fail = function(reason) {
    this.status = 'failed';
    this.notes.internal = reason;
    return this.save();
};

paymentSchema.methods.cancel = function() {
    this.status = 'cancelled';
    return this.save();
};

paymentSchema.methods.refund = function(refundAmount, reason, refundedBy) {
    const refundableAmount = this.refundable_amount;
    
    if (refundAmount > refundableAmount) {
        throw new Error(`Refund amount cannot exceed refundable amount of ${refundableAmount}`);
    }
    
    this.refund_info.refund_amount += refundAmount;
    this.refund_info.refund_reason = reason;
    this.refund_info.refunded_by = refundedBy;
    this.refund_info.refunded_at = new Date();
    
    if (this.refund_info.refund_amount >= this.payment_info.amount) {
        this.status = 'refunded';
    } else {
        this.status = 'partially_refunded';
    }
    
    return this.save();
};

paymentSchema.methods.allocateToInvoice = function(invoiceId, amount) {
    this.allocation.push({
        invoice_id: invoiceId,
        amount: amount,
        allocated_at: new Date()
    });
    return this.save();
};

paymentSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    return this.save();
};

paymentSchema.methods.restore = function() {
    this.deleted_at = null;
    return this.save();
};

// Pre-save middleware
paymentSchema.pre('save', function(next) {
    // Validate refund amount
    if (this.refund_info.refund_amount > this.payment_info.amount) {
        return next(new Error('Refund amount cannot exceed payment amount'));
    }
    
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);
