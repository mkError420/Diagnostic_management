const express = require('express');
const jwt = require('jsonwebtoken');

const Patient = require('../models/Patient');
const { patientHelpers } = require('../utils/database-helpers');

const router = express.Router();

// Middleware to protect routes
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

// @route   GET /api/patients
// @desc    Get all patients for tenant
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const patients = await Patient.findByTenant(req.user.tenant_id);
    
    res.json({
      success: true,
      count: patients.length,
      data: patients
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/patients/search
// @desc    Search patients
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const patients = await patientHelpers.searchPatients(req.user.tenant_id, q);
    
    res.json({
      success: true,
      count: patients.length,
      data: patients
    });

  } catch (error) {
    console.error('Search patients error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    
    if (!patient || patient.tenant_id.toString() !== req.user.tenant_id.toString()) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: patient
    });

  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/patients/:id/summary
// @desc    Get patient summary with related data
// @access  Private
router.get('/:id/summary', auth, async (req, res) => {
  try {
    const summary = await patientHelpers.getPatientSummary(req.user.tenant_id, req.params.id);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get patient summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
