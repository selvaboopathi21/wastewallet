// Authentication Service in TypeScript
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Zone from '../models/Zone';
import otpService from './otp.service';
import ApiError from '../utils/ApiError';
import env from '../config/env';
import { ROLES } from '../utils/constants';
import { UserRole, Language, IUser } from '../types';

export interface IVerifyOtpInput {
  phone: string;
  otp: string;
  role?: UserRole;
  name?: string;
  language?: Language;
}

export interface IAuthResponse {
  isNewUser: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    isApproved?: boolean;
    isOnline?: boolean;
    rating: { avg: number; count: number };
    language: Language;
    address?: string;
    location: any;
  };
}

export const requestOtp = async (phone: string) => {
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Please provide a valid 10-digit Indian phone number starting with 6-9');
  }

  return await otpService.generateAndSaveOtp(phone);
};

export const verifyOtpAndLogin = async ({
  phone,
  otp,
  role,
  name,
  language,
}: IVerifyOtpInput): Promise<IAuthResponse> => {
  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and OTP code are required');
  }

  // 1. Verify OTP
  await otpService.verifyOtp(phone, otp);

  // 2. Find or register user
  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    const userRole = role && Object.values(ROLES).includes(role) ? role : 'customer';
    let defaultZoneId = null;

    if (userRole === 'collector') {
      const activeZone = await Zone.findOne({ isActive: true });
      if (activeZone) defaultZoneId = activeZone._id;
    }

    user = await User.create({
      phone,
      name: name || (userRole === 'collector' ? 'Kaalaankadai Partner' : ''),
      role: userRole,
      language: language || 'en',
      isApproved: true,
      isOnline: true,
      zoneId: defaultZoneId,
    });
    isNewUser = true;
  } else if (user.role === 'collector') {
    // If existing collector is missing approval or zone, auto-activate
    let modified = false;
    if (!user.isApproved) {
      user.isApproved = true;
      modified = true;
    }
    if (!user.zoneId) {
      const activeZone = await Zone.findOne({ isActive: true });
      if (activeZone) {
        user.zoneId = activeZone._id;
        modified = true;
      }
    }
    if (modified) {
      await user.save();
    }
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account is suspended. Please contact customer support.');
  }

  // 3. Issue JWT Token
  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as any }
  );

  return {
    isNewUser,
    token,
    user: {
      id: user._id.toString(),
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

export const getUserProfile = async (userId: string): Promise<IUser> => {
  const user = await User.findById(userId).select('-__v');
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

export default {
  requestOtp,
  verifyOtpAndLogin,
  getUserProfile,
};
