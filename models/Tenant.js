const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 100
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 255
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 50
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
    logo_url: {
        type: String,
        trim: true
    },
    settings: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    subscription_plan: {
        type: String,
        enum: ['basic', 'professional', 'enterprise'],
        default: 'basic'
    },
    subscription_status: {
        type: String,
        enum: ['active', 'inactive', 'suspended', 'cancelled'],
        default: 'active'
    },
    max_users: {
        type: Number,
        default: 10,
        min: 1
    },
    max_patients: {
        type: Number,
        default: 1000,
        min: 1
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
    collection: 'tenants'
});

// Indexes
tenantSchema.index({ slug: 1 }, { unique: true });
tenantSchema.index({ email: 1 }, { unique: true });
tenantSchema.index({ is_active: 1 });
tenantSchema.index({ deleted_at: 1 });

// Static methods
tenantSchema.statics.findBySlug = function(slug) {
    return this.findOne({ slug, deleted_at: null });
};

tenantSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase(), deleted_at: null });
};

tenantSchema.statics.findActive = function() {
    return this.find({ is_active: true, deleted_at: null });
};

// Instance methods
tenantSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

tenantSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

// Pre-save middleware
tenantSchema.pre('save', function(next) {
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    if (this.slug) {
        this.slug = this.slug.toLowerCase();
    }
    next();
});

// Virtual for tenant's full address
tenantSchema.virtual('full_address').get(function() {
    const parts = [this.address, this.city, this.state, this.postal_code, this.country];
    return parts.filter(part => part && part.trim()).join(', ');
});

module.exports = mongoose.model('Tenant', tenantSchema);
