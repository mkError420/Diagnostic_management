const express = require('express');
const jwt = require('jsonwebtoken');

const Appointment = require('../models/Appointment');
const { appointmentHelpers } = require('../utils/database-helpers');

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

// @route   GET /api/appointments
// @desc    Get all appointments for tenant
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const appointments = await Appointment.findByTenant(req.user.tenant_id);
    
    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/appointments/upcoming
// @desc    Get upcoming appointments
// @access  Private
router.get('/upcoming', auth, async (req, res) => {
  try {
    const appointments = await Appointment.findUpcoming(req.user.tenant_id, req.user.id);
    
    res.json({
      success: true,
      count: appointments.length,
      data: appointments
    });

  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/appointments/doctor/:doctorId/schedule/:date
// @desc    Get doctor's schedule for a specific date
// @access  Private
router.get('/doctor/:doctorId/schedule/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const schedule = await appointmentHelpers.getDoctorSchedule(req.user.tenant_id, req.params.doctorId, date);
    
    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Get doctor schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
