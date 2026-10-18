// Master API v1 Route Registry in TypeScript
import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import pickupRoutes from './pickup.routes';
import collectorRoutes from './collector.routes';
import batchRoutes from './batch.routes';
import ratingRoutes from './rating.routes';
import companyDispatchRoutes from './companyDispatch.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/pickups', pickupRoutes);
router.use('/collector', collectorRoutes);
router.use('/batches', batchRoutes);
router.use('/ratings', ratingRoutes);
router.use('/company-dispatch', companyDispatchRoutes);
router.use('/', adminRoutes); // Mounts /rates, /zones, and /admin/*

export default router;
