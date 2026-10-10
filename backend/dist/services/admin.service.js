"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllRates = exports.setRate = exports.findZoneByCoordinates = exports.updateZoneStatus = exports.getZones = exports.createZone = void 0;
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
exports.default = {
    createZone: exports.createZone,
    getZones: exports.getZones,
    updateZoneStatus: exports.updateZoneStatus,
    findZoneByCoordinates: exports.findZoneByCoordinates,
    setRate: exports.setRate,
    getAllRates: exports.getAllRates,
};
