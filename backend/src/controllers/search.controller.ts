import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Task from "../models/task.model";
import Project from "../models/project.model";
import Member from "../models/member.model";
import User from "../models/user.model";

export const globalSearch = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: "Workspace context required" });

    const { q } = req.query;
    if (!q || typeof q !== "string" || q.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters" });
    }

    const regex = new RegExp(q.trim(), "i");

    const [projects, tasks, members] = await Promise.all([
      Project.find({ workspaceId, name: regex }).limit(10).lean(),
      Task.find({ workspaceId, $or: [{ title: regex }, { key: regex }, { description: regex }] })
        .limit(15)
        .lean(),
      Member.find({ workspaceId })
        .populate({
          path: "userId",
          match: { $or: [{ name: regex }, { email: regex }] },
          select: "name email",
        })
        .lean()
        .then((members) => members.filter((m) => m.userId !== null).slice(0, 10)),
    ]);

    res.json({
      projects: projects.map((p) => ({ _id: p._id, name: p.name, type: "project" })),
      tasks: tasks.map((t) => ({ _id: t._id, title: t.title, key: t.key, status: t.status, type: "task" })),
      members: members.map((m: any) => ({ _id: m.userId._id, name: m.userId.name, email: m.userId.email, role: m.role, type: "user" })),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
