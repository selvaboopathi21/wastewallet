// Master API v1 Route Registry in TypeScript
import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', adminRoutes); // Mounts /rates, /zones, and /admin/*

export default router;
