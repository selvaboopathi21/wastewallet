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
exports.User = void 0;
// User Model with TypeScript typing
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../utils/constants");
const userSchema = new mongoose_1.Schema({
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
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: '',
    },
    googleId: {
        type: String,
        trim: true,
        default: '',
    },
    role: {
        type: String,
        enum: Object.values(constants_1.ROLES),
        default: constants_1.ROLES.CUSTOMER,
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
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: constants_1.LANGUAGES,
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
}, {
    timestamps: true,
});
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, isOnline: 1, isApproved: 1 });
exports.User = mongoose_1.default.model('User', userSchema);
exports.default = exports.User;
