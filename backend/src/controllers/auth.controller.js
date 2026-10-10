// Auth Controller: Handles HTTP input/output only (no business logic)
const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/v1/auth/send-otp
const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  const result = await authService.requestOtp(phone);

  res.status(200).json({
    success: true,
    message: 'OTP sent successfully to your phone number',
    data: {
      phone: result.phone,
      expiresAt: result.expiresAt,
    },
  });
});

// POST /api/v1/auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp, role, name, language } = req.body;
  const result = await authService.verifyOtpAndLogin({
    phone,
    otp,
    role,
    name,
    language,
  });

  res.status(200).json({
    success: true,
    message: result.isNewUser ? 'User registered and signed in successfully' : 'Signed in successfully',
    data: {
      token: result.token,
      user: result.user,
    },
  });
});

// GET /api/v1/auth/me (Protected route)
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user,
    },
  });
});

module.exports = {
  sendOtp,
  verifyOtp,
  getMe,
};
