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
exports.Rating = void 0;
// Rating Model: Post-pickup ratings and reviews
const mongoose_1 = __importStar(require("mongoose"));
const ratingSchema = new mongoose_1.Schema({
    requestId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'PickupRequest',
        required: [true, 'Pickup Request ID is required'],
        index: true,
    },
    fromUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Rater user ID is required'],
        index: true,
    },
    toUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Target user ID is required'],
        index: true,
    },
    stars: {
        type: Number,
        required: [true, 'Star rating is required'],
        min: [1, 'Minimum rating is 1 star'],
        max: [5, 'Maximum rating is 5 stars'],
    },
    tags: {
        type: [String],
        default: [],
    },
    comment: {
        type: String,
        default: '',
        trim: true,
    },
}, {
    timestamps: true,
});
// Enforce rule: each user can only rate once per pickup request
ratingSchema.index({ requestId: 1, fromUserId: 1 }, { unique: true });
exports.Rating = mongoose_1.default.model('Rating', ratingSchema);
exports.default = exports.Rating;
