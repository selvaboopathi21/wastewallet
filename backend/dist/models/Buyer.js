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
exports.Buyer = void 0;
// Buyer Model: Recyclers and specialized recovery units that receive sorted materials
const mongoose_1 = __importStar(require("mongoose"));
const constants_1 = require("../utils/constants");
const buyerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Buyer name is required'],
        trim: true,
    },
    acceptedMaterials: [
        {
            type: String,
            enum: constants_1.SCRAP_CATEGORIES,
            required: true,
        },
    ],
    location: {
        type: String,
        default: '',
    },
    contact: {
        phone: {
            type: String,
            required: [true, 'Buyer phone number is required'],
        },
        email: {
            type: String,
            default: '',
        },
        person: {
            type: String,
            default: '',
        },
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true,
    },
}, {
    timestamps: true,
});
exports.Buyer = mongoose_1.default.model('Buyer', buyerSchema);
exports.default = exports.Buyer;
