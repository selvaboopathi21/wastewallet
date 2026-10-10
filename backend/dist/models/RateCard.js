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
exports.RateCard = void 0;
// RateCard Model: Category-wise rates stored in integer Paise per Kg
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../utils/constants");
const rateCardSchema = new mongoose_1.Schema({
    category: {
        type: String,
        enum: constants_1.SCRAP_CATEGORIES,
        required: [true, 'Scrap category is required'],
    },
    // IMPORTANT: Stored strictly as integer Paise (1 INR = 100 Paise) to avoid floating-point math issues
    ratePerKgPaise: {
        type: Number,
        required: [true, 'Rate in paise per kg is required'],
        min: [0, 'Rate cannot be negative'],
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer paise value',
        },
    },
    // Optional zoneId: if null, this acts as the platform-wide default rate
    zoneId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Zone',
        default: null,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    effectiveFrom: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Compound index: Only one active rate per category per zone
rateCardSchema.index({ category: 1, zoneId: 1 }, { unique: true });
exports.RateCard = mongoose_1.default.model('RateCard', rateCardSchema);
exports.default = exports.RateCard;
