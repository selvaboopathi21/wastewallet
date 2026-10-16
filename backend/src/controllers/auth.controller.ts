// Auth Controller in TypeScript
import { Request, Response } from 'express';
import authService from '../services/auth.service';
import asyncHandler from '../utils/asyncHandler';

// POST /api/v1/auth/send-otp
export const sendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const result = await authService.requestOtp(phone);

  res.status(200).json({
    success: true,
    message: result.otp 
      ? `OTP generated! [Demo OTP: ${result.otp}]` 
      : 'OTP sent successfully to your phone number',
    data: {
      phone: result.phone,
      expiresAt: result.expiresAt,
      otp: result.otp,
    },
  });
});

// POST /api/v1/auth/verify-otp
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, role, name, email, address, language } = req.body;
  const result = await authService.verifyOtpAndLogin({
    phone,
    otp,
    role,
    name,
    email,
    address,
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

// POST /api/v1/auth/google
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, phone, name, googleId, role, address } = req.body;
  const result = await authService.googleAuthLogin({
    email,
    phone,
    name,
    googleId,
    role,
    address,
  });

  res.status(200).json({
    success: true,
    message: result.isNewUser ? 'Account registered with Google successfully' : 'Signed in with Google successfully',
    data: {
      token: result.token,
      user: result.user,
    },
  });
});

// GET /api/v1/auth/me (Protected route)
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getUserProfile(req.user!._id.toString());

  res.status(200).json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user,
    },
  });
});

// PATCH /api/v1/auth/profile (Update name, address, language, email, zoneId)
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, address, language, zoneId, role } = req.body;
  const user = await authService.updateUserProfile(req.user!._id.toString(), {
    name,
    email,
    address,
    language,
    zoneId,
    role,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user,
    },
  });
});

// POST /api/v1/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, password, role, address, zoneId } = req.body;
  const result = await authService.registerWithPassword({
    name,
    email,
    phone,
    password,
    role,
    address,
    zoneId,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      token: result.token,
      user: result.user,
    },
  });
});

// POST /api/v1/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier || req.body.phone || req.body.email;
  const { password } = req.body;
  const targetRole = req.body.targetRole || req.body.role;
  const result = await authService.loginWithPassword({
    identifier,
    password,
    targetRole,
  });

  res.status(200).json({
    success: true,
    message: 'Signed in successfully',
    data: {
      token: result.token,
      user: result.user,
    },
  });
});

// POST /api/v1/auth/forgot-password
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const identifier = req.body.identifier || req.body.phone || req.body.email;
  const result = await authService.requestPasswordReset(identifier);

  res.status(200).json({
    success: true,
    message: result.otp
      ? `Password reset OTP generated! [Demo OTP: ${result.otp}]`
      : 'Password reset OTP sent to your registered mobile number',
    data: {
      phone: result.phone,
      name: result.name,
      expiresAt: result.expiresAt,
      otp: result.otp,
    },
  });
});

// POST /api/v1/auth/reset-password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, newPassword } = req.body;
  const result = await authService.resetPassword({ phone, otp, newPassword });

  res.status(200).json({
    success: true,
    message: 'Password reset successfully! You are now signed in.',
    data: {
      token: result.token,
      user: result.user,
    },
  });
});

export default {
  sendOtp,
  verifyOtp,
  googleLogin,
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
};


