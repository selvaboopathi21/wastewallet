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
exports.respondSeparatePrice = exports.finishPickup = exports.recordCashPayment = exports.requestConfirmationOtp = exports.recordWeights = exports.getActiveJobs = exports.updatePickupStatus = exports.declinePickupOffer = exports.acceptPickupOffer = exports.getMyOffers = exports.toggleOnlineStatus = void 0;
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
    const collector = await User_1.default.findById(collectorId);
    if (!collector) {
        throw new ApiError_1.default(404, 'Collector not found');
    }
    // Strict approval enforcement: unapproved collectors cannot go online!
    if (isOnline && !collector.isApproved) {
        throw new ApiError_1.default(403, 'Your account is pending review by Admin. You cannot go online until approved.');
    }
    collector.isOnline = isOnline;
    await collector.save();
    res.status(200).json({
        success: true,
        message: `Collector is now ${isOnline ? 'Online (Ready for pickups)' : 'Offline'}`,
        data: { isOnline: collector.isOnline, isApproved: collector.isApproved },
    });
});
// GET /api/v1/collector/offers (Get pending job offers for this collector)
exports.getMyOffers = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id;
    const isApproved = req.user.isApproved;
    // Unapproved collectors must NOT receive any offers
    if (!isApproved) {
        return res.status(200).json({
            success: true,
            message: 'Pending Admin verification. No offers available until approved.',
            data: { offers: [] },
        });
    }
    const userZoneId = req.user.zoneId;
    const now = new Date();
    // Find active, unexpired offers:
    // 1. Specifically offered to this collector (currentOfferCollectorId = collectorId)
    // 2. OR open broadcast in their zone (currentOfferCollectorId = null / unset)
    const recipientCondition = userZoneId
        ? {
            $or: [
                { currentOfferCollectorId: collectorId },
                {
                    $and: [
                        {
                            $or: [
                                { currentOfferCollectorId: null },
                                { currentOfferCollectorId: { $exists: false } },
                            ],
                        },
                        {
                            $or: [
                                { zoneId: userZoneId },
                                { zoneId: null },
                                { zoneId: { $exists: false } },
                            ],
                        },
                    ],
                },
            ],
        }
        : {
            $or: [
                { currentOfferCollectorId: collectorId },
                { currentOfferCollectorId: null },
                { currentOfferCollectorId: { $exists: false } },
            ],
        };
    const offers = await PickupRequest_1.default.find({
        status: { $in: ['offered', 'pending'] },
        declinedBy: { $nin: [collectorId] }, // Exclude only if this collector explicitly passed on this offer
        ...recipientCondition,
        $and: [
            {
                $or: [
                    { offerExpiresAt: { $gt: now } },
                    { offerExpiresAt: null },
                ],
            },
        ],
    })
        .populate('customerId', 'name phone address')
        .populate('zoneId', 'name')
        .sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        message: 'Pending offers retrieved successfully',
        data: { offers },
    });
});
// POST /api/v1/collector/pickups/:id/accept (Atomic Accept)
exports.acceptPickupOffer = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const isApproved = req.user.isApproved;
    if (!isApproved) {
        throw new ApiError_1.default(403, 'Your account is pending review by Admin. You cannot accept pickups until verified.');
    }
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
    const isApproved = req.user.isApproved;
    if (!isApproved) {
        throw new ApiError_1.default(403, 'Your account is pending review by Admin. You cannot execute pickups until verified.');
    }
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
    const isApproved = req.user.isApproved;
    if (!isApproved) {
        return res.status(200).json({
            success: true,
            message: 'Pending Admin verification. No active jobs.',
            data: {
                activeJobs: [],
                completedJobs: [],
                stats: { completedToday: 0, totalWeightKg: 0, totalCashPaid: 0 },
            },
        });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [activeJobs, completedTodayJobs] = await Promise.all([
        PickupRequest_1.default.find({
            collectorId,
            status: { $in: ['accepted', 'on_the_way', 'arrived', 'weighed', 'confirmed'] },
        })
            .populate('customerId', 'name phone address')
            .populate('zoneId', 'name')
            .sort({ updatedAt: -1 }),
        PickupRequest_1.default.find({
            collectorId,
            status: { $in: ['paid', 'completed'] },
            updatedAt: { $gte: startOfToday },
        })
            .populate('customerId', 'name phone address')
            .populate('zoneId', 'name')
            .sort({ updatedAt: -1 }),
    ]);
    const totalCashPaise = completedTodayJobs.reduce((acc, j) => acc + (j.totalAmountPaise || 0), 0);
    const totalWeightKg = completedTodayJobs.reduce((acc, j) => acc + (j.totalPickupWeightKg || 0), 0);
    res.status(200).json({
        success: true,
        message: 'Active collector jobs retrieved successfully',
        data: {
            activeJobs,
            completedJobs: completedTodayJobs,
            stats: {
                completedToday: completedTodayJobs.length,
                totalWeightKg: Number(totalWeightKg.toFixed(1)),
                totalCashPaid: Number((totalCashPaise / 100).toFixed(0)),
            },
        },
    });
});
// POST /api/v1/collector/pickups/:id/weights (Enter on-site weights)
exports.recordWeights = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const { mode, items, scalePhotos } = req.body;
    const pricingService = (await Promise.resolve().then(() => __importStar(require('../services/pricing.service')))).default;
    const result = await pricingService.recordWeighedItems({
        pickupId: id,
        collectorId,
        mode: mode || 'separate',
        items,
        scalePhotoUrls: scalePhotos || [],
    });
    res.status(200).json({
        success: true,
        message: `Weights recorded successfully. Total: ₹${(result.pickup.totalAmountPaise / 100).toFixed(2)}`,
        data: {
            pickup: result.pickup,
            items: result.items,
        },
    });
});
// POST /api/v1/collector/pickups/:id/request-otp (Trigger confirmation OTP to customer)
exports.requestConfirmationOtp = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const pricingService = (await Promise.resolve().then(() => __importStar(require('../services/pricing.service')))).default;
    const result = await pricingService.requestCustomerConfirmationOtp(id, collectorId);
    res.status(200).json({
        success: true,
        message: `6-digit confirmation OTP sent to customer (${result.phone})`,
        data: result,
    });
});
// POST /api/v1/collector/pickups/:id/pay-cash (Collector marks cash paid)
exports.recordCashPayment = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const paymentService = (await Promise.resolve().then(() => __importStar(require('../services/payment.service')))).default;
    const result = await paymentService.processCashPayment(id, collectorId);
    res.status(200).json({
        success: true,
        message: `Cash payment of ₹${(result.pickup.totalAmountPaise / 100).toFixed(2)} recorded successfully`,
        data: result,
    });
});
// POST /api/v1/collector/pickups/:id/complete (Collector finalizes completed pickup)
exports.finishPickup = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const paymentService = (await Promise.resolve().then(() => __importStar(require('../services/payment.service')))).default;
    const completedPickup = await paymentService.completePickup(id, collectorId);
    res.status(200).json({
        success: true,
        message: 'Pickup marked completed successfully!',
        data: { pickup: completedPickup },
    });
});
// POST /api/v1/collector/pickups/:id/respond-separate (Collector accepts/declines separate price request)
exports.respondSeparatePrice = (0, asyncHandler_1.default)(async (req, res) => {
    const collectorId = req.user._id.toString();
    const { id } = req.params;
    const { action, declineReason } = req.body;
    const pricingService = (await Promise.resolve().then(() => __importStar(require('../services/pricing.service')))).default;
    const updatedPickup = await pricingService.respondSeparatePrice(id, collectorId, action, declineReason);
    res.status(200).json({
        success: true,
        message: `Separate price request ${action}ed successfully`,
        data: { pickup: updatedPickup },
    });
});
exports.default = {
    toggleOnlineStatus: exports.toggleOnlineStatus,
    getMyOffers: exports.getMyOffers,
    acceptPickupOffer: exports.acceptPickupOffer,
    declinePickupOffer: exports.declinePickupOffer,
    updatePickupStatus: exports.updatePickupStatus,
    getActiveJobs: exports.getActiveJobs,
    recordWeights: exports.recordWeights,
    requestConfirmationOtp: exports.requestConfirmationOtp,
    recordCashPayment: exports.recordCashPayment,
    finishPickup: exports.finishPickup,
    respondSeparatePrice: exports.respondSeparatePrice,
};
