import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Task from '../models/task.model';
import ActivityLog from '../models/activityLog.model';
import mongoose from 'mongoose';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) {
      res.status(400).json({ message: 'Workspace context required' });
      return;
    }

    const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

    // 1. Task counts by status
    const taskStatusCounts = await Task.aggregate([
      { $match: { workspaceId: wsObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 2. Workload per assignee (tasks in progress)
    const workload = await Task.aggregate([
      { $match: { workspaceId: wsObjectId, status: { $in: ['TODO', 'IN_PROGRESS'] }, assigneeId: { $ne: null } } },
      { $group: { _id: '$assigneeId', activeTasks: { $sum: 1 } } }
    ]);

    // 3. Recent Activity timeline (last 10 events)
    const recentActivity = await ActivityLog.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('actorId', 'name email');

    res.status(200).json({
      statusCounts: taskStatusCounts,
      workload,
      recentActivity
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching analytics', error });
  }
};
