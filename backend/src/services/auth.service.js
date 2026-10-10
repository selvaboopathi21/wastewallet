// Authentication Service: Business logic for OTP request, login, and token generation
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('./otp.service');
const ApiError = require('../utils/ApiError');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { ROLES } = require('../utils/constants');

/**
 * Handle phone OTP generation request
 */
const requestOtp = async (phone) => {
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Please provide a valid 10-digit Indian phone number starting with 6-9');
  }

  const result = await otpService.generateAndSaveOtp(phone);
  return result;
};

/**
 * Verify OTP, find or register user, and issue signed JWT token
 */
const verifyOtpAndLogin = async ({ phone, otp, role, name, language }) => {
  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and OTP code are required');
  }

  // 1. Verify OTP with attempts check and TTL check
  await otpService.verifyOtp(phone, otp);

  // 2. Find existing user or register new one
  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    // If role is provided, validate it; default to customer
    const userRole = role && Object.values(ROLES).includes(role) ? role : ROLES.CUSTOMER;

    user = await User.create({
      phone,
      name: name || '',
      role: userRole,
      language: language || 'en',
      // Collectors start unapproved until reviewed by admin
      isApproved: userRole === ROLES.COLLECTOR ? false : true,
    });
    isNewUser = true;
  }

  // Check if existing user is blocked
  if (user.isBlocked) {
    throw new ApiError(403, 'Your account is suspended. Please contact customer support.');
  }

  // 3. Generate signed JWT token
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );

  return {
    isNewUser,
    token,
    user: {
      id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isApproved: user.isApproved,
      isOnline: user.isOnline,
      rating: user.rating,
      language: user.language,
      address: user.address,
      location: user.location,
    },
  };
};

/**
 * Get profile for logged-in user
 */
const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-__v');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

module.exports = {
  requestOtp,
  verifyOtpAndLogin,
  getUserProfile,
};
