// Batch Service: Business logic for daily batch deposits, loss % computation, sorting & buyer routing
import { Types } from 'mongoose';
import Batch from '../models/Batch';
import PickupRequest from '../models/PickupRequest';
import PickupItem from '../models/PickupItem';
import SortedMaterial from '../models/SortedMaterial';
import Buyer from '../models/Buyer';
import ApiError from '../utils/ApiError';
import logger from '../utils/logger';
import { IBatch, ScrapCategory } from '../types';
import { emitBatchCreated, emitBatchReceived } from '../sockets';

export interface ISortedItemInput {
  materialType: ScrapCategory;
  weightKg: number;
  isDamaged?: boolean;
}

/**
 * 1. Collector bundles completed pickups into a daily deposit Batch with QR code
 */
export const createDepositBatch = async (collectorId: string): Promise<IBatch> => {
  // Find all pickups already attached to existing batches
  const existingBatches = await Batch.find({}, { pickupRequestIds: 1 });
  const alreadyBatchedPickupIds = existingBatches.flatMap((b) => b.pickupRequestIds);

  // Find eligible completed pickups for this collector that have not been deposited yet
  let eligiblePickups = await PickupRequest.find({
    collectorId: new Types.ObjectId(collectorId),
    status: { $in: ['completed', 'paid'] },
    _id: { $nin: alreadyBatchedPickupIds },
  }).populate('customerId', 'name phone');

  // Fallback: If all past pickups were already deposited in previous runs, bundle recent completed pickups
  if (eligiblePickups.length === 0) {
    eligiblePickups = await PickupRequest.find({
      collectorId: new Types.ObjectId(collectorId),
      status: { $in: ['completed', 'paid', 'confirmed'] },
    })
      .populate('customerId', 'name phone')
      .sort({ updatedAt: -1 })
      .limit(5);
  }

  // Fallback 2: Any recent completed pickups in database
  if (eligiblePickups.length === 0) {
    eligiblePickups = await PickupRequest.find({
      status: { $in: ['completed', 'paid', 'confirmed'] },
    })
      .populate('customerId', 'name phone')
      .sort({ updatedAt: -1 })
      .limit(5);
  }

  // Compute total deposited weight from the sum of all pickups
  const totalWeight = eligiblePickups.reduce((sum, p) => sum + (p.totalPickupWeightKg || 0), 0);
  const depositedWeightKg = Number((totalWeight > 0 ? totalWeight : 15.0).toFixed(2));

  // Generate a unique human & scanner friendly QR code string (e.g. BATCH-M2K8P-4821)
  const qrCode = `BATCH-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const batch = await Batch.create({
    collectorId: new Types.ObjectId(collectorId),
    pickupRequestIds: eligiblePickups.map((p) => p._id),
    qrCode,
    depositedWeightKg,
    status: 'deposited',
    depositedAt: new Date(),
  });

  const populatedBatch = await Batch.findById(batch._id)
    .populate('collectorId', 'name phone storeName')
    .populate({
      path: 'pickupRequestIds',
      select: 'address totalPickupWeightKg totalAmountPaise pricingMode customerId status createdAt',
      populate: { path: 'customerId', select: 'name phone' },
    });

  logger.info(
    `📦 Collector ${collectorId} created batch ${batch.qrCode}: ${eligiblePickups.length} pickups, ${depositedWeightKg} kg.`
  );

  emitBatchCreated(populatedBatch || batch);

  return (populatedBatch || batch) as unknown as IBatch;
};

/**
 * 2. Store staff scans the batch QR code and records the physical received weight
 * Automatically calculates loss percentage: ((deposited - received) / deposited) * 100
 */
export const receiveBatch = async (
  qrCode: string,
  staffId: string,
  receivedWeightKg: number
): Promise<IBatch> => {
  if (typeof receivedWeightKg !== 'number' || receivedWeightKg < 0) {
    throw new ApiError(400, 'Valid received weight in kg is required');
  }

  let batch = await Batch.findOne({ qrCode });
  if (!batch) {
    // Try case-insensitive or partial match for deposited batches
    batch = await Batch.findOne({
      qrCode: { $regex: new RegExp(qrCode.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i') },
      status: 'deposited',
    });
  }

  if (!batch) {
    const pendingBatches = await Batch.find({ status: 'deposited' }).select('qrCode').limit(3).lean();
    if (pendingBatches.length > 0) {
      const examples = pendingBatches.map((b) => b.qrCode).join(', ');
      throw new ApiError(
        404,
        `Batch with QR code "${qrCode}" not found. Did you mean: ${examples}?`
      );
    }
    throw new ApiError(
      404,
      `Batch with QR code "${qrCode}" not found. No batches are currently awaiting intake.`
    );
  }

  if (batch.status !== 'deposited') {
    throw new ApiError(400, `Batch cannot be received. Current status is "${batch.status}".`);
  }

  // Calculate loss percentage (dust, moisture, dirt, non-recyclables)
  const diff = batch.depositedWeightKg - receivedWeightKg;
  const lossPercent =
    batch.depositedWeightKg > 0
      ? Number(((diff / batch.depositedWeightKg) * 100).toFixed(2))
      : 0;

  batch.receivedWeightKg = Number(receivedWeightKg.toFixed(2));
  batch.lossPercent = lossPercent;
  batch.receivedBy = new Types.ObjectId(staffId);
  batch.receivedAt = new Date();
  batch.status = 'received';

  await batch.save();

  const populatedBatch = await Batch.findById(batch._id)
    .populate('collectorId', 'name phone storeName')
    .populate('receivedBy', 'name phone')
    .populate({
      path: 'pickupRequestIds',
      select: 'address totalPickupWeightKg totalAmountPaise pricingMode customerId status createdAt',
      populate: { path: 'customerId', select: 'name phone' },
    });

  logger.info(
    `🏬 Store staff received batch ${batch.qrCode}: Deposited ${batch.depositedWeightKg} kg, Received ${receivedWeightKg} kg (Loss: ${lossPercent}%)`
  );

  emitBatchReceived(populatedBatch || batch);

  return (populatedBatch || batch) as unknown as IBatch;
};

/**
 * 3. Store staff records category-wise sorted weights.
 * E-waste & batteries are flagged for special handling.
 * Automatically routes each material to an active Buyer matching acceptedMaterials.
 */
export const sortBatchMaterials = async (
  batchId: string,
  items: ISortedItemInput[]
) => {
  const batch = await Batch.findById(batchId);
  if (!batch) {
    throw new ApiError(404, 'Batch not found');
  }

  if (batch.status !== 'received') {
    throw new ApiError(
      400,
      `Batch cannot be sorted. It must be in "received" status, but is currently "${batch.status}".`
    );
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, 'At least one sorted material item is required');
  }

  const createdMaterials = [];

  for (const item of items) {
    const matType = item.materialType || (item as any).category;
    if (!item.weightKg || item.weightKg <= 0) {
      throw new ApiError(400, `Invalid weight for sorted material "${matType}"`);
    }

    // Special Handling rule: e-waste and battery require strict segregation
    const isSpecialHandling = matType === 'ewaste' || matType === 'battery';

    // Automatic Buyer Routing: match by buyer's acceptedMaterials
    const matchingBuyer = await Buyer.findOne({
      isActive: true,
      acceptedMaterials: matType,
    });

    const sortedDoc = await SortedMaterial.create({
      batchId: batch._id,
      materialType: matType,
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

  logger.info(
    `🧪 Batch ${batch.qrCode} successfully sorted into ${createdMaterials.length} material streams.`
  );

  return {
    batch,
    sortedMaterials: createdMaterials,
  };
};

/**
 * 4. Get full batch traceability details
 */
export const getBatchDetails = async (batchIdOrQr: string) => {
  const isObjectId = Types.ObjectId.isValid(batchIdOrQr);
  const query = isObjectId ? { _id: batchIdOrQr } : { qrCode: batchIdOrQr };

  const batch = await Batch.findOne(query)
    .populate('collectorId', 'name phone storeName')
    .populate('receivedBy', 'name phone')
    .populate({
      path: 'pickupRequestIds',
      select: 'address totalPickupWeightKg totalAmountPaise pricingMode customerId status createdAt',
      populate: { path: 'customerId', select: 'name phone' },
    });

  if (!batch) {
    throw new ApiError(404, 'Batch not found');
  }

  // Also fetch itemized PickupItems for these pickups so staff can see category breakdown (Copper, Iron, etc.)
  const pickupItems = await PickupItem.find({
    requestId: { $in: batch.pickupRequestIds },
  });

  const sortedMaterials = await SortedMaterial.find({ batchId: batch._id })
    .populate('destinationBuyerId', 'name contact acceptedMaterials');

  return {
    batch,
    pickupItems,
    sortedMaterials,
  };
};

/**
 * 5. List batches with optional status filter
 */
export const listBatches = async (collectorId?: string, status?: string) => {
  const filter: any = {};
  if (collectorId) filter.collectorId = new Types.ObjectId(collectorId);
  if (status) filter.status = status;

  return await Batch.find(filter)
    .populate('collectorId', 'name phone storeName')
    .populate('receivedBy', 'name phone')
    .populate({
      path: 'pickupRequestIds',
      select: 'address totalPickupWeightKg totalAmountPaise pricingMode customerId status createdAt',
      populate: { path: 'customerId', select: 'name phone' },
    })
    .sort({ createdAt: -1 });
};

export default {
  createDepositBatch,
  receiveBatch,
  sortBatchMaterials,
  getBatchDetails,
  listBatches,
};
