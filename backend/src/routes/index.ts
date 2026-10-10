// Master API v1 Route Registry in TypeScript
import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.use('/auth', authRoutes);

export default router;
