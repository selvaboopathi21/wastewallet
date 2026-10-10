// User Model with TypeScript typing
import mongoose, { Schema } from 'mongoose';
import { IUser } from '../types';
import { ROLES, LANGUAGES } from '../utils/constants';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.CUSTOMER,
      required: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [80.2707, 13.0827], // Chennai default [lng, lat]
      },
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      default: null,
    },
    rating: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    language: {
      type: String,
      enum: LANGUAGES,
      default: 'en',
    },
    // Collector specific
    isApproved: {
      type: Boolean,
      default: false,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    acceptanceRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    storeName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isOnline: 1, isApproved: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
export default User;
