// Auth Routes in TypeScript
import { Router, Request, Response } from 'express';
import { sendOtp, verifyOtp, googleLogin, getMe, updateProfile } from '../controllers/auth.controller';
import authenticate from '../middleware/auth';
import { restrictTo } from '../middleware/role';
import { ROLES } from '../utils/constants';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleLogin);
router.get('/me', authenticate, getMe);
router.patch('/profile', authenticate, updateProfile);

router.get('/admin-only', authenticate, restrictTo(ROLES.ADMIN), (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome Admin! You have access to this protected admin-only resource.',
    data: { user: req.user!.name || req.user!.phone },
  });
});

export default router;
