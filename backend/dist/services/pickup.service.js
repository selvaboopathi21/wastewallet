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
exports.cancelPickupRequest = exports.getCustomerPickups = exports.getPickupDetails = exports.createPickupRequest = void 0;
// Pickup Service: Business logic for scrap collection requests and zone detection
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const PickupItem_1 = __importDefault(require("../models/PickupItem"));
const admin_service_1 = __importDefault(require("./admin.service"));
const cloudinary_1 = require("../config/cloudinary");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
/**
 * Creates a new customer scrap pickup request with automatic zone detection
 */
const createPickupRequest = async ({ customerId, customerName, customerPhone, address, coordinates, preferredTime = 'anytime', customerPricingPreference = 'none', files = [], zoneId, }) => {
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
    // 2. Automatic Zone Detection: Check coordinates, fallback to provided zoneId, or active zone
    let detectedZone = await admin_service_1.default.findZoneByCoordinates(lng, lat);
    if (!detectedZone && zoneId) {
        const Zone = (await Promise.resolve().then(() => __importStar(require('../models/Zone')))).default;
        detectedZone = await Zone.findById(zoneId);
    }
    if (!detectedZone) {
        const Zone = (await Promise.resolve().then(() => __importStar(require('../models/Zone')))).default;
        detectedZone = await Zone.findOne({ isActive: true });
    }
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
    // 4. Normalize and map customer pricing preference
    let normalizedPref = customerPricingPreference || 'none';
    if (normalizedPref === 'separate')
        normalizedPref = 'best_price_separate';
    if (normalizedPref === 'mixed')
        normalizedPref = 'quick_mixed';
    const initialPricingMode = normalizedPref === 'quick_mixed' ? 'mixed' : 'separate';
    // 4b. Resolve real customer name & phone
    let finalCustomerName = (customerName || '').trim();
    let finalCustomerPhone = (customerPhone || '').trim();
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const customerUser = await User.findById(customerId);
    if (customerUser) {
        if (!finalCustomerName) {
            finalCustomerName = customerUser.name || 'Customer';
        }
        if (!finalCustomerPhone) {
            finalCustomerPhone = customerUser.phone || '';
        }
        // If user provided a real custom name during request and user profile was blank or generic, update user profile
        if (customerName && customerName.trim() && (!customerUser.name || customerUser.name === 'Customer')) {
            customerUser.name = customerName.trim();
            await customerUser.save().catch(() => { });
        }
    }
    // 5. Create Pickup Request in MongoDB
    const pickup = await PickupRequest_1.default.create({
        customerId,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        zoneId: detectedZone._id,
        address: address.trim(),
        location: {
            type: 'Point',
            coordinates: [lng, lat],
        },
        photos: photoUrls,
        preferredTime,
        customerPricingPreference: normalizedPref,
        pricingMode: initialPricingMode,
        status: 'pending',
        offeredTo: [],
        scalePhotos: [],
    });
    // 6. Automatically dispatch to best online collector in zone
    const dispatchService = (await Promise.resolve().then(() => __importStar(require('./dispatch.service')))).default;
    const dispatchedPickup = await dispatchService.dispatchPickupRequest(pickup._id);
    return dispatchedPickup || pickup;
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
/**
 * Cancels a pickup request (by customer or admin)
 */
const cancelPickupRequest = async (pickupId, userId, userRole) => {
    const pickup = await PickupRequest_1.default.findById(pickupId);
    if (!pickup) {
        throw new ApiError_1.default(404, 'Pickup request not found');
    }
    // Ensure only the customer who booked it or an admin can cancel
    if (userRole !== 'admin' && pickup.customerId.toString() !== userId) {
        throw new ApiError_1.default(403, 'You do not have permission to cancel this pickup');
    }
    // Prevent cancellation if already arrived, weighed, confirmed, or completed
    if (['arrived', 'weighed', 'confirmed', 'paid', 'completed'].includes(pickup.status)) {
        throw new ApiError_1.default(400, `Cannot cancel pickup once collector has arrived (Current status: ${pickup.status})`);
    }
    const previousStatus = pickup.status;
    const assignedCollectorId = pickup.collectorId ? pickup.collectorId.toString() : null;
    const currentOfferCollectorId = pickup.currentOfferCollectorId ? pickup.currentOfferCollectorId.toString() : null;
    pickup.status = 'cancelled';
    pickup.currentOfferCollectorId = null;
    pickup.offerExpiresAt = null;
    await pickup.save();
    try {
        const sockets = (await Promise.resolve().then(() => __importStar(require('../sockets')))).default;
        const { getIO } = await Promise.resolve().then(() => __importStar(require('../sockets')));
        const io = getIO();
        const payload = {
            pickupId: pickup._id.toString(),
            requestId: pickup._id.toString(),
            newStatus: 'cancelled',
            status: 'cancelled',
            previousStatus,
        };
        // 1. Emit to pickup room
        sockets.emitStatusChanged(pickup._id.toString(), payload);
        io.to(`pickup:${pickup._id.toString()}`).emit('pickup.cancelled', payload);
        // 2. Broadcast globally so all collectors viewing incoming offers drop it immediately
        io.emit('pickup.cancelled', payload);
        io.emit('pickup.status.changed', payload);
        // 3. Emit directly to the assigned or targeted collector's private user room
        if (assignedCollectorId) {
            io.to(`user:${assignedCollectorId}`).emit('pickup.cancelled', payload);
            io.to(`user:${assignedCollectorId}`).emit('pickup.status.changed', payload);
        }
        if (currentOfferCollectorId && currentOfferCollectorId !== assignedCollectorId) {
            io.to(`user:${currentOfferCollectorId}`).emit('pickup.cancelled', payload);
            io.to(`user:${currentOfferCollectorId}`).emit('pickup.status.changed', payload);
        }
    }
    catch (err) {
        // Sockets emission non-blocking
    }
    return pickup;
};
exports.cancelPickupRequest = cancelPickupRequest;
exports.default = {
    createPickupRequest: exports.createPickupRequest,
    getPickupDetails: exports.getPickupDetails,
    getCustomerPickups: exports.getCustomerPickups,
    cancelPickupRequest: exports.cancelPickupRequest,
};
