const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 255
    },
    license_number: {
        type: String,
        trim: true,
        maxlength: 100
    },
    tax_id: {
        type: String,
        trim: true,
        maxlength: 50
    },
    contact: {
        phone: {
            type: String,
            trim: true,
            maxlength: 50
        },
        email: {
            type: String,
            lowercase: true,
            trim: true,
            maxlength: 255
        },
        website: {
            type: String,
            trim: true,
            maxlength: 255
        }
    },
    address: {
        street: {
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
        }
    },
    settings: {
        timezone: {
            type: String,
            default: 'UTC'
        },
        currency: {
            type: String,
            default: 'USD',
            maxlength: 3
        },
        language: {
            type: String,
            default: 'en',
            maxlength: 10
        },
        appointment_duration: {
            type: Number,
            default: 30,
            min: 15
        },
        working_hours: {
            monday: { open: String, close: String, closed: { type: Boolean, default: false } },
            tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
            thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
            friday: { open: String, close: String, closed: { type: Boolean, default: false } },
            saturday: { open: String, close: String, closed: { type: Boolean, default: true } },
            sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
        }
    },
    services: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        duration: {
            type: Number,
            required: true,
            min: 15
        },
        price: {
            type: Number,
            min: 0
        },
        is_active: {
            type: Boolean,
            default: true
        }
    }],
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
    collection: 'clinics'
});

// Indexes
clinicSchema.index({ tenant_id: 1 });
clinicSchema.index({ tenant_id: 1, name: 1 });
clinicSchema.index({ tenant_id: 1, is_active: 1 });
clinicSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for full address
clinicSchema.virtual('full_address').get(function() {
    const parts = [
        this.address.street,
        this.address.city,
        this.address.state,
        this.address.postal_code,
        this.address.country
    ];
    return parts.filter(part => part && part.trim()).join(', ');
});

// Virtual for contact info
clinicSchema.virtual('contact_info').get(function() {
    const info = [];
    if (this.contact.phone) info.push(this.contact.phone);
    if (this.contact.email) info.push(this.contact.email);
    if (this.contact.website) info.push(this.contact.website);
    return info.join(' | ');
});

// Static methods
clinicSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null })
        .sort({ name: 1 });
};

clinicSchema.statics.findActive = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        is_active: true, 
        deleted_at: null 
    })
    .sort({ name: 1 });
};

clinicSchema.statics.searchClinics = function(tenantId, searchTerm) {
    return this.find({
        tenant_id: tenantId,
        deleted_at: null,
        $or: [
            { name: new RegExp(searchTerm, 'i') },
            { 'address.city': new RegExp(searchTerm, 'i') },
            { 'address.state': new RegExp(searchTerm, 'i') },
            { 'contact.email': new RegExp(searchTerm, 'i') },
            { 'contact.phone': new RegExp(searchTerm, 'i') }
        ]
    });
};

// Instance methods
clinicSchema.methods.addService = function(service) {
    this.services.push(service);
    return this.save();
};

clinicSchema.methods.removeService = function(serviceId) {
    this.services = this.services.filter(
        service => service._id.toString() !== serviceId
    );
    return this.save();
};

clinicSchema.methods.updateService = function(serviceId, updates) {
    const service = this.services.id(serviceId);
    if (service) {
        Object.assign(service, updates);
    }
    return this.save();
};

clinicSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

clinicSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

// Pre-save middleware
clinicSchema.pre('save', function(next) {
    // Normalize email
    if (this.contact.email) {
        this.contact.email = this.contact.email.toLowerCase();
    }
    next();
});

// Pre-remove middleware
clinicSchema.pre('remove', async function(next) {
    // Update related records
    await mongoose.model('User').updateMany(
        { clinic_id: this._id },
        { $unset: { clinic_id: 1 } }
    );
    
    await mongoose.model('Appointment').updateMany(
        { clinic_id: this._id },
        { $set: { deleted_at: new Date() } }
    );
    
    next();
});

module.exports = mongoose.model('Clinic', clinicSchema);
