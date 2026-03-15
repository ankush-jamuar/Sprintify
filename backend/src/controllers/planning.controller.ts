import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Epic from "../models/epic.model";
import Sprint from "../models/sprint.model";
import Task from "../models/task.model";
import { logActivity, Actions } from "../services/activity.service";

// --- Epics ---

export const createEpic = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, projectId } = req.body;
        const epic = await Epic.create({ name, description, projectId });

        await logActivity(
            req.workspaceId!,
            req.user!._id,
            Actions.EPIC_CREATED,
            epic._id as any,
            "Epic",
            { name: epic.name }
        );

        res.status(201).json(epic);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getEpics = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const epics = await Epic.find({ projectId }).sort({ createdAt: 1 });

        // Calculate progress for each epic
        const epicsWithProgress = await Promise.all(epics.map(async (epic) => {
            const tasks = await Task.find({ epicId: epic._id });
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter(t => t.status === "DONE").length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            return {
                ...epic.toObject(),
                totalTasks,
                completedTasks,
                progress
            };
        }));

        res.json(epicsWithProgress);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateEpic = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const updatedEpic = await Epic.findByIdAndUpdate(id, req.body, { new: true });
        res.json(updatedEpic);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- Sprints ---

export const createSprint = async (req: AuthRequest, res: Response) => {
    try {
        const { name, projectId, startDate, endDate, goal } = req.body;

        // Deactivate current active sprint if any
        if (req.body.status === "ACTIVE") {
            await Sprint.updateMany({ projectId, status: "ACTIVE" }, { status: "COMPLETED" });
        }

        const sprint = await Sprint.create({ name, projectId, startDate, endDate, goal, status: req.body.status || "PLANNED" });

        await logActivity(
            req.workspaceId!,
            req.user!._id,
            Actions.SPRINT_CREATED,
            sprint._id as any,
            "Sprint",
            { name: sprint.name, goal: sprint.goal }
        );

        res.status(201).json(sprint);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getSprints = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const sprints = await Sprint.find({ projectId }).sort({ startDate: -1 });
        res.json(sprints);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getActiveSprint = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const sprint = await Sprint.findOne({ projectId, status: "ACTIVE" });
        if (!sprint) return res.status(200).json({ sprint: null, tasks: [] });

        const tasks = await Task.find({ sprintId: sprint._id }).sort({ order: 1 });
        res.json({ sprint, tasks });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const updateSprintStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (status === "ACTIVE") {
            const sprint = await Sprint.findById(id);
            if (sprint) {
                await Sprint.updateMany({ projectId: sprint.projectId, status: "ACTIVE" }, { status: "COMPLETED" });
            }
        }

        const updatedSprint = await Sprint.findByIdAndUpdate(id, { status }, { new: true });
        res.json(updatedSprint);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const startSprint = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const sprint = await Sprint.findById(id);
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const projectId = sprint.projectId;

        // Ensure only one sprint is active
        await Sprint.updateMany({ projectId, status: "ACTIVE" }, { status: "COMPLETED" });

        sprint.status = "ACTIVE";
        sprint.startDate = new Date(); // Start it now if not already set
        await sprint.save();

        await logActivity(
            req.workspaceId!,
            req.user!._id,
            Actions.SPRINT_STARTED,
            sprint._id as any,
            "Sprint",
            { name: sprint.name }
        );

        res.json(sprint);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const endSprint = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const sprint = await Sprint.findById(id);
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        sprint.status = "COMPLETED";
        sprint.endDate = new Date();
        await sprint.save();

        // Move incomplete tasks back to backlog
        await Task.updateMany(
            { sprintId: sprint._id, status: { $ne: "DONE" } },
            { sprintId: null }
        );

        await logActivity(
            req.workspaceId!,
            req.user!._id,
            Actions.SPRINT_COMPLETED,
            sprint._id as any,
            "Sprint",
            { name: sprint.name }
        );

        res.json(sprint);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// --- Analytics ---

export const getVelocityData = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const completedSprints = await Sprint.find({ projectId, status: "COMPLETED" }).sort({ endDate: 1 }).limit(5);

        const velocityData = await Promise.all(completedSprints.map(async (sprint) => {
            const completedTasksCount = await Task.countDocuments({ sprintId: sprint._id, status: "DONE" });
            return {
                name: sprint.name,
                completedTasks: completedTasksCount
            };
        }));

        res.json(velocityData);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getBurndownData = async (req: AuthRequest, res: Response) => {
    try {
        const { sprintId } = req.params;
        const sprint = await Sprint.findById(sprintId);
        if (!sprint) return res.status(404).json({ message: "Sprint not found" });

        const tasks = await Task.find({ sprintId });
        const totalTasks = tasks.length;

        // Logic for burndown data points (simplified for this exercise)
        // In a real app, you'd track daily task status changes
        // Here we generate current status

        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

        const dataPoints = [];
        let remaining = totalTasks;

        for (let i = 0; i <= days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            // This is a simulation since we don't have historical data
            // Ideally, query historical logs for tasks completed by 'date'
            const tasksCompletedBeforeDate = await Task.countDocuments({
                sprintId,
                status: "DONE",
                updatedAt: { $lte: date }
            });

            dataPoints.push({
                day: `Day ${i}`,
                date: date.toISOString().split('T')[0],
                ideal: Math.max(0, totalTasks - (totalTasks / days) * i),
                actual: totalTasks - tasksCompletedBeforeDate
            });
        }

        res.json(dataPoints);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
