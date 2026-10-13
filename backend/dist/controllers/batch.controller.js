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
exports.listBatches = exports.getBatch = exports.sortBatch = exports.receiveBatch = exports.createBatch = void 0;
const batch_service_1 = __importDefault(require("../services/batch.service"));
const asyncHandler_1 = __importDefault(require("../utils/asyncHandler"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
// POST /api/v1/batches (Collector deposits completed pickups)
exports.createBatch = (0, asyncHandler_1.default)(async (req, res) => {
    let collectorId = req.body?.collectorId || req.user._id.toString();
    if (req.user.role !== 'collector' && !req.body?.collectorId) {
        const User = (await Promise.resolve().then(() => __importStar(require('../models/User')))).default;
        const defaultCollector = await User.findOne({ role: 'collector', phone: '9876500001' });
        if (defaultCollector) {
            collectorId = defaultCollector._id.toString();
        }
    }
    const batch = await batch_service_1.default.createDepositBatch(collectorId);
    res.status(201).json({
        success: true,
        message: `Batch deposit QR generated successfully: ${batch.qrCode}`,
        data: { batch },
    });
});
// POST /api/v1/batches/:qrCode/receive (Store Staff scans QR & inputs received weight)
exports.receiveBatch = (0, asyncHandler_1.default)(async (req, res) => {
    const { qrCode } = req.params;
    const { receivedWeightKg } = req.body;
    const staffId = req.user._id.toString();
    if (receivedWeightKg === undefined || receivedWeightKg === null) {
        throw new ApiError_1.default(400, 'receivedWeightKg is required');
    }
    const batch = await batch_service_1.default.receiveBatch(qrCode, staffId, Number(receivedWeightKg));
    res.status(200).json({
        success: true,
        message: `Batch received! Computed weight loss: ${batch.lossPercent}%`,
        data: { batch },
    });
});
// POST /api/v1/batches/:id/sort (Store Staff records category-wise sorted weights)
exports.sortBatch = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
        throw new ApiError_1.default(400, 'An array of sorted material items is required');
    }
    const result = await batch_service_1.default.sortBatchMaterials(id, items);
    res.status(200).json({
        success: true,
        message: `Batch sorted into ${result.sortedMaterials.length} materials and routed to buyers`,
        data: result,
    });
});
// GET /api/v1/batches/:id (Full batch traceability details)
exports.getBatch = (0, asyncHandler_1.default)(async (req, res) => {
    const { id } = req.params;
    const data = await batch_service_1.default.getBatchDetails(id);
    res.status(200).json({
        success: true,
        message: 'Batch details retrieved successfully',
        data,
    });
});
// GET /api/v1/batches (List batches)
exports.listBatches = (0, asyncHandler_1.default)(async (req, res) => {
    const status = req.query.status;
    const isStoreView = req.query.view === 'store' ||
        req.query.all === 'true' ||
        ['store_staff', 'admin'].includes(req.user.role);
    const collectorId = !isStoreView && req.user.role === 'collector'
        ? req.user._id.toString()
        : undefined;
    const batches = await batch_service_1.default.listBatches(collectorId, status);
    res.status(200).json({
        success: true,
        message: 'Batches retrieved successfully',
        data: { batches },
    });
});
exports.default = {
    createBatch: exports.createBatch,
    receiveBatch: exports.receiveBatch,
    sortBatch: exports.sortBatch,
    getBatch: exports.getBatch,
    listBatches: exports.listBatches,
};
