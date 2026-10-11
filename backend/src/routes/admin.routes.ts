// Admin Routes: Requires authentication and Admin role
import { Router } from 'express';
import {
  createZone,
  updateZoneStatus,
  setRate,
  getZones,
  getRates,
  getDashboardReports,
  getFraudAlertsList,
  approveCollector,
  blockUser,
} from '../controllers/admin.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

// 1. Public Viewing Endpoints (Customers & Collectors need to see current rates & zones)
router.get('/rates', getRates);
router.get('/zones', getZones);
router.get('/admin/rates', getRates);
router.get('/admin/zones', getZones);

// 2. Admin Management Endpoints (Strictly Admin only)
router.post('/admin/zones', authenticate, restrictTo(ROLES.ADMIN), createZone);
router.patch('/admin/zones/:id/status', authenticate, restrictTo(ROLES.ADMIN), updateZoneStatus);
router.post('/admin/rates', authenticate, restrictTo(ROLES.ADMIN), setRate);
router.get('/admin/reports', authenticate, restrictTo(ROLES.ADMIN), getDashboardReports);
router.get('/admin/fraud-alerts', authenticate, restrictTo(ROLES.ADMIN), getFraudAlertsList);
router.patch('/admin/collectors/:id/approve', authenticate, restrictTo(ROLES.ADMIN), approveCollector);
router.patch('/admin/users/:id/block', authenticate, restrictTo(ROLES.ADMIN), blockUser);

export default router;
