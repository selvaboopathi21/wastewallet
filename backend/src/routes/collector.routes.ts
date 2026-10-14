// Collector Routes: Collector specific endpoints protected by collector role
import { Router } from 'express';
import {
  toggleOnlineStatus,
  getMyOffers,
  acceptPickupOffer,
  declinePickupOffer,
  updatePickupStatus,
  getActiveJobs,
  recordWeights,
  requestConfirmationOtp,
  recordCashPayment,
  finishPickup,
  respondSeparatePrice,
} from '../controllers/collector.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';
import ApiError from '../utils/ApiError';

const router = Router();

// Middleware: Collectors MUST be approved by Admin before accessing operational endpoints
const requireApprovedCollector = (req: any, res: any, next: any) => {
  if (req.user?.role === ROLES.COLLECTOR && !req.user?.isApproved) {
    return next(
      new ApiError(
        403,
        'Your collector partner account is awaiting verification by Admin. You cannot accept requests or view job cards until approved.'
      )
    );
  }
  next();
};

// All collector routes require authentication and approval
router.use(authenticate, restrictTo(ROLES.COLLECTOR, ROLES.ADMIN, ROLES.CUSTOMER), requireApprovedCollector);

// Online / Offline toggle
router.patch('/status', toggleOnlineStatus);

// View pending 60-second offers
router.get('/offers', getMyOffers);

// View accepted active pickups
router.get('/active-jobs', getActiveJobs);
router.get('/active', getActiveJobs);


// Accept offer (Atomic conditional update)
router.post('/pickups/:id/accept', acceptPickupOffer);

// Decline offer (Moves to next collector)
router.post('/pickups/:id/decline', declinePickupOffer);

// Transition status (e.g. on_the_way, arrived)
router.patch('/pickups/:id/status', updatePickupStatus);

// Enter on-site weights (Separate or Mixed mode)
router.post('/pickups/:id/weights', recordWeights);

// Respond to "See separate price" request (Accept or Decline with reason)
router.post('/pickups/:id/respond-separate', respondSeparatePrice);

// Request 6-digit confirmation OTP to be sent to customer
router.post('/pickups/:id/request-otp', requestConfirmationOtp);

// Record cash payment
router.post('/pickups/:id/pay-cash', recordCashPayment);

// Complete pickup
router.post('/pickups/:id/complete', finishPickup);

export default router;
