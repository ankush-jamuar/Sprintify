import Notification, { NotificationType, INotification } from "../models/notification.model";
import mongoose from "mongoose";

interface NotifyParams {
  workspaceId: string | mongoose.Types.ObjectId;
  recipientId: string | mongoose.Types.ObjectId;
  senderId?: string | mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  entityId?: string | mongoose.Types.ObjectId;
  entityModel?: "Task" | "Project" | "Workspace" | "Invitation";
}

/**
 * Create a notification and optionally emit via Socket.io
 */
export async function notify(
  params: NotifyParams,
  io?: any
): Promise<INotification | null> {
  try {
    const notification = await Notification.create({
      workspaceId: params.workspaceId,
      recipientId: params.recipientId,
      senderId: params.senderId,
      type: params.type,
      message: params.message,
      entityId: params.entityId,
      entityModel: params.entityModel,
    });

    // Push to user via Socket.io if available
    if (io) {
      io.to(`user:${params.recipientId}`).emit("notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Notification creation failed:", error);
    return null;
  }
}

import Member from "../models/member.model";

/**
 * Notify all Owners and Admins of a workspace
 */
export async function notifyAdminsAndOwners(
  params: Omit<NotifyParams, "recipientId">,
  io?: any
) {
  try {
    const admins = await Member.find({ 
      workspaceId: params.workspaceId, 
      role: { $in: ['OWNER', 'ADMIN'] } 
    });
    for (const admin of admins) {
      if (admin.userId.toString() !== params.senderId?.toString()) {
        await notify({ ...params, recipientId: admin.userId }, io);
      }
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}

/**
 * Notify Owners explicitly (they want ALL events)
 */
export async function notifyOwners(
  params: Omit<NotifyParams, "recipientId">,
  io?: any
) {
  try {
    const owners = await Member.find({ 
      workspaceId: params.workspaceId, 
      role: 'OWNER' 
    });
    for (const owner of owners) {
      if (owner.userId.toString() !== params.senderId?.toString()) {
        await notify({ ...params, recipientId: owner.userId }, io);
      }
    }
  } catch (error) {
    console.error("Failed to notify owners:", error);
  }
}
