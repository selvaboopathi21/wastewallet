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
  email?: string;
  address?: string;
  language?: Language;
}

export interface IGoogleAuthInput {
  email: string;
  phone: string;
  name?: string;
  googleId?: string;
  role?: UserRole;
  address?: string;
}

export interface IAuthResponse {
  isNewUser: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email?: string;
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
  email,
  address,
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

    // Customer is approved automatically; New collector requires Admin approval
    const isApproved = userRole === 'collector' ? false : true;

    user = await User.create({
      phone,
      email: email && email.trim() ? email.trim().toLowerCase() : '',
      name: name && name.trim() ? name.trim() : (userRole === 'collector' ? 'New Collector' : 'Customer'),
      role: userRole,
      address: address && address.trim() ? address.trim() : '',
      language: language || 'en',
      isApproved,
      isOnline: userRole === 'collector' ? false : true,
      zoneId: defaultZoneId,
    });
    isNewUser = true;
  } else {
    // Save updated name/email/address if provided during login/register
    let modified = false;
    if (name && name.trim() && user.name !== name.trim()) {
      user.name = name.trim();
      modified = true;
    }
    if (email && email.trim() && user.email !== email.trim().toLowerCase()) {
      user.email = email.trim().toLowerCase();
      modified = true;
    }
    if (address && address.trim() && user.address !== address.trim()) {
      user.address = address.trim();
      modified = true;
    }
    if (role && Object.values(ROLES).includes(role) && user.role !== role) {
      user.role = role;
      modified = true;
    }

    // Pre-seeded accounts keep approval
    if (['9876500001', '9876543210', '9876500002', '9999999999'].includes(phone)) {
      user.isBlocked = false;
      user.isApproved = true;
      modified = true;
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
    { expiresIn: '30d' }
  );

  return {
    isNewUser,
    token,
    user: {
      id: user._id.toString(),
      name: user.name || (user.role === 'collector' ? 'Partner Collector' : 'Customer'),
      email: user.email,
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

export const googleAuthLogin = async ({
  email,
  phone,
  name,
  googleId,
  role,
  address,
}: IGoogleAuthInput): Promise<IAuthResponse> => {
  if (!email || !email.includes('@')) {
    throw new ApiError(400, 'Valid email address is compulsory for Google registration');
  }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Valid 10-digit Indian mobile number starting with 6-9 is compulsory');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();

  // Find user by phone OR by email OR by googleId
  let user = await User.findOne({
    $or: [{ phone: cleanPhone }, { email: cleanEmail }, ...(googleId ? [{ googleId }] : [])],
  });

  let isNewUser = false;
  if (!user) {
    const userRole = role && Object.values(ROLES).includes(role) ? role : 'customer';
    let defaultZoneId = null;
    if (userRole === 'collector') {
      const activeZone = await Zone.findOne({ isActive: true });
      if (activeZone) defaultZoneId = activeZone._id;
    }
    const isApproved = userRole === 'collector' ? false : true;

    user = await User.create({
      phone: cleanPhone,
      email: cleanEmail,
      googleId: googleId || '',
      name: name && name.trim() ? name.trim() : 'Google User',
      role: userRole,
      address: address && address.trim() ? address.trim() : '',
      isApproved,
      isOnline: userRole === 'collector' ? false : true,
      zoneId: defaultZoneId,
    });
    isNewUser = true;
  } else {
    let modified = false;
    if (!user.email && cleanEmail) {
      user.email = cleanEmail;
      modified = true;
    }
    if (googleId && !user.googleId) {
      user.googleId = googleId;
      modified = true;
    }
    if (name && name.trim() && (!user.name || user.name === 'Customer')) {
      user.name = name.trim();
      modified = true;
    }
    if (address && address.trim() && !user.address) {
      user.address = address.trim();
      modified = true;
    }
    if (modified) {
      await user.save();
    }
  }

  if (user.isBlocked) {
    throw new ApiError(403, 'Your account is suspended. Please contact customer support.');
  }

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
    },
    env.jwtSecret,
    { expiresIn: '30d' }
  );

  return {
    isNewUser,
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
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

export const updateUserProfile = async (
  userId: string,
  data: { name?: string; email?: string; address?: string; language?: Language }
) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (data.name && data.name.trim()) user.name = data.name.trim();
  if (data.email && data.email.trim()) user.email = data.email.trim().toLowerCase();
  if (data.address && data.address.trim()) user.address = data.address.trim();
  if (data.language) user.language = data.language;
  await user.save();
  return user;
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
  googleAuthLogin,
  getUserProfile,
  updateUserProfile,
};
