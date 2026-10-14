// PickupRequest Model: Central schema for scrap collection requests
import mongoose, { Schema } from 'mongoose';
import { IPickupRequest } from '../types';
import {
  PICKUP_STATUSES,
  PRICING_MODES,
  PRICING_PREFERENCES,
} from '../utils/constants';

const pickupRequestSchema = new Schema<IPickupRequest>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    collectorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'Zone ID is required'],
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Pickup address is required'],
      trim: true,
    },
    // GeoJSON Point for customer location
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    photos: {
      type: [String],
      default: [],
    },
    preferredTime: {
      type: String,
      default: 'anytime',
    },
    status: {
      type: String,
      enum: PICKUP_STATUSES,
      default: 'pending',
      index: true,
    },
    // Dispatch tracking
    offeredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    declinedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    currentOfferCollectorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    offerExpiresAt: {
      type: Date,
      default: null,
    },
    noCollectorsAvailable: {
      type: Boolean,
      default: false,
    },
    // Pricing modes
    customerPricingPreference: {
      type: String,
      enum: PRICING_PREFERENCES,
      default: 'none',
    },
    pricingMode: {
      type: String,
      enum: PRICING_MODES,
      default: 'separate',
    },
    separateRequest: {
      requested: { type: Boolean, default: false },
      requestedAt: { type: Date },
      status: { type: String, enum: ['pending', 'accepted', 'declined', null], default: null },
      declineReason: { type: String, default: '' },
    },
    // Totals calculated on site
    totalPickupWeightKg: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    customerConfirmed: {
      type: Boolean,
      default: false,
    },
    confirmationOtp: {
      type: String,
      default: null,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
    scalePhotos: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location queries
pickupRequestSchema.index({ location: '2dsphere' });
pickupRequestSchema.index({ status: 1, currentOfferCollectorId: 1, offerExpiresAt: 1 });

export const PickupRequest = mongoose.model<IPickupRequest>('PickupRequest', pickupRequestSchema);
export default PickupRequest;
