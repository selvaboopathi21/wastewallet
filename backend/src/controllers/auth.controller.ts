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
  const { phone, otp, role, name, address, language } = req.body;
  const result = await authService.verifyOtpAndLogin({
    phone,
    otp,
    role,
    name,
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

// PATCH /api/v1/auth/profile (Update name, address, language)
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, address, language } = req.body;
  const user = await authService.updateUserProfile(req.user!._id.toString(), {
    name,
    address,
    language,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user,
    },
  });
});

export default {
  sendOtp,
  verifyOtp,
  getMe,
  updateProfile,
};

