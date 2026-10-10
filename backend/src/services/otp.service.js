// OTP Business Logic: Generation, Hashing, TTL management, and Verification
const bcrypt = require('bcryptjs');
const Otp = require('../models/Otp');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { nodeEnv } = require('../config/env');
const { OTP_CONFIG } = require('../utils/constants');

/**
 * Generate a random 6-digit numeric OTP and save its hash in MongoDB
 * In development, we print the code in terminal for easy testing.
 */
const generateAndSaveOtp = async (phone) => {
  // 1. Generate 6-digit code (between 100000 and 999999)
  const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // 2. Hash the OTP with bcrypt (cost factor 10)
  const salt = await bcrypt.genSalt(10);
  const codeHash = await bcrypt.hash(plainOtp, salt);

  // 3. Set expiry to 5 minutes from now
  const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

  // 4. Save or replace in MongoDB
  await Otp.findOneAndUpdate(
    { phone },
    {
      codeHash,
      attempts: 0,
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 5. In development only: print OTP to console
  if (nodeEnv !== 'production') {
    logger.info(`🔑 [DEV ONLY] OTP for ${phone} is: [ ${plainOtp} ] (Expires in 5 mins)`);
  }

  return {
    phone,
    expiresAt,
  };
};

/**
 * Verify submitted OTP against hashed value in MongoDB
 * Enforces maximum 3 attempts before locking/deleting.
 */
const verifyOtp = async (phone, inputCode) => {
  if (!inputCode) {
    throw new ApiError(400, 'OTP code is required');
  }

  // 1. Find OTP document for this phone
  const otpRecord = await Otp.findOne({ phone });

  if (!otpRecord) {
    throw new ApiError(400, 'OTP expired or not found. Please request a new one.');
  }

  // 2. Check if expired
  if (new Date() > otpRecord.expiresAt) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(400, 'OTP has expired. Please request a new one.');
  }

  // 3. Check attempts count
  if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    await Otp.deleteOne({ _id: otpRecord._id });
    throw new ApiError(429, 'Too many failed attempts. This OTP is now invalid. Please request a new one.');
  }

  // 4. Compare input against stored bcrypt hash
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

  // 5. If correct, delete the OTP record so it can never be reused
  await Otp.deleteOne({ _id: otpRecord._id });

  return true;
};

module.exports = {
  generateAndSaveOtp,
  verifyOtp,
};
