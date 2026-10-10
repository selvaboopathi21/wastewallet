// Otp Model: Temporary storage for 6-digit phone verification codes
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      index: true,
    },
    // We store the hashed code so plain OTP is never readable directly from DB
    codeHash: {
      type: String,
      required: true,
    },
    // Track invalid entry attempts (max 3 before lock)
    attempts: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL (Time-To-Live) Index: MongoDB will automatically delete the record when expiresAt is reached!
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
