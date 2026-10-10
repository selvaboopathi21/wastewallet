"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerPickups = exports.getPickupDetails = exports.createPickupRequest = void 0;
// Pickup Service: Business logic for scrap collection requests and zone detection
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const PickupItem_1 = __importDefault(require("../models/PickupItem"));
const admin_service_1 = __importDefault(require("./admin.service"));
const cloudinary_1 = require("../config/cloudinary");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
/**
 * Creates a new customer scrap pickup request with automatic zone detection
 */
const createPickupRequest = async ({ customerId, address, coordinates, preferredTime = 'anytime', customerPricingPreference = 'none', files = [], }) => {
    // 1. Validate address and GPS coordinates
    if (!address || !address.trim()) {
        throw new ApiError_1.default(400, 'Pickup address is required');
    }
    if (!coordinates ||
        !Array.isArray(coordinates) ||
        coordinates.length !== 2 ||
        typeof coordinates[0] !== 'number' ||
        typeof coordinates[1] !== 'number') {
        throw new ApiError_1.default(400, 'Valid GPS coordinates [longitude, latitude] are required');
    }
    const [lng, lat] = coordinates;
    // 2. Automatic Zone Detection: Check which collection zone covers this location
    const detectedZone = await admin_service_1.default.findZoneByCoordinates(lng, lat);
    if (!detectedZone) {
        throw new ApiError_1.default(400, 'Sorry, we do not currently service scrap pickups at this location. Please check our supported collection zones.');
    }
    // 3. Upload photos to Cloudinary (or dev fallback)
    const photoUrls = [];
    if (files && files.length > 0) {
        for (const file of files) {
            const url = await (0, cloudinary_1.uploadImageBuffer)(file.buffer, 'wastewallet/pickups');
            photoUrls.push(url);
        }
    }
    // 4. Default pricing mode based on customer preference
    const initialPricingMode = customerPricingPreference === 'quick_mixed' ? 'mixed' : 'separate';
    // 5. Create Pickup Request in MongoDB
    const pickup = await PickupRequest_1.default.create({
        customerId,
        zoneId: detectedZone._id,
        address: address.trim(),
        location: {
            type: 'Point',
            coordinates: [lng, lat],
        },
        photos: photoUrls,
        preferredTime,
        customerPricingPreference,
        pricingMode: initialPricingMode,
        status: 'pending',
        offeredTo: [],
        scalePhotos: [],
    });
    return pickup;
};
exports.createPickupRequest = createPickupRequest;
/**
 * Retrieve single pickup request with its line items
 */
const getPickupDetails = async (pickupId) => {
    const pickup = await PickupRequest_1.default.findById(pickupId)
        .populate('customerId', 'name phone')
        .populate('collectorId', 'name phone storeName rating')
        .populate('zoneId', 'name');
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found');
    }
    const items = await PickupItem_1.default.find({ requestId: pickup._id });
    return {
        pickup,
        items,
    };
};
exports.getPickupDetails = getPickupDetails;
/**
 * Get all pickup requests for a specific customer
 */
const getCustomerPickups = async (customerId) => {
    return await PickupRequest_1.default.find({ customerId })
        .populate('zoneId', 'name')
        .populate('collectorId', 'name phone')
        .sort({ createdAt: -1 });
};
exports.getCustomerPickups = getCustomerPickups;
exports.default = {
    createPickupRequest: exports.createPickupRequest,
    getPickupDetails: exports.getPickupDetails,
    getCustomerPickups: exports.getCustomerPickups,
};
