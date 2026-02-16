const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    tenant_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true
    },
    role_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },
    clinic_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
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
        required: true,
        lowercase: true,
        trim: true,
        maxlength: 255
    },
    phone: {
        type: String,
        trim: true,
        maxlength: 50
    },
    password_hash: {
        type: String,
        required: true
    },
    salt: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'staff', 'doctor', 'patient'],
        required: true
    },
    profile_image_url: {
        type: String,
        trim: true
    },
    date_of_birth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
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
    is_active: {
        type: Boolean,
        default: true
    },
    email_verified: {
        type: Boolean,
        default: false
    },
    phone_verified: {
        type: Boolean,
        default: false
    },
    last_login_at: {
        type: Date
    },
    deleted_at: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Compound unique index for tenant_id and email
userSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
userSchema.index({ tenant_id: 1 });
userSchema.index({ role_id: 1 });
userSchema.index({ clinic_id: 1 });
userSchema.index({ tenant_id: 1, role: 1 });
userSchema.index({ tenant_id: 1, is_active: 1 });
userSchema.index({ tenant_id: 1, deleted_at: 1 });

// Virtual for full name
userSchema.virtual('full_name').get(function() {
    return `${this.first_name} ${this.last_name}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
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

// Static methods
userSchema.statics.findByTenant = function(tenantId) {
    return this.find({ tenant_id: tenantId, deleted_at: null });
};

userSchema.statics.findByEmail = function(tenantId, email) {
    return this.findOne({ 
        tenant_id: tenantId, 
        email: email.toLowerCase(), 
        deleted_at: null 
    });
};

userSchema.statics.findByRole = function(tenantId, role) {
    return this.find({ 
        tenant_id: tenantId, 
        role: role, 
        is_active: true, 
        deleted_at: null 
    });
};

userSchema.statics.findDoctors = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        role: 'doctor', 
        is_active: true, 
        deleted_at: null 
    });
};

userSchema.statics.findPatients = function(tenantId) {
    return this.find({ 
        tenant_id: tenantId, 
        role: 'patient', 
        is_active: true, 
        deleted_at: null 
    });
};

// Instance methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password_hash);
};

userSchema.methods.updateLastLogin = function() {
    this.last_login_at = new Date();
    return this.save();
};

userSchema.methods.softDelete = function() {
    this.deleted_at = new Date();
    this.is_active = false;
    return this.save();
};

userSchema.methods.restore = function() {
    this.deleted_at = null;
    this.is_active = true;
    return this.save();
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
    // Hash password if it's modified
    if (this.isModified('password_hash')) {
        const salt = await bcrypt.genSalt(12);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
        this.salt = salt;
    }
    
    // Normalize email
    if (this.email) {
        this.email = this.email.toLowerCase();
    }
    
    next();
});

// Pre-remove middleware
userSchema.pre('remove', async function(next) {
    // Remove related records
    await mongoose.model('Appointment').deleteMany({ 
        $or: [
            { patient_id: this._id },
            { doctor_id: this._id }
        ]
    });
    
    next();
});

module.exports = mongoose.model('User', userSchema);
