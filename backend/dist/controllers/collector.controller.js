"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveJobs = exports.updatePickupStatus = exports.declinePickupOffer = exports.acceptPickupOffer = exports.getMyOffers = exports.toggleOnlineStatus = void 0;
const dispatch_service_1 = __importDefault(require("../services/dispatch.service"));
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const User_1 = __importDefault(require("../models/User"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// PATCH /api/v1/collector/status (Go Online / Offline)
exports.toggleOnlineStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id;
    const { isOnline } = req.body;
    if (typeof isOnline !== 'boolean') {
        throw new ApiError_1.default(400, 'isOnline must be a boolean (true or false)');
    }
    const collector = await User_1.default.findByIdAndUpdate(collectorId, { isOnline }, { new: true });
    res.status(200).json({
        success: true,
        message: `Collector is now ${isOnline ? 'Online (Ready for pickups)' : 'Offline'}`,
        data: { isOnline: collector?.isOnline },
    });
});
// GET /api/v1/collector/offers (Get pending job offers for this collector)
exports.getMyOffers = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id;
    const now = new Date();
    // Find active, unexpired offers currently held by this collector
    const offers = await PickupRequest_1.default.find({
        status: 'offered',
        currentOfferCollectorId: collectorId,
        offerExpiresAt: { $gt: now },
    })
        .populate('customerId', 'name phone')
        .populate('zoneId', 'name');
    res.status(200).json({
        success: true,
        message: 'Pending offers retrieved successfully',
        data: { offers },
    });
});
// POST /api/v1/collector/pickups/:id/accept (Atomic Accept)
exports.acceptPickupOffer = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const acceptedPickup = await dispatch_service_1.default.atomicAcceptPickup(id, collectorId);
    res.status(200).json({
        success: true,
        message: 'Pickup offer accepted successfully! You are now assigned to this pickup.',
        data: { pickup: acceptedPickup },
    });
});
// POST /api/v1/collector/pickups/:id/decline (Decline offer)
exports.declinePickupOffer = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    await dispatch_service_1.default.declinePickup(id, collectorId);
    res.status(200).json({
        success: true,
        message: 'Offer declined. It has been moved to the next available collector.',
    });
});
// PATCH /api/v1/collector/pickups/:id/status (Transition status e.g. on_the_way, arrived)
exports.updatePickupStatus = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        throw new ApiError_1.default(400, 'New status is required');
    }
    const updatedPickup = await dispatch_service_1.default.transitionPickupStatus(id, collectorId, status);
    res.status(200).json({
        success: true,
        message: `Pickup status updated to "${status}"`,
        data: { pickup: updatedPickup },
    });
});
// GET /api/v1/collector/active-jobs
exports.getActiveJobs = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id;
    const activeJobs = await PickupRequest_1.default.find({
        collectorId,
        status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed', 'confirmed'] },
    })
        .populate('customerId', 'name phone')
        .populate('zoneId', 'name')
        .sort({ updatedAt: -1 });
    res.status(200).json({
        success: true,
        message: 'Active collector jobs retrieved successfully',
        data: { activeJobs },
    });
});
exports.default = {
    toggleOnlineStatus: exports.toggleOnlineStatus,
    getMyOffers: exports.getMyOffers,
    acceptPickupOffer: exports.acceptPickupOffer,
    declinePickupOffer: exports.declinePickupOffer,
    updatePickupStatus: exports.updatePickupStatus,
    getActiveJobs: exports.getActiveJobs,
};
