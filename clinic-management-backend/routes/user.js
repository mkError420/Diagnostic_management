const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const { userHelpers } = require('../utils/database-helpers');

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

// @route   GET /api/users/dashboard
// @desc    Get user dashboard data
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const dashboard = await userHelpers.getUserDashboard(req.user.tenant_id, req.user.id);
    
    res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private
router.get('/role/:role', auth, async (req, res) => {
  try {
    const users = await userHelpers.getUsersByRole(req.user.tenant_id, req.params.role);
    
    res.json({
      success: true,
      count: users.length,
      data: users.map(user => ({
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      }))
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
