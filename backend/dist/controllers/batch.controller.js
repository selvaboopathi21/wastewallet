"use strict";
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
    const collectorId = req.user._id.toString();
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
    const collectorId = req.user.role === 'collector' ? req.user._id.toString() : undefined;
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
