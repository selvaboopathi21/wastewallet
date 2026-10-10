// Auth Routes: Maps URLs to controller functions
const express = require('express');
const { sendOtp, verifyOtp, getMe } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');
const { restrictTo } = require('../middleware/role');
const { ROLES } = require('../utils/constants');

const router = express.Router();

// Public routes
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Protected routes (Requires valid JWT token)
router.get('/me', authenticate, getMe);

// Role-protected test route (Requires Admin role)
router.get('/admin-only', authenticate, restrictTo(ROLES.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin! You have access to this protected admin-only resource.',
    data: { user: req.user.name || req.user.phone },
  });
});

module.exports = router;
