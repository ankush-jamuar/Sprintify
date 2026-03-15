import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Project, { generatePrefix } from "../models/project.model";
import Member from "../models/member.model";
import { logActivity, Actions } from "../services/activity.service";
import { notifyAdminsAndOwners } from "../services/notification.service";
import { NotificationType } from "../models/notification.model";

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    const workspaceId = req.workspaceId;
    
    if (!workspaceId) return res.status(400).json({ message: "Workspace ID required" });

    // Generate unique prefix within workspace
    let prefix = generatePrefix(name);
    const existing = await Project.findOne({ workspaceId, prefix });
    if (existing) {
      // Append numeric suffix to make unique
      const count = await Project.countDocuments({ workspaceId, prefix: { $regex: `^${prefix}` } });
      prefix = `${prefix}${count + 1}`;
    }

    const project = await Project.create({ workspaceId, name, description, prefix });
    await logActivity(workspaceId, req.user!._id, Actions.PROJECT_CREATED, project._id, "Project", { name, prefix });
    
    const io = req.app.get("io");
    if (io) {
      await notifyAdminsAndOwners({
        workspaceId,
        senderId: req.user!._id,
        type: NotificationType.SYSTEM,
        message: `Project "${name}" was created.`,
        entityId: project._id,
        entityModel: "Project",
      }, io);
    }

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjectDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;
    if (!workspaceId) return res.status(400).json({ message: "Workspace ID required" });

    // By default, only return non-archived projects
    const showArchived = req.query.archived === "true";
    const projects = await Project.find({ workspaceId, isArchived: showArchived });
    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const updated = await Project.findByIdAndUpdate(id, req.body, { new: true });
    await logActivity(project.workspaceId.toString(), req.user!._id, Actions.PROJECT_UPDATED, project._id, "Project", req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    await Project.findByIdAndDelete(id);
    await logActivity(project.workspaceId.toString(), req.user!._id, Actions.PROJECT_DELETED, project._id, "Project", { name: project.name });
    res.json({ message: "Project deleted" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleStarProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    project.isFavorite = !project.isFavorite;
    await project.save();

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const toggleArchiveProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const isMember = await Member.findOne({ workspaceId: project.workspaceId, userId: req.user?._id });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    project.isArchived = !project.isArchived;
    await project.save();

    await logActivity(project.workspaceId.toString(), req.user!._id,
      project.isArchived ? Actions.PROJECT_UPDATED : Actions.PROJECT_UPDATED,
      project._id, "Project", { action: project.isArchived ? "archived" : "unarchived" }
    );

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
