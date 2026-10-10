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
    message: 'OTP sent successfully to your phone number',
    data: {
      phone: result.phone,
      expiresAt: result.expiresAt,
    },
  });
});

// POST /api/v1/auth/verify-otp
export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
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

export default {
  sendOtp,
  verifyOtp,
  getMe,
};
