import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middlewares/auth.middleware";
import Task from "../models/task.model";
import Project from "../models/project.model";
import Member from "../models/member.model";
import { logActivity, Actions } from "../services/activity.service";
import { notify } from "../services/notification.service";
import { NotificationType } from "../models/notification.model";

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, title, description, status, sprintDate, assigneeId, priority, dueDate, epicId, sprintId } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    // Atomic per-project task key generation
    const updatedProject = await Project.findOneAndUpdate(
      { _id: projectId },
      { $inc: { taskCounter: 1 } },
      { new: true }
    );
    if (!updatedProject) return res.status(404).json({ message: "Project not found during key gen" });
    const taskKey = `${updatedProject.prefix}-${updatedProject.taskCounter}`;
    const taskCountInStatus = await Task.countDocuments({ projectId, status: status || "TODO" });

    const priorityMap: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
    const task = await Task.create({
      projectId,
      workspaceId: project.workspaceId,
      key: taskKey,
      title,
      description,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      priorityScore: priorityMap[priority || "MEDIUM"] || 3,
      dueDate: dueDate || null,
      sprintDate,
      epicId: epicId || null,
      sprintId: sprintId || null,
      order: taskCountInStatus,
      assigneeId,
    });

    // Emit event to the specific project room
    const io = req.app.get("io");
    if (assigneeId && assigneeId !== req.user?._id?.toString()) {
      await notify({
        workspaceId: task.workspaceId,
        recipientId: assigneeId,
        senderId: req.user!._id,
        type: NotificationType.TASK_ASSIGNED,
        message: `You were assigned to task "${task.title}" (${task.key})`,
        entityId: task._id,
        entityModel: "Task",
      }, io);
      if (io) io.to(`workspace:${task.workspaceId}`).emit("task-assigned", task);
    }
    if (io) {
      io.to(`project:${projectId}`).emit("task-created", task);
      io.to(`workspace:${task.workspaceId}`).emit("dashboard-updated");
    }

    await logActivity(project.workspaceId.toString(), req.user!._id, Actions.TASK_CREATED, task._id, "Task", { title, key: taskKey }, io);

    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Verify user is member of the project's workspace
    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const tasks = await Task.find({ projectId }).sort({ order: 1 });
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTaskPosition = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, prevTaskId, nextTaskId } = req.body;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isMember = await Member.findOne({ workspaceId: task.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const oldStatus = task.status;

    // Calculate new position using midpoint between neighbors
    let newOrder: number;
    const validPrevId = prevTaskId && mongoose.Types.ObjectId.isValid(prevTaskId) ? prevTaskId : null;
    const validNextId = nextTaskId && mongoose.Types.ObjectId.isValid(nextTaskId) ? nextTaskId : null;

    if (validPrevId && validNextId) {
      const prev = await Task.findById(validPrevId);
      const next = await Task.findById(validNextId);
      newOrder = ((prev?.order || 0) + (next?.order || 0)) / 2;
    } else if (validPrevId) {
      const prev = await Task.findById(validPrevId);
      newOrder = (prev?.order || 0) + 1024;
    } else if (validNextId) {
      const next = await Task.findById(validNextId);
      newOrder = (next?.order || 1024) / 2;
    } else {
      // Only task in column or fallback
      newOrder = 65536;
    }

    task.status = status;
    task.order = newOrder;
    await task.save();

    // Re-normalize if positions are getting too close (gap < 1)
    const columnTasks = await Task.find({ projectId: task.projectId, status }).sort({ order: 1 });
    let needsRebalance = false;
    for (let i = 1; i < columnTasks.length; i++) {
      if (columnTasks[i].order - columnTasks[i - 1].order < 1) {
        needsRebalance = true;
        break;
      }
    }
    if (needsRebalance) {
      const bulkOps = columnTasks.map((t, i) => ({
        updateOne: {
          filter: { _id: t._id },
          update: { $set: { order: (i + 1) * 1024 } },
        },
      }));
      await Task.bulkWrite(bulkOps);
    }

    const io = req.app.get("io");
    if (io) {
      // For movement inside the board
      io.to(`project:${task.projectId}`).emit("task-status-updated", task);
    }

    if (oldStatus !== status) {
      if (io) {
        io.to(`workspace:${task.workspaceId}`).emit("dashboard-updated");
      }
      await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_STATUS_CHANGED, task._id, "Task", { from: oldStatus, to: status }, io);

      if (task.assigneeId && task.assigneeId.toString() !== req.user?._id?.toString()) {
        await notify({
          workspaceId: task.workspaceId,
          recipientId: task.assigneeId,
          senderId: req.user!._id,
          type: NotificationType.STATUS_CHANGED,
          message: `Task "${task.title}" status changed to ${status}`,
          entityId: task._id,
          entityModel: "Task"
        }, io);
      }
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: "Workspace context required" });

    const {
      projectId,
      status,
      notStatus,
      assigneeId,
      priority,
      search,
      dueDate_lte,
      overdue,
      page = "1",
      limit = "20"
    } = req.query;

    const filter: Record<string, any> = { workspaceId };

    if (projectId) filter.projectId = projectId;
    if (status) filter.status = status;
    if (notStatus) filter.status = { $ne: notStatus };
    if (priority) filter.priority = priority;

    if (dueDate_lte) {
      filter.dueDate = { $lte: new Date(dueDate_lte as string) };
    }

    if (overdue === "true") {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: "DONE" };
    }

    if (assigneeId) {
      if (assigneeId === "me") {
        filter.assigneeId = req.user?._id;
      } else {
        filter.assigneeId = assigneeId;
      }
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 20;
    const skip = (p - 1) * l;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("projectId", "name")
        .populate("assigneeId", "name email")
        .sort({
          priorityScore: 1,
          dueDate: 1,
          createdAt: -1
        })
        .skip(skip)
        .limit(l),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: p,
        limit: l,
        pages: Math.ceil(total / l)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTasks = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: "Workspace context required" });

    const limit = parseInt(req.query.limit as string) || 10;

    const tasks = await Task.find({
      workspaceId,
      assigneeId: req.user?._id
    }).populate('projectId', 'name').sort({ createdAt: -1 }).limit(limit);

    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isMember = await Member.findOne({ workspaceId: task.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const oldAssignee = task.assigneeId?.toString();
    const priorityMap: Record<string, number> = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

    const updates: any = { ...req.body };
    if (req.body.priority) {
      updates.priorityScore = priorityMap[req.body.priority] || 3;
    }

    const updated = await Task.findByIdAndUpdate(id, updates, { new: true })
      .populate("projectId", "name")
      .populate("assigneeId", "name username avatarUrl")
      .populate("watchers", "name username");

    // Detailed Activity Logging
    const io = req.app.get("io");
    if (req.body.status && req.body.status !== task.status) {
      await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_STATUS_CHANGED, task._id, "Task", { from: task.status, to: req.body.status }, io);
    } else if (req.body.priority && req.body.priority !== task.priority) {
      await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_PRIORITY_CHANGED, task._id, "Task", { from: task.priority, to: req.body.priority }, io);
    } else if (req.body.dueDate && new Date(req.body.dueDate).getTime() !== task.dueDate?.getTime()) {
      await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_DUE_DATE_CHANGED, task._id, "Task", { from: task.dueDate, to: req.body.dueDate }, io);
    } else {
      await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_UPDATED, task._id, "Task", req.body, io);
    }

    // Notifications (Assignee + Watchers)
    const notifyIds = new Set<string>();

    // 1. New Assignee
    if (req.body.assigneeId && req.body.assigneeId !== oldAssignee) {
      notifyIds.add(req.body.assigneeId);
      if (io) io.to(`workspace:${task.workspaceId}`).emit("task-assigned", updated);
    }

    // 2. Watchers
    if (task.watchers) {
      task.watchers.forEach(w => notifyIds.add(w.toString()));
    }

    notifyIds.delete(req.user!._id.toString());

    for (const recipientId of notifyIds) {
      const isNewAssignee = recipientId === req.body.assigneeId;
      const type = isNewAssignee ? NotificationType.TASK_ASSIGNED : NotificationType.INFO;

      let message = `Task "${task.title}" was updated.`;
      if (isNewAssignee) message = `You were assigned to task "${task.title}" (${task.key})`;
      else if (req.body.status) message = `Task "${task.title}" status changed to ${req.body.status}`;

      await notify({
        workspaceId: task.workspaceId,
        recipientId: new mongoose.Types.ObjectId(recipientId),
        senderId: req.user!._id,
        type,
        message,
        entityId: task._id,
        entityModel: "Task",
      }, io);
    }

    if (io) {
      io.to(`project:${task.projectId}`).emit("task-updated", updated);
      io.to(`workspace:${task.workspaceId}`).emit("dashboard-updated");
    }

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isMember = await Member.findOne({ workspaceId: task.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    await Task.findByIdAndDelete(id);

    const io = req.app.get("io");
    await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_DELETED, task._id, "Task", { title: task.title, key: task.key }, io);

    if (io) {
      io.to(`project:${task.projectId}`).emit("task-deleted", { taskId: id });
      io.to(`workspace:${task.workspaceId}`).emit("dashboard-updated");
    }

    res.json({ message: "Task deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
export const toggleWatchTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const isMember = await Member.findOne({ workspaceId: task.workspaceId, userId });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const isWatching = task.watchers.some(w => w.toString() === userId?.toString());

    const io = req.app.get("io");
    if (isWatching) {
      task.watchers = task.watchers.filter(w => w.toString() !== userId?.toString());
      await logActivity(task.workspaceId.toString(), userId!, Actions.TASK_UNWATCHED, task._id, "Task", {}, io);
    } else {
      task.watchers.push(userId as any);
      await logActivity(task.workspaceId.toString(), userId!, Actions.TASK_WATCHED, task._id, "Task", {}, io);
    }

    await task.save();
    res.json({ isWatching: !isWatching, watchersCount: task.watchers.length });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
