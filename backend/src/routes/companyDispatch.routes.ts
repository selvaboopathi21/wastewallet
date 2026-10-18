// CompanyDispatch Routes: Scrap inventory, tie-up company requirement matching, dispatching & receiving
import { Router } from 'express';
import {
  getInventory,
  getCompanies,
  createDispatch,
  getDispatches,
  getCompanyPortal,
  receiveDispatch,
  getNotifications,
  markNotificationsRead,
} from '../controllers/companyDispatch.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

// 1. Warehouse Inventory Breakdown: Available kg, sorted kg, dispatched kg, received kg
router.get('/inventory', authenticate, getInventory);

// 2. List all Tie-Up Partner Companies with accepted categories (optionally ?category=iron)
router.get('/companies', getCompanies);

// 3. Store Staff dispatches / handovers separated scrap to a specific tie-up company
router.post(
  '/dispatch',
  authenticate,
  restrictTo(ROLES.STORE_STAFF, ROLES.ADMIN, ROLES.COLLECTOR),
  createDispatch
);

// 4. View all scrap dispatches (with filters ?status=dispatched&companyId=...)
router.get('/dispatches', getDispatches);

// 5. Company Portal Dashboard: View incoming shipments & received history for a specific company
router.get('/portal/:companyId', getCompanyPortal);

// 6. Company confirms receipt of scrap shipment (triggers receipt message back to staff!)
router.post('/receive/:dispatchId', receiveDispatch);

// 7. Store Staff Receipt Messages & In-App Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/read', markNotificationsRead);

export default router;
