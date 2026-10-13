// Batch Controller: Handles requests for batch deposits, store reception, sorting and routing
import { Request, Response } from 'express';
import batchService from '../services/batch.service';
import asyncHandler from '../utils/asyncHandler';
import ApiError from '../utils/ApiError';

// POST /api/v1/batches (Collector deposits completed pickups)
export const createBatch = asyncHandler(async (req: Request, res: Response) => {
  let collectorId = req.body?.collectorId || req.user!._id.toString();
  if (req.user!.role !== 'collector' && !req.body?.collectorId) {
    const User = (await import('../models/User')).default;
    const defaultCollector = await User.findOne({ role: 'collector', phone: '9876500001' });
    if (defaultCollector) {
      collectorId = defaultCollector._id.toString();
    }
  }

  const batch = await batchService.createDepositBatch(collectorId);

  res.status(201).json({
    success: true,
    message: `Batch deposit QR generated successfully: ${batch.qrCode}`,
    data: { batch },
  });
});

// POST /api/v1/batches/:qrCode/receive (Store Staff scans QR & inputs received weight)
export const receiveBatch = asyncHandler(async (req: Request, res: Response) => {
  const { qrCode } = req.params;
  const { receivedWeightKg } = req.body;
  const staffId = req.user!._id.toString();

  if (receivedWeightKg === undefined || receivedWeightKg === null) {
    throw new ApiError(400, 'receivedWeightKg is required');
  }

  const batch = await batchService.receiveBatch(qrCode as string, staffId, Number(receivedWeightKg));

  res.status(200).json({
    success: true,
    message: `Batch received! Computed weight loss: ${batch.lossPercent}%`,
    data: { batch },
  });
});

// POST /api/v1/batches/:id/sort (Store Staff records category-wise sorted weights)
export const sortBatch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { items } = req.body;

  if (!items || !Array.isArray(items)) {
    throw new ApiError(400, 'An array of sorted material items is required');
  }

  const result = await batchService.sortBatchMaterials(id as string, items);

  res.status(200).json({
    success: true,
    message: `Batch sorted into ${result.sortedMaterials.length} materials and routed to buyers`,
    data: result,
  });
});

// GET /api/v1/batches/:id (Full batch traceability details)
export const getBatch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = await batchService.getBatchDetails(id as string);

  res.status(200).json({
    success: true,
    message: 'Batch details retrieved successfully',
    data,
  });
});

// GET /api/v1/batches (List batches)
export const listBatches = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const isStoreView =
    req.query.view === 'store' ||
    req.query.all === 'true' ||
    ['store_staff', 'admin'].includes(req.user!.role);
  const collectorId =
    !isStoreView && req.user!.role === 'collector'
      ? req.user!._id.toString()
      : undefined;

  const batches = await batchService.listBatches(collectorId, status);

  res.status(200).json({
    success: true,
    message: 'Batches retrieved successfully',
    data: { batches },
  });
});

export default {
  createBatch,
  receiveBatch,
  sortBatch,
  getBatch,
  listBatches,
};
