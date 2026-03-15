import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Comment from '../models/comment.model';
import Task, { ITask } from '../models/task.model';
import User from '../models/user.model';
import ActivityLog from '../models/activityLog.model';
import mongoose from 'mongoose';
import { notify } from '../services/notification.service';
import { NotificationType } from '../models/notification.model';
import { logActivity, Actions } from '../services/activity.service';

export const createComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId, content, parentCommentId } = req.body;
    const authorId = req.user?._id;
    const workspaceId = req.workspaceId;

    if (!taskId || !content) {
      res.status(400).json({ message: 'Task ID and content are required' });
      return;
    }

    const task = await Task.findOne({ _id: taskId, workspaceId }) as ITask;
    if (!task) {
      res.status(404).json({ message: 'Task not found in your workspace' });
      return;
    }

    // Parse Mentions (@username)
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    const usernames: string[] = [];
    for (const match of matches) {
      usernames.push(match[1]);
    }
    const mentionedUsers = await User.find({ username: { $in: usernames } }).select('_id name username');
    const mentionIds = mentionedUsers.map(u => u._id);

    const comment = await Comment.create({
      taskId,
      workspaceId,
      authorId,
      content,
      parentCommentId,
      mentions: mentionIds
    });

    await comment.populate('authorId', 'name username avatarUrl');
    if (parentCommentId) await comment.populate('parentCommentId');

    // Activity Log
    await ActivityLog.create({
      workspaceId,
      actorId: authorId,
      action: 'COMMENTED_ON_TASK',
      entityId: taskId,
      entityModel: 'Task',
      details: { commentId: comment._id, isReply: !!parentCommentId }
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`project:${task.projectId}`).emit('comment-added', comment);
      io.to(`task:${taskId}`).emit('task-comment', comment);
    }

    // Notifications (Mentions + Watchers + Assignee)
    const notifyIds = new Set<string>();

    mentionedUsers.forEach(u => notifyIds.add(u._id.toString()));

    if (task.watchers) {
      task.watchers.forEach(w => notifyIds.add(w.toString()));
    }

    if (task.assigneeId) notifyIds.add(task.assigneeId.toString());

    notifyIds.delete(authorId?.toString() || '');

    for (const recipientId of notifyIds) {
      const isMentioned = mentionIds.some(id => id.toString() === recipientId);
      const type = isMentioned ? NotificationType.MENTION : NotificationType.INFO;

      const message = type === NotificationType.MENTION
        ? `You were mentioned in a comment on "${task.title}"`
        : `New comment on task "${task.title}"`;

      await notify({
        workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        recipientId: new mongoose.Types.ObjectId(recipientId),
        senderId: authorId,
        type,
        message,
        entityId: taskId,
        entityModel: 'Task'
      }, io);
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating comment', error });
  }
};

export const updateComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    if (comment.authorId.toString() !== userId?.toString()) {
      res.status(403).json({ message: 'You can only edit your own comments' });
      return;
    }

    comment.content = content;
    await comment.save();
    await comment.populate('authorId', 'name username avatarUrl');

    const io = req.app.get('io');
    if (io) {
      io.to(`task:${comment.taskId}`).emit('comment-updated', comment);
    }

    await logActivity(comment.workspaceId.toString(), userId!, Actions.COMMENT_EDITED, comment.taskId, "Task", { commentId: id }, io);

    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating comment', error });
  }
};

export const deleteComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const comment = await Comment.findById(id);
    if (!comment) {
      res.status(404).json({ message: 'Comment not found' });
      return;
    }

    if (comment.authorId.toString() !== userId?.toString()) {
      res.status(403).json({ message: 'You can only delete your own comments' });
      return;
    }

    const taskId = comment.taskId;
    const workspaceId = comment.workspaceId;
    await comment.deleteOne();

    const io = req.app.get('io');
    if (io) {
      io.to(`task:${taskId}`).emit('comment-deleted', id);
    }

    await logActivity(workspaceId.toString(), userId!, Actions.COMMENT_DELETED, taskId, "Task", { commentId: id }, io);

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting comment', error });
  }
};


export const getCommentsByTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const workspaceId = req.workspaceId;

    const comments = await Comment.find({ taskId, workspaceId })
      .populate('authorId', 'name username avatarUrl')
      .sort({ createdAt: 1 }); // Oldest first (chat style)

    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching comments', error });
  }
};
