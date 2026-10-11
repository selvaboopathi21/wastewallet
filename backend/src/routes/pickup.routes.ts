// Pickup Routes: Endpoints for customer scrap pickup creation and retrieval
import { Router } from 'express';
import {
  createPickup,
  getPickup,
  getMyPickups,
  confirmPickupOtp,
  requestSeparatePrice,
} from '../controllers/pickup.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { uploadPhotos } from '../middleware/upload';
import { ROLES } from '../utils/constants';

const router = Router();

// Customer creates a new scrap pickup (with optional up to 5 photos)
router.post(
  '/',
  authenticate,
  restrictTo(ROLES.CUSTOMER),
  uploadPhotos.array('photos', 5),
  createPickup
);

// Customer views their pickup history
router.get('/', authenticate, restrictTo(ROLES.CUSTOMER), getMyPickups);

// Customer requests itemized separate price (only in mixed mode)
router.post(
  '/:id/request-separate',
  authenticate,
  restrictTo(ROLES.CUSTOMER),
  requestSeparatePrice
);

// Customer confirms on-site weights and amount with 6-digit OTP
router.post(
  '/:id/confirm-otp',
  authenticate,
  restrictTo(ROLES.CUSTOMER),
  confirmPickupOtp
);

// View specific pickup details (Customer, Collector, or Admin)
router.get('/:id', authenticate, getPickup);

export default router;
