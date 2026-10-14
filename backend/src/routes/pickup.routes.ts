// Pickup Routes: Endpoints for customer scrap pickup creation and retrieval
import { Router } from 'express';
import {
  createPickup,
  getPickup,
  getMyPickups,
  confirmPickupOtp,
  requestSeparatePrice,
  cancelPickup,
} from '../controllers/pickup.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { uploadPhotos } from '../middleware/upload';
import { ROLES } from '../utils/constants';

const router = Router();

// Customer/User creates a new scrap pickup (with optional up to 5 photos)
router.post(
  '/',
  authenticate,
  restrictTo(ROLES.CUSTOMER, ROLES.COLLECTOR, ROLES.ADMIN),
  uploadPhotos.array('photos', 5),
  createPickup
);

// View pickup history
router.get('/', authenticate, restrictTo(ROLES.CUSTOMER, ROLES.COLLECTOR, ROLES.ADMIN), getMyPickups);

// Request itemized separate price (in mixed mode)
router.post(
  '/:id/request-separate',
  authenticate,
  restrictTo(ROLES.CUSTOMER, ROLES.COLLECTOR, ROLES.ADMIN),
  requestSeparatePrice
);

// Confirm on-site weights and amount with 6-digit OTP
router.post(
  '/:id/confirm-otp',
  authenticate,
  restrictTo(ROLES.CUSTOMER, ROLES.COLLECTOR, ROLES.ADMIN),
  confirmPickupOtp
);

// Cancel pickup request (Customer or Admin)
router.patch(
  '/:id/cancel',
  authenticate,
  restrictTo(ROLES.CUSTOMER, ROLES.COLLECTOR, ROLES.ADMIN),
  cancelPickup
);

// View specific pickup details (Customer, Collector, or Admin)
router.get('/:id', authenticate, getPickup);

export default router;
