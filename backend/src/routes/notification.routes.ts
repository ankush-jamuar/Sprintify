import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllRead, deleteNotification } from '../controllers/notification.controller';
import { protect } from '../middlewares/auth.middleware';
import { requireWorkspace } from '../middlewares/workspace.middleware';

const router = Router();

router.get('/', protect, getMyNotifications);
router.patch('/read-all', protect, markAllRead);
router.patch('/:notificationId/read', protect, markAsRead);
router.delete('/:notificationId', protect, deleteNotification);

export default router;
