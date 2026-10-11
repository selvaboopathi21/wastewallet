// Batch Routes: Collector deposit and Store Staff sorting endpoints
import { Router } from 'express';
import {
  createBatch,
  receiveBatch,
  sortBatch,
  getBatch,
  listBatches,
} from '../controllers/batch.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

// 1. Collector deposits completed pickups as a new Batch (QR Code)
router.post('/', authenticate, restrictTo(ROLES.COLLECTOR, ROLES.STORE_STAFF, ROLES.ADMIN), createBatch);

// 2. View batches (Collector sees their own, Store Staff & Admin see all)
router.get('/', authenticate, listBatches);

// 3. Store Staff scans QR and records received weight (calculates loss %)
router.post(
  '/:qrCode/receive',
  authenticate,
  restrictTo(ROLES.STORE_STAFF, ROLES.ADMIN),
  receiveBatch
);

// 4. Store Staff sorts materials and system automatically routes to Buyers
router.post(
  '/:id/sort',
  authenticate,
  restrictTo(ROLES.STORE_STAFF, ROLES.ADMIN),
  sortBatch
);

// 5. Traceability: View specific batch details, line items, and buyers
router.get('/:id', authenticate, getBatch);

export default router;
