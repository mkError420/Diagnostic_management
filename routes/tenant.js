const express = require('express');
const { body, validationResult } = require('express-validator');

const Tenant = require('../models/Tenant');

const router = express.Router();

// @route   GET /api/tenants/:slug
// @desc    Get tenant by slug
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const tenant = await Tenant.findBySlug(req.params.slug);
    
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant not found'
      });
    }

    res.json({
      success: true,
      data: tenant
    });

  } catch (error) {
    console.error('Get tenant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/tenants
// @desc    Get all active tenants (for public registration)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const tenants = await Tenant.findActive();
    
    res.json({
      success: true,
      count: tenants.length,
      data: tenants.map(tenant => ({
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email
      }))
    });

  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
