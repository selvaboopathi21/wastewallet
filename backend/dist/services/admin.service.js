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
exports.updateUserBlockStatus = exports.updateCollectorApproval = exports.getAdminReports = exports.getFraudAlerts = exports.getAllRates = exports.setRate = exports.findZoneByCoordinates = exports.updateZoneStatus = exports.getZones = exports.createZone = void 0;
// Admin Service: Business logic for Zones and Rate Cards
const mongoose_1 = require("mongoose");
const Zone_1 = __importDefault(require("../models/Zone"));
const RateCard_1 = __importDefault(require("../models/RateCard"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const constants_1 = require("../utils/constants");
const createZone = async ({ name, coordinates }) => {
    if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
        throw new ApiError_1.default(400, 'Zone name and valid polygon coordinates are required');
    }
    // GeoJSON Polygon rule: The first and last coordinate in the ring MUST match
    const firstRing = coordinates[0];
    if (firstRing.length < 4) {
        throw new ApiError_1.default(400, 'A polygon ring must have at least 4 coordinates');
    }
    const firstPt = firstRing[0];
    const lastPt = firstRing[firstRing.length - 1];
    if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
        // Automatically close the ring if caller omitted the repeat point
        firstRing.push([...firstPt]);
    }
    const existing = await Zone_1.default.findOne({ name });
    if (existing) {
        throw new ApiError_1.default(409, `A zone named "${name}" already exists`);
    }
    const zone = await Zone_1.default.create({
        name,
        polygon: {
            type: 'Polygon',
            coordinates,
        },
        isActive: true,
    });
    return zone;
};
exports.createZone = createZone;
const getZones = async (onlyActive = false) => {
    const filter = onlyActive ? { isActive: true } : {};
    return await Zone_1.default.find(filter).sort({ name: 1 });
};
exports.getZones = getZones;
const updateZoneStatus = async (zoneId, isActive) => {
    const zone = await Zone_1.default.findByIdAndUpdate(zoneId, { isActive }, { new: true });
    if (!zone) {
        throw new ApiError_1.default(404, 'Zone not found');
    }
    return zone;
};
exports.updateZoneStatus = updateZoneStatus;
/**
 * Finds which geographical Zone a given customer [longitude, latitude] point is inside
 * Uses MongoDB 2dsphere $geoIntersects operator.
 */
const findZoneByCoordinates = async (lng, lat) => {
    const zone = await Zone_1.default.findOne({
        isActive: true,
        polygon: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
            },
        },
    });
    return zone;
};
exports.findZoneByCoordinates = findZoneByCoordinates;
const setRate = async ({ category, ratePerKgPaise, zoneId = null, adminUserId, }) => {
    if (!constants_1.SCRAP_CATEGORIES.includes(category)) {
        throw new ApiError_1.default(400, `Invalid category. Must be one of: ${constants_1.SCRAP_CATEGORIES.join(', ')}`);
    }
    if (typeof ratePerKgPaise !== 'number' || ratePerKgPaise < 0 || !Number.isInteger(ratePerKgPaise)) {
        throw new ApiError_1.default(400, 'Rate must be a positive integer in paise (e.g. 3200 for ₹32/kg)');
    }
    const targetZoneId = zoneId ? new mongoose_1.Types.ObjectId(zoneId) : null;
    const rateDoc = await RateCard_1.default.findOneAndUpdate({ category, zoneId: targetZoneId }, {
        category,
        ratePerKgPaise,
        zoneId: targetZoneId,
        updatedBy: new mongoose_1.Types.ObjectId(adminUserId),
        effectiveFrom: new Date(),
    }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return rateDoc;
};
exports.setRate = setRate;
const getAllRates = async (zoneId) => {
    const targetZoneId = zoneId ? new mongoose_1.Types.ObjectId(zoneId) : null;
    return await RateCard_1.default.find({ zoneId: targetZoneId }).sort({ category: 1 });
};
exports.getAllRates = getAllRates;
const getFraudAlerts = async () => {
    const Batch = (await Promise.resolve().then(() => __importStar(require('../models/Batch')))).default;
    const PickupRequest = (await Promise.resolve().then(() => __importStar(require('../models/PickupRequest')))).default;
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const alerts = [];
    // 1. Check Loss Percentage Anomalies per Collector
    // Get all received or sorted batches with a valid loss percentage
    const batches = await Batch.find({ status: { $in: ['received', 'sorted'] }, lossPercent: { $ne: null } })
        .populate('collectorId', 'name phone');
    if (batches.length > 0) {
        // Calculate global average loss percent
        const totalLoss = batches.reduce((sum, b) => sum + (b.lossPercent || 0), 0);
        const globalAvgLoss = Number((totalLoss / batches.length).toFixed(2));
        // Group batches by collector
        const collectorLossMap = new Map();
        for (const b of batches) {
            if (!b.collectorId)
                continue;
            const cid = b.collectorId._id.toString();
            const existing = collectorLossMap.get(cid) || { totalLoss: 0, count: 0, collector: b.collectorId };
            existing.totalLoss += b.lossPercent || 0;
            existing.count += 1;
            collectorLossMap.set(cid, existing);
        }
        // Flag any collector whose average loss % exceeds acceptable threshold (20%) or exceeds global average
        for (const [cid, data] of collectorLossMap.entries()) {
            const avgLoss = Number((data.totalLoss / data.count).toFixed(2));
            const threshold = 20;
            if (avgLoss >= threshold && data.count >= 1) {
                alerts.push({
                    type: 'high_loss_percentage',
                    severity: avgLoss > 30 ? 'critical' : 'warning',
                    collectorId: cid,
                    collectorName: data.collector?.name || `Collector (${data.collector?.phone || 'Unknown'})`,
                    collectorPhone: data.collector?.phone || 'N/A',
                    metricValue: avgLoss,
                    thresholdValue: threshold,
                    message: `Collector average deposit loss of ${avgLoss}% exceeds normal loss tolerance (${threshold}%). Potential scale tampering, moisture loss, or non-recyclable contamination.`,
                });
            }
        }
    }
    // 2. Check Excessive Mixed Mode Pushing
    // When customers preferred separate price, check if collector frequently pushed them into mixed mode
    const pickupsWithPreference = await PickupRequest.find({
        status: 'completed',
        customerPricingPreference: 'best_price_separate',
    }).populate('collectorId', 'name phone');
    const collectorModeMap = new Map();
    for (const p of pickupsWithPreference) {
        if (!p.collectorId)
            continue;
        const cid = p.collectorId._id.toString();
        const data = collectorModeMap.get(cid) || { total: 0, forcedMixed: 0, collector: p.collectorId };
        data.total += 1;
        if (p.pricingMode === 'mixed') {
            data.forcedMixed += 1;
        }
        collectorModeMap.set(cid, data);
    }
    for (const [cid, data] of collectorModeMap.entries()) {
        if (data.total >= 3) {
            const mixedPercent = Number(((data.forcedMixed / data.total) * 100).toFixed(1));
            if (mixedPercent > 65) {
                alerts.push({
                    type: 'excessive_mixed_mode',
                    severity: 'warning',
                    collectorId: cid,
                    collectorName: data.collector.name || 'Unknown',
                    collectorPhone: data.collector.phone,
                    metricValue: mixedPercent,
                    thresholdValue: 65,
                    message: `Collector converted ${mixedPercent}% of pickups to mixed mode despite customer preference for itemized pricing. Potential margin exploitation.`,
                });
            }
        }
    }
    return alerts;
};
exports.getFraudAlerts = getFraudAlerts;
// --- ADMIN SYSTEM & PERFORMANCE REPORTS ---
const getAdminReports = async () => {
    const PickupRequest = (await Promise.resolve().then(() => __importStar(require('../models/PickupRequest')))).default;
    const PickupItem = (await Promise.resolve().then(() => __importStar(require('../models/PickupItem')))).default;
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const Batch = (await Promise.resolve().then(() => __importStar(require('../models/Batch')))).default;
    // 1. Overall Pickup Status Summary
    const statusCounts = await PickupRequest.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const statusSummary = {};
    statusCounts.forEach((s) => (statusSummary[s._id] = s.count));
    // 2. Total Weight and Volume Collected (Completed pickups)
    const totals = await PickupRequest.aggregate([
        { $match: { status: 'completed' } },
        {
            $group: {
                _id: null,
                totalWeightKg: { $sum: '$totalPickupWeightKg' },
                totalAmountPaise: { $sum: '$totalAmountPaise' },
                completedPickups: { $sum: 1 },
            },
        },
    ]);
    const overall = totals[0] || { totalWeightKg: 0, totalAmountPaise: 0, completedPickups: 0 };
    // 3. Category-wise Scrap Totals (from itemized line items)
    const categoryTotals = await PickupItem.aggregate([
        {
            $group: {
                _id: '$category',
                totalKg: { $sum: '$weightKg' },
                totalAmountPaise: { $sum: '$amountPaise' },
                itemsCount: { $sum: 1 },
            },
        },
        { $sort: { totalKg: -1 } },
    ]);
    // 4. Collector Leaderboard
    const collectorLeaderboard = await User.find({ role: 'collector' })
        .select('name phone rating storeName isApproved isOnline')
        .sort({ 'rating.avg': -1, 'rating.count': -1 })
        .limit(10);
    // 5. Active Fraud Alerts
    const fraudAlerts = await (0, exports.getFraudAlerts)();
    const totalPickupsCount = Object.values(statusSummary).reduce((a, b) => a + b, 0);
    return {
        totalPickups: totalPickupsCount,
        totalScrapWeightKg: Number((overall.totalWeightKg || 0).toFixed(2)),
        totalDisbursedPaise: overall.totalAmountPaise || 0,
        statusSummary,
        totals: {
            totalWeightKg: Number((overall.totalWeightKg || 0).toFixed(2)),
            totalAmountPaise: overall.totalAmountPaise || 0,
            totalAmountRupees: ((overall.totalAmountPaise || 0) / 100).toFixed(2),
            completedPickups: overall.completedPickups || 0,
        },
        categoryTotals: categoryTotals.map((c) => ({
            category: c._id,
            totalKg: Number(c.totalKg.toFixed(2)),
            totalAmountPaise: c.totalAmountPaise,
            totalAmountRupees: (c.totalAmountPaise / 100).toFixed(2),
            itemsCount: c.itemsCount,
        })),
        collectorLeaderboard,
        fraudAlerts,
    };
};
exports.getAdminReports = getAdminReports;
// --- USER MANAGEMENT (Approve / Block) ---
const updateCollectorApproval = async (collectorId, isApproved) => {
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const updateData = { isApproved };
    if (!isApproved) {
        updateData.isOnline = false;
    }
    const collector = await User.findOneAndUpdate({ _id: new mongoose_1.Types.ObjectId(collectorId), role: 'collector' }, updateData, { new: true }).populate('zoneId', 'name');
    if (!collector) {
        throw new ApiError_1.default(404, 'Collector not found');
    }
    // Real-time broadcast to collector
    try {
        const { getIO } = await Promise.resolve().then(() => __importStar(require('../sockets')));
        const io = getIO();
        io.to(`user:${collector._id.toString()}`).emit('collector.approval_changed', {
            isApproved: collector.isApproved,
            isOnline: collector.isOnline,
        });
    }
    catch (err) {
        // Socket broadcast non-blocking
    }
    return collector;
};
exports.updateCollectorApproval = updateCollectorApproval;
const updateUserBlockStatus = async (userId, isBlocked) => {
    const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
    const user = await User.findByIdAndUpdate(userId, { isBlocked }, { new: true });
    if (!user) {
        throw new ApiError_1.default(404, 'User not found');
    }
    return user;
};
exports.updateUserBlockStatus = updateUserBlockStatus;
exports.default = {
    createZone: exports.createZone,
    getZones: exports.getZones,
    updateZoneStatus: exports.updateZoneStatus,
    findZoneByCoordinates: exports.findZoneByCoordinates,
    setRate: exports.setRate,
    getAllRates: exports.getAllRates,
    getFraudAlerts: exports.getFraudAlerts,
    getAdminReports: exports.getAdminReports,
    updateCollectorApproval: exports.updateCollectorApproval,
    updateUserBlockStatus: exports.updateUserBlockStatus,
};
