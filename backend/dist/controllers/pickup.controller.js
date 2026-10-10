"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPickups = exports.getPickup = exports.createPickup = void 0;
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
exports.default = {
    createPickup: exports.createPickup,
    getPickup: exports.getPickup,
    getMyPickups: exports.getMyPickups,
};
