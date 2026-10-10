// User Model: Supports Customer, Collector, Store Staff, Buyer, and Admin
const mongoose = require('mongoose');
const { ROLES, LANGUAGES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
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
    // GeoJSON Point for distance calculation and nearest-collector dispatch
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      // [longitude, latitude] - standard GeoJSON coordinate order
      coordinates: {
        type: [Number],
        default: [80.2707, 13.0827], // Default to Chennai, Tamil Nadu coordinates
      },
    },
    zoneId: {
      type: mongoose.Schema.Types.ObjectId,
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
    // Collector specific fields
    isApproved: {
      type: Boolean,
      default: false, // Must be approved by Admin before taking scrap pickups
    },
    isOnline: {
      type: Boolean,
      default: false, // Whether collector is currently active on duty
    },
    acceptanceRate: {
      type: Number,
      default: 100, // Percentage of jobs accepted vs offered
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
    timestamps: true, // Auto adds createdAt and updatedAt
  }
);

// 2dsphere index for Geospatial search (e.g., $near, $geoWithin)
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isOnline: 1, isApproved: 1 });

module.exports = mongoose.model('User', userSchema);
