// Rating Routes: Endpoints for submitting and viewing ratings
import { Router } from 'express';
import {
  submitRating,
  getUserRatings,
  getPickupRatings,
} from '../controllers/rating.controller';
import authenticate from '../middleware/auth';

const router = Router();

// Submit rating (authenticated customer or collector)
router.post('/', authenticate, submitRating);

// View ratings of a specific user
router.get('/users/:userId', authenticate, getUserRatings);

// View ratings of a specific pickup
router.get('/pickups/:requestId', authenticate, getPickupRatings);

export default router;
