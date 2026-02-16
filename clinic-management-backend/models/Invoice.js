const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
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
    appointment_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    },
    invoice_number: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    invoice_info: {
        issue_date: {
            type: Date,
            default: Date.now
        },
        due_date: {
            type: Date,
            required: true
        },
        billing_period: {
            start: Date,
            end: Date
        },
        currency: {
            type: String,
            default: 'USD',
            maxlength: 3
        },
        tax_rate: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        }
    },
    items: [{
        type: {
            type: String,
            enum: ['consultation', 'procedure', 'medication', 'lab_test', 'imaging', 'supplies', 'other'],
            required: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        code: {
            type: String,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },
        unit_price: {
            type: Number,
            required: true,
            min: 0
        },
        discount: {
            type: Number,
            min: 0,
            default: 0
        },
        tax_rate: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        },
        total: {
            type: Number,
            required: true,
            min: 0
        },
        service_date: {
            type: Date
        },
        provider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    totals: {
        subtotal: {
            type: Number,
            required: true,
            min: 0
        },
        discount_amount: {
            type: Number,
            min: 0,
            default: 0
        },
        tax_amount: {
            type: Number,
            min: 0,
            default: 0
        },
        total_amount: {
            type: Number,
            required: true,
            min: 0
        },
        paid_amount: {
            type: Number,
            min: 0,
            default: 0
        },
        balance_due: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    insurance: {
        provider: {
            type: String,
            trim: true
        },
        policy_number: {
            type: String,
            trim: true
        },
        group_number: {
            type: String,
            trim: true
        },
        member_id: {
            type: String,
            trim: true
        },
        claim_number: {
            type: String,
            trim: true
        },
        coverage: {
            type: Number,
            min: 0,
            max: 1
        },
        authorized_amount: {
            type: Number,
            min: 0
        },
        status: {
            type: String,
            enum: ['not_submitted', 'submitted', 'processing', 'approved', 'partially_approved', 'denied', 'paid'],
            default: 'not_submitted'
        },
        submitted_at: {
            type: Date
        },
        processed_at: {
            type: Date
        }
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'overdue', 'paid', 'partially_paid', 'cancelled', 'written_off'],
        default: 'draft'
    },
    billing_info: {
        patient_name: {
            type: String,
            trim: true
        },
        patient_address: {
            street: String,
            city: String,
            state: String,
            postal_code: String,
            country: String
        },
        patient_phone: {
            type: String,
            trim: true
        },
        patient_email: {
            type: String,
            lowercase: true,
            trim: true
        }
    },
    payment_terms: {
        method: {
            type: String,
            enum: ['cash', 'card', 'check', 'bank_transfer', 'insurance', 'multiple'],
            default: 'multiple'
        },
        due_days: {
            type: Number,
            min: 0,
            default: 30
        },
        late_fee: {
            type: Number,
            min: 0,
            default: 0
        },
        late_fee_type: {
            type: String,
            enum: ['fixed', 'percentage'],
            default: 'fixed'
        }
    },
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
    sent_at: {
        type: Date
    },
    paid_at: {
        type: Date
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'invoices'
});

// Compound unique index for tenant_id and invoice_number
invoiceSchema.index({ tenant_id: 1, invoice_number: 1 }, { unique: true });
invoiceSchema.index({ tenant_id: 1 });
invoiceSchema.index({ patient_id: 1 });
invoiceSchema.index({ appointment_id: 1 });
invoiceSchema.index({ tenant_id: 1, status: 1 });
invoiceSchema.index({ tenant_id: 1, 'invoice_info.due_date': 1 });
invoiceSchema.index({ tenant_id: 1, 'insurance.status': 1 });
invoiceSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for patient info
invoiceSchema.virtual('patient_info', {
    ref: 'Patient',
    localField: 'patient_id',
    foreignField: '_id',
    justOne: true
});

// Virtual for days overdue
invoiceSchema.virtual('days_overdue').get(function() {
    if (this.status === 'paid' || this.status === 'cancelled') return 0;
    if (!this.invoice_info.due_date) return 0;
    
    const today = new Date();
    const dueDate = new Date(this.invoice_info.due_date);
    const diffTime = today - dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is overdue
invoiceSchema.virtual('is_overdue').get(function() {
    return this.days_overdue > 0 && this.status !== 'paid';
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
    // Calculate item totals
    let subtotal = 0;
    let taxAmount = 0;
    
    this.items.forEach(item => {
        const itemTotal = (item.unit_price * item.quantity) - item.discount;
        item.total = itemTotal;
        subtotal += itemTotal;
        taxAmount += itemTotal * item.tax_rate;
    });
    
    this.totals.subtotal = subtotal;
    this.totals.discount_amount = this.items.reduce((sum, item) => sum + item.discount, 0);
    this.totals.tax_amount = taxAmount;
    this.totals.total_amount = subtotal + taxAmount;
    this.totals.balance_due = this.totals.total_amount - this.totals.paid_amount;
    
    // Set due date if not provided
    if (!this.invoice_info.due_date && this.invoice_info.issue_date) {
        const dueDate = new Date(this.invoice_info.issue_date);
        dueDate.setDate(dueDate.getDate() + this.payment_terms.due_days);
        this.invoice_info.due_date = dueDate;
    }
    
    // Update status based on payment
    if (this.totals.balance_due <= 0 && this.totals.paid_amount > 0) {
        this.status = 'paid';
        if (!this.paid_at) {
            this.paid_at = new Date();
        }
    } else if (this.totals.paid_amount > 0 && this.totals.balance_due > 0) {
        this.status = 'partially_paid';
    } else if (this.is_overdue && this.status !== 'cancelled') {
        this.status = 'overdue';
    }
    
    next();
});

// Static methods
invoiceSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .populate('patient_id', 'first_name last_name patient_id')
        .populate('appointment_id', 'appointment_number start_time')
        .sort({ 'invoice_info.issue_date': -1 });
};

invoiceSchema.statics.findByPatient = function(tenantId, patientId) {
    return this.find({ 
        tenant_id: tenantId, 
        patient_id: patientId, 
        deleted_at: null 
    })
    .sort({ 'invoice_info.issue_date': -1 });
};

invoiceSchema.statics.findByStatus = function(tenantId, status) {
    return this.find({ 
        tenant_id: tenantId, 
        status: status, 
        deleted_at: null 
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'invoice_info.issue_date': -1 });
};

invoiceSchema.statics.findOverdue = function(tenantId) {
    return this.find({
        tenant_id: tenantId,
        'invoice_info.due_date': { $lt: new Date() },
        status: { $nin: ['paid', 'cancelled', 'written_off'] },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'invoice_info.due_date': 1 });
};

invoiceSchema.statics.findUnpaid = function(tenantId) {
    return this.find({
        tenant_id: tenantId,
        status: { $in: ['sent', 'overdue', 'partially_paid'] },
        deleted_at: null
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'invoice_info.due_date': 1 });
};

invoiceSchema.statics.searchInvoices = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { invoice_number: new RegExp(searchTerm, 'i') },
            { 'items.description': new RegExp(searchTerm, 'i') },
            { 'insurance.provider': new RegExp(searchTerm, 'i') },
            { 'insurance.claim_number': new RegExp(searchTerm, 'i') }
        ]
    })
    .populate('patient_id', 'first_name last_name patient_id')
    .sort({ 'invoice_info.issue_date': -1 });
};

// Instance methods
invoiceSchema.methods.addItem = function(item) {
    this.items.push(item);
    return this.save();
};

invoiceSchema.methods.removeItem = function(itemId) {
    this.items = this.items.filter(item => item._id.toString() !== itemId);
    return this.save();
};

invoiceSchema.methods.updateItem = function(itemId, updates) {
    const item = this.items.id(itemId);
    if (item) {
        Object.assign(item, updates);
    }
    return this.save();
};

invoiceSchema.methods.send = function() {
    this.status = 'sent';
    this.sent_at = new Date();
    return this.save();
};

invoiceSchema.methods.addPayment = function(amount) {
    this.totals.paid_amount += amount;
    return this.save();
};

invoiceSchema.methods.cancel = function() {
    this.status = 'cancelled';
    return this.save();
};

invoiceSchema.methods.writeOff = function() {
    this.status = 'written_off';
    this.totals.balance_due = 0;
    return this.save();
};

invoiceSchema.methods.submitInsurance = function() {
    this.insurance.status = 'submitted';
    this.insurance.submitted_at = new Date();
    return this.save();
};

invoiceSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    return this.save();
};

invoiceSchema.methods.restore = function() {
    this.deleted_at = null;
    return this.save();
};

module.exports = mongoose.model('Invoice', invoiceSchema);
