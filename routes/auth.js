const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Role = require('../models/Role');

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password is required').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password, tenantSlug } = req.body;

    // Find tenant by slug
    const tenant = await Tenant.findBySlug(tenantSlug);
    if (!tenant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant'
      });
    }

    // Find user by email and tenant
    const user = await User.findOne({ 
      email: email.toLowerCase(), 
      tenant_id: tenant._id,
      deleted_at: null 
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.last_login_at = new Date();
    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        clinic_id: user.clinic_id
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      (err, token) => {
        if (err) throw err;

        res.json({
          success: true,
          token,
          user: {
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            tenant_id: user.tenant_id,
            clinic_id: user.clinic_id,
            tenant: {
              id: tenant._id,
              name: tenant.name,
              slug: tenant.slug
            }
          }
        });
      }
    );

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('email', 'Please include a valid email').isEmail(),
  body('password', 'Password must be 6 or more characters').isLength({ min: 6 }),
  body('first_name', 'First name is required').not().isEmpty(),
  body('last_name', 'Last name is required').not().isEmpty(),
  body('tenantSlug', 'Tenant slug is required').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password, first_name, last_name, tenantSlug } = req.body;

    // Find tenant
    const tenant = await Tenant.findBySlug(tenantSlug);
    if (!tenant) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tenant'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ 
      email: email.toLowerCase(), 
      tenant_id: tenant._id 
    });

    if (user) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    user = new User({
      tenant_id: tenant._id,
      first_name,
      last_name,
      email: email.toLowerCase(),
      password_hash: password, // Will be hashed by pre-save middleware
      salt: 'temp', // Will be replaced by pre-save middleware
      role: 'patient' // Default role for self-registration
    });

    await user.save();

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      }
    };

    // Sign token
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
      (err, token) => {
        if (err) throw err;

        res.status(201).json({
          success: true,
          token,
          user: {
            id: user._id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            tenant_id: user.tenant_id,
            tenant: {
              id: tenant._id,
              name: tenant.name,
              slug: tenant.slug
            }
          }
        });
      }
    );

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.user.id)
      .populate('tenant_id', 'name slug')
      .populate('clinic_id', 'name')
      .populate('role_id', 'name permissions');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        tenant_id: user.tenant_id,
        clinic_id: user.clinic_id,
        tenant: user.tenant_id,
        clinic: user.clinic_id,
        role_info: user.role_id
      }
    });

  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
});

module.exports = router;
