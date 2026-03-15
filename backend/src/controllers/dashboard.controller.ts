import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Task from '../models/task.model';
import ActivityLog from '../models/activityLog.model';
import mongoose from 'mongoose';

export const getTaskStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const workspaceId = req.workspaceId;
        if (!workspaceId) {
            res.status(400).json({ message: 'Workspace context required' });
            return;
        }

        const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

        const counts = await Task.aggregate([
            { $match: { workspaceId: wsObjectId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const stats = { todo: 0, inProgress: 0, done: 0 };
        counts.forEach(c => {
            if (c._id === 'TODO') stats.todo = c.count;
            if (c._id === 'IN_PROGRESS') stats.inProgress = c.count;
            if (c._id === 'DONE') stats.done = c.count;
        });

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching task stats' });
    }
};

export const getActivityHeatmap = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const workspaceId = req.workspaceId;
        if (!workspaceId) {
            res.status(400).json({ message: 'Workspace context required' });
            return;
        }

        const wsObjectId = new mongoose.Types.ObjectId(workspaceId);

        // Get past 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activities = await ActivityLog.aggregate([
            { $match: { workspaceId: wsObjectId, createdAt: { $gte: sevenDaysAgo } } },
            {
                $project: {
                    dayOfWeek: { $dayOfWeek: "$createdAt" }
                }
            },
            {
                $group: {
                    _id: "$dayOfWeek",
                    count: { $sum: 1 }
                }
            }
        ]);

        // MongoDB $dayOfWeek: 1 (Sun), 2 (Mon), 3 (Tue), 4 (Wed), 5 (Thu), 6 (Fri), 7 (Sat)
        const dayMap: Record<number, string> = {
            1: "Sun", 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat"
        };

        const heatmap: Record<string, number> = {
            "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0
        };

        activities.forEach(a => {
            const dayStr = dayMap[a._id];
            if (dayStr) {
                heatmap[dayStr] = a.count;
            }
        });

        res.status(200).json(heatmap);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching activity heatmap' });
    }
};
