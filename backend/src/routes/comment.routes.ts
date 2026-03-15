import { Router } from 'express';
import { createComment, getCommentsByTask, updateComment, deleteComment } from '../controllers/comment.controller';
import { protect } from '../middlewares/auth.middleware';
import { requireWorkspace } from '../middlewares/workspace.middleware';

const router = Router();

router.post('/', protect, requireWorkspace, createComment);
router.get('/task/:taskId', protect, requireWorkspace, getCommentsByTask);
router.patch('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);

export default router;
