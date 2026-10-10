// Auth Routes in TypeScript
import { Router } from 'express';
import { sendOtp, verifyOtp, getMe } from '../controllers/auth.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/me', authenticate, getMe);

router.get('/admin-only', authenticate, restrictTo(ROLES.ADMIN), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin! You have access to this protected admin-only resource.',
    data: { user: req.user!.name || req.user!.phone },
  });
});

export default router;
