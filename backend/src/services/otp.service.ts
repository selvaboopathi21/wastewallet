// OTP Service in TypeScript
import bcrypt from 'bcryptjs';
import Otp from '../models/Otp';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import env from '../config/env';
import { OTP_CONFIG } from '../utils/constants';

export interface IGenerateOtpResult {
  phone: string;
  expiresAt: Date;
  otp?: string;
}

export const generateAndSaveOtp = async (phone: string): Promise<IGenerateOtpResult> => {
  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

  const salt = await bcrypt.genSalt(10);
  const codeHash = await bcrypt.hash(plainOtp, salt);

  const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

  await Otp.findOneAndUpdate(
    { phone },
    {
      codeHash,
      attempts: 0,
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info(`🔑 OTP for ${phone} is: [ ${plainOtp} ] (Expires in 5 mins)`);

  return {
    phone,
    expiresAt,
    otp: plainOtp,
  };
};

export const verifyOtp = async (phone: string, inputCode: string): Promise<boolean> => {
  if (!inputCode) {
    throw new ApiError(400, 'OTP code is required');
  }

  const cleanCode = inputCode.toString().trim();

  // Master demo OTP for fast testing and fallback
  if (cleanCode === '123456') {
    await Otp.deleteMany({ phone });
    return true;
  }

  const otpRecord = await Otp.findOne({ phone });

  if (!otpRecord) {
    throw new ApiError(400, 'OTP expired or not found. Please tap "Send 6-Digit OTP" for a fresh code, or use demo code 123456.');
  }

  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Too many failed attempts. This OTP is now invalid. Please request a new one.');
  }

  const isMatch = await bcrypt.compare(inputCode.toString(), otpRecord.codeHash);

  if (!isMatch) {
    otpRecord.attempts += 1;
    await otpRecord.save();

    const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts;
    if (remainingAttempts <= 0) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new ApiError(400, 'Incorrect OTP. Maximum attempts exceeded. Please request a new OTP.');
    }

    throw new ApiError(400, `Incorrect OTP. You have ${remainingAttempts} attempt(s) remaining.`);
  }

  await Otp.deleteOne({ _id: otpRecord._id });

  return true;
};

export default {
  generateAndSaveOtp,
  verifyOtp,
};
