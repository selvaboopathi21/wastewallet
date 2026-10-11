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
exports.Batch = void 0;
// Batch Model: Collector deposits daily pickups at the store using a QR code
const mongoose_1 = __importStar(require("mongoose"));
const batchSchema = new mongoose_1.Schema({
    collectorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Collector ID is required'],
        index: true,
    },
    pickupRequestIds: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'PickupRequest',
            required: true,
        },
    ],
    qrCode: {
        type: String,
        required: [true, 'Batch QR code is required'],
        unique: true,
        index: true,
    },
    depositedWeightKg: {
        type: Number,
        required: [true, 'Deposited weight is required'],
        min: 0,
    },
    receivedWeightKg: {
        type: Number,
        default: null,
        min: 0,
    },
    lossPercent: {
        type: Number,
        default: null, // Computed as ((deposited - received) / deposited) * 100
    },
    status: {
        type: String,
        enum: ['deposited', 'received', 'sorted'],
        default: 'deposited',
        index: true,
    },
    receivedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    depositedAt: {
        type: Date,
        default: Date.now,
    },
    receivedAt: {
        type: Date,
        default: null,
    },
    sortedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});
exports.Batch = mongoose_1.default.model('Batch', batchSchema);
exports.default = exports.Batch;
