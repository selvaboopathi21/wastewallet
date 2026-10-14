"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickupRequest = void 0;
// PickupRequest Model: Central schema for scrap collection requests
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../utils/constants");
const pickupRequestSchema = new mongoose_1.Schema({
    customerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer ID is required'],
        index: true,
    },
    collectorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    zoneId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: constants_1.PICKUP_STATUSES,
        default: 'pending',
        index: true,
    },
    // Dispatch tracking
    offeredTo: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    declinedBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    currentOfferCollectorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    offerExpiresAt: {
        type: Date,
        default: null,
    },
    // Pricing modes
    customerPricingPreference: {
        type: String,
        enum: constants_1.PRICING_PREFERENCES,
        default: 'none',
    },
    pricingMode: {
        type: String,
        enum: constants_1.PRICING_MODES,
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
}, {
    timestamps: true,
});
// 2dsphere index for location queries
pickupRequestSchema.index({ location: '2dsphere' });
pickupRequestSchema.index({ status: 1, currentOfferCollectorId: 1, offerExpiresAt: 1 });
exports.PickupRequest = mongoose_1.default.model('PickupRequest', pickupRequestSchema);
exports.default = exports.PickupRequest;
