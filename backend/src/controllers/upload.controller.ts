import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Task from "../models/task.model";
import { logActivity, Actions } from "../services/activity.service";

export const uploadAttachment = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Validate workspace
    if (task.workspaceId.toString() !== req.workspaceId) {
       return res.status(403).json({ message: "Access denied" });
    }

    const { path, originalname, size, mimetype } = req.file as any;

    const attachment = {
      url: path,
      name: originalname,
      size: size,
      type: mimetype,
      uploadedAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    await logActivity(task.workspaceId.toString(), req.user!._id, Actions.TASK_UPDATED, task._id, "Task", { 
       action: "Attachment Added", 
       fileName: originalname 
    });

    res.status(200).json({ 
       message: "File uploaded successfully", 
       attachment: task.attachments[task.attachments.length - 1] 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
