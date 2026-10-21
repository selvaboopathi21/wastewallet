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
exports.StaffNotification = void 0;
// StaffNotification Model: In-app notifications and receipt messages from tie-up companies
const mongoose_1 = __importStar(require("mongoose"));
const staffNotificationSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['company_receipt', 'batch_deposit', 'alert'],
        default: 'company_receipt',
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Notification title is required'],
        trim: true,
    },
    message: {
        type: String,
        required: [true, 'Notification message is required'],
        trim: true,
    },
    companyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Buyer',
        default: null,
        index: true,
    },
    companyName: {
        type: String,
        default: '',
        trim: true,
    },
    dispatchId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CompanyDispatch',
        default: null,
        index: true,
    },
    materialType: {
        type: String,
        default: '',
    },
    weightKg: {
        type: Number,
        default: null,
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
}, {
    timestamps: true,
});
exports.StaffNotification = mongoose_1.default.model('StaffNotification', staffNotificationSchema);
exports.default = exports.StaffNotification;
