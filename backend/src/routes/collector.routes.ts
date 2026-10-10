// Collector Routes: Collector specific endpoints protected by collector role
import { Router } from 'express';
import {
  toggleOnlineStatus,
  getMyOffers,
  acceptPickupOffer,
  declinePickupOffer,
  updatePickupStatus,
  getActiveJobs,
} from '../controllers/collector.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

// All collector routes require authentication and collector role
router.use(authenticate, restrictTo(ROLES.COLLECTOR));

// Online / Offline toggle
router.patch('/status', toggleOnlineStatus);

// View pending 60-second offers
router.get('/offers', getMyOffers);

// View accepted active pickups
router.get('/active-jobs', getActiveJobs);

// Accept offer (Atomic conditional update)
router.post('/pickups/:id/accept', acceptPickupOffer);

// Decline offer (Moves to next collector)
router.post('/pickups/:id/decline', declinePickupOffer);

// Transition status (e.g. on_the_way, arrived)
router.patch('/pickups/:id/status', updatePickupStatus);

export default router;
