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
exports.CompanyDispatch = void 0;
// CompanyDispatch Model: Tracks scrap handover/dispatches from Store Staff to Tie-Up Recycling Companies
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../utils/constants");
const companyDispatchSchema = new mongoose_1.Schema({
    dispatchCode: {
        type: String,
        required: [true, 'Dispatch code is required'],
        unique: true,
        index: true,
        trim: true,
    },
    storeStaffId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Store staff ID is required'],
        index: true,
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Buyer',
        required: [true, 'Tie-up company ID is required'],
        index: true,
    },
    companyName: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    materialType: {
        type: String,
        enum: constants_1.SCRAP_CATEGORIES,
        required: [true, 'Material type is required'],
        index: true,
    },
    weightKg: {
        type: Number,
        required: [true, 'Dispatched weight in kg is required'],
        min: [0.1, 'Weight must be at least 0.1 kg'],
    },
    vehicleNumber: {
        type: String,
        default: '',
        trim: true,
    },
    dispatchNotes: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: ['dispatched', 'received', 'rejected'],
        default: 'dispatched',
        index: true,
    },
    dispatchedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    receivedWeightKg: {
        type: Number,
        default: null,
        min: 0,
    },
    receivedAt: {
        type: Date,
        default: null,
    },
    receivedNotes: {
        type: String,
        default: '',
        trim: true,
    },
    receiptMessage: {
        type: String,
        default: '',
        trim: true,
    },
    batchId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Batch',
        default: null,
    },
}, {
    timestamps: true,
});
exports.CompanyDispatch = mongoose_1.default.model('CompanyDispatch', companyDispatchSchema);
exports.default = exports.CompanyDispatch;
