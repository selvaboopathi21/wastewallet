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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestSeparatePrice = exports.confirmPickupOtp = exports.getMyPickups = exports.getPickup = exports.createPickup = void 0;
const pickup_service_1 = __importDefault(require("../services/pickup.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// POST /api/v1/pickups (Customer creates scrap pickup)
exports.createPickup = (0, asyncHandler_1.default)(async (req, res) => {
    const customerId = req.user._id.toString();
    const { address, preferredTime, customerPricingPreference } = req.body;
    // Handle coordinates from either JSON body or multipart form-data string
    let coordinates = req.body.coordinates;
    if (typeof coordinates === 'string') {
        try {
            coordinates = JSON.parse(coordinates);
        }
        catch {
            throw new ApiError_1.default(400, 'Invalid coordinates format. Expected [longitude, latitude]');
        }
    }
    const files = req.files || [];
    const pickup = await pickup_service_1.default.createPickupRequest({
        customerId,
        address,
        coordinates,
        preferredTime,
        customerPricingPreference,
        files,
    });
    res.status(201).json({
        success: true,
        message: 'Scrap pickup request created successfully and queued for dispatch',
        data: { pickup },
    });
});
// GET /api/v1/pickups/:id
exports.getPickup = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const data = await pickup_service_1.default.getPickupDetails(id);
    res.status(200).json({
        success: true,
        message: 'Pickup details retrieved successfully',
        data,
    });
});
// GET /api/v1/pickups (List pickups for logged-in customer)
exports.getMyPickups = (0, asyncHandler_1.default)(async (req, res) => {
    const customerId = req.user._id.toString();
    const pickups = await pickup_service_1.default.getCustomerPickups(customerId);
    res.status(200).json({
        success: true,
        message: 'Pickup history retrieved successfully',
        data: { pickups },
    });
});
// POST /api/v1/pickups/:id/confirm-otp (Customer inputs OTP to lock weight & amount)
exports.confirmPickupOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const customerId = req.user._id.toString();
    const { id } = req.params;
    const { otp } = req.body;
    if (!otp) {
        throw new ApiError_1.default(400, '6-digit OTP code is required');
    }
    const pricingService = (await Promise.resolve().then(() => __importStar(require('../services/pricing.service')))).default;
    const confirmedPickup = await pricingService.confirmPickupWithOtp(id, customerId, otp);
    res.status(200).json({
        success: true,
        message: `Pickup confirmed successfully! Amount locked at ₹${(confirmedPickup.totalAmountPaise / 100).toFixed(2)}.`,
        data: { pickup: confirmedPickup },
    });
});
// POST /api/v1/pickups/:id/request-separate (Customer requests separate price breakdown)
exports.requestSeparatePrice = (0, asyncHandler_1.default)(async (req, res) => {
    const customerId = req.user._id.toString();
    const { id } = req.params;
    const pricingService = (await Promise.resolve().then(() => __importStar(require('../services/pricing.service')))).default;
    const updatedPickup = await pricingService.requestSeparatePrice(id, customerId);
    res.status(200).json({
        success: true,
        message: 'Separate price request sent to collector',
        data: { pickup: updatedPickup },
    });
});
exports.default = {
    createPickup: exports.createPickup,
    getPickup: exports.getPickup,
    getMyPickups: exports.getMyPickups,
    confirmPickupOtp: exports.confirmPickupOtp,
    requestSeparatePrice: exports.requestSeparatePrice,
};
