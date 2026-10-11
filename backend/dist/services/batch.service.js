"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBatches = exports.getBatchDetails = exports.sortBatchMaterials = exports.receiveBatch = exports.createDepositBatch = void 0;
// Batch Service: Business logic for daily batch deposits, loss % computation, sorting & buyer routing
const mongoose_1 = require("mongoose");
const Batch_1 = __importDefault(require("../models/Batch"));
const PickupRequest_1 = __importDefault(require("../models/PickupRequest"));
const SortedMaterial_1 = __importDefault(require("../models/SortedMaterial"));
const Buyer_1 = __importDefault(require("../models/Buyer"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * 1. Collector bundles completed pickups into a daily deposit Batch with QR code
 */
const createDepositBatch = async (collectorId) => {
    // Find all pickups already attached to existing batches
    const existingBatches = await Batch_1.default.find({}, { pickupRequestIds: 1 });
    const alreadyBatchedPickupIds = existingBatches.flatMap((b) => b.pickupRequestIds);
    // Find eligible completed pickups for this collector that have not been deposited yet
    const eligiblePickups = await PickupRequest_1.default.find({
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
        status: 'completed',
        _id: { $nin: alreadyBatchedPickupIds },
    });
    if (eligiblePickups.length === 0) {
        throw new ApiError_1.default(400, 'No completed pickups available to deposit. Complete pickups first before generating a batch.');
    }
    // Compute total deposited weight from the sum of all pickups
    const depositedWeightKg = Number(eligiblePickups.reduce((sum, p) => sum + (p.totalPickupWeightKg || 0), 0).toFixed(2));
    // Generate a unique human & scanner friendly QR code string (e.g. BATCH-M2K8P-4821)
    const qrCode = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const batch = await Batch_1.default.create({
        collectorId: new mongoose_1.Types.ObjectId(collectorId),
        pickupRequestIds: eligiblePickups.map((p) => p._id),
        qrCode,
        depositedWeightKg,
        status: 'deposited',
        depositedAt: new Date(),
    });
    logger_1.default.info(`📦 Collector ${collectorId} created batch ${batch.qrCode}: ${eligiblePickups.length} pickups, ${depositedWeightKg} kg.`);
    return batch;
};
exports.createDepositBatch = createDepositBatch;
/**
 * 2. Store staff scans the batch QR code and records the physical received weight
 * Automatically calculates loss percentage: ((deposited - received) / deposited) * 100
 */
const receiveBatch = async (qrCode, staffId, receivedWeightKg) => {
    if (typeof receivedWeightKg !== 'number' || receivedWeightKg < 0) {
        throw new ApiError_1.default(400, 'Valid received weight in kg is required');
    }
    const batch = await Batch_1.default.findOne({ qrCode });
    if (!batch) {
        throw new ApiError_1.default(404, `Batch with QR code "${qrCode}" not found`);
    }
    if (batch.status !== 'deposited') {
        throw new ApiError_1.default(400, `Batch cannot be received. Current status is "${batch.status}".`);
    }
    // Calculate loss percentage (dust, moisture, dirt, non-recyclables)
    const diff = batch.depositedWeightKg - receivedWeightKg;
    const lossPercent = batch.depositedWeightKg > 0
        ? Number(((diff / batch.depositedWeightKg) * 100).toFixed(2))
        : 0;
    batch.receivedWeightKg = Number(receivedWeightKg.toFixed(2));
    batch.lossPercent = lossPercent;
    batch.receivedBy = new mongoose_1.Types.ObjectId(staffId);
    batch.receivedAt = new Date();
    batch.status = 'received';
    await batch.save();
    logger_1.default.info(`🏬 Store staff received batch ${batch.qrCode}: Deposited ${batch.depositedWeightKg} kg, Received ${receivedWeightKg} kg (Loss: ${lossPercent}%)`);
    return batch;
};
exports.receiveBatch = receiveBatch;
/**
 * 3. Store staff records category-wise sorted weights.
 * E-waste & batteries are flagged for special handling.
 * Automatically routes each material to an active Buyer matching acceptedMaterials.
 */
const sortBatchMaterials = async (batchId, items) => {
    const batch = await Batch_1.default.findById(batchId);
    if (!batch) {
        throw new ApiError_1.default(404, 'Batch not found');
    }
    if (batch.status !== 'received') {
        throw new ApiError_1.default(400, `Batch cannot be sorted. It must be in "received" status, but is currently "${batch.status}".`);
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ApiError_1.default(400, 'At least one sorted material item is required');
    }
    const createdMaterials = [];
    for (const item of items) {
        if (!item.weightKg || item.weightKg <= 0) {
            throw new ApiError_1.default(400, `Invalid weight for sorted material "${item.materialType}"`);
        }
        // Special Handling rule: e-waste and battery require strict segregation
        const isSpecialHandling = item.materialType === 'ewaste' || item.materialType === 'battery';
        // Automatic Buyer Routing: match by buyer's acceptedMaterials
        const matchingBuyer = await Buyer_1.default.findOne({
            isActive: true,
            acceptedMaterials: item.materialType,
        });
        const sortedDoc = await SortedMaterial_1.default.create({
            batchId: batch._id,
            materialType: item.materialType,
            weightKg: Number(item.weightKg.toFixed(2)),
            isSpecialHandling,
            isDamaged: item.isDamaged || false,
            destinationBuyerId: matchingBuyer ? matchingBuyer._id : null,
            status: 'sorted',
        });
        createdMaterials.push(sortedDoc);
    }
    // Update batch status to 'sorted'
    batch.status = 'sorted';
    batch.sortedAt = new Date();
    await batch.save();
    logger_1.default.info(`🧪 Batch ${batch.qrCode} successfully sorted into ${createdMaterials.length} material streams.`);
    return {
        batch,
        sortedMaterials: createdMaterials,
    };
};
exports.sortBatchMaterials = sortBatchMaterials;
/**
 * 4. Get full batch traceability details
 */
const getBatchDetails = async (batchIdOrQr) => {
    const isObjectId = mongoose_1.Types.ObjectId.isValid(batchIdOrQr);
    const query = isObjectId ? { _id: batchIdOrQr } : { qrCode: batchIdOrQr };
    const batch = await Batch_1.default.findOne(query)
        .populate('collectorId', 'name phone storeName')
        .populate('receivedBy', 'name phone')
        .populate('pickupRequestIds', 'address totalPickupWeightKg totalAmountPaise pricingMode');
    if (!batch) {
        throw new ApiError_1.default(404, 'Batch not found');
    }
    const sortedMaterials = await SortedMaterial_1.default.find({ batchId: batch._id })
        .populate('destinationBuyerId', 'name contact acceptedMaterials');
    return {
        batch,
        sortedMaterials,
    };
};
exports.getBatchDetails = getBatchDetails;
/**
 * 5. List batches with optional status filter
 */
const listBatches = async (collectorId, status) => {
    const filter = {};
    if (collectorId)
        filter.collectorId = new mongoose_1.Types.ObjectId(collectorId);
    if (status)
        filter.status = status;
    return await Batch_1.default.find(filter)
        .populate('collectorId', 'name phone storeName')
        .populate('receivedBy', 'name')
        .sort({ createdAt: -1 });
};
exports.listBatches = listBatches;
exports.default = {
    createDepositBatch: exports.createDepositBatch,
    receiveBatch: exports.receiveBatch,
    sortBatchMaterials: exports.sortBatchMaterials,
    getBatchDetails: exports.getBatchDetails,
    listBatches: exports.listBatches,
};
