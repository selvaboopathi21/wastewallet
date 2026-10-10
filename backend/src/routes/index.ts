// Master API v1 Route Registry in TypeScript
import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import pickupRoutes from './pickup.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/pickups', pickupRoutes);
router.use('/', adminRoutes); // Mounts /rates, /zones, and /admin/*

export default router;
