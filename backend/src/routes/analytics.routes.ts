import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { protect } from '../middlewares/auth.middleware';
import { requireWorkspace } from '../middlewares/workspace.middleware';

const router = Router();

// Base mounted on /api/v1/analytics
router.get('/dashboard', protect, requireWorkspace, getDashboardAnalytics);

export default router;
