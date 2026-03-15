import ActivityLog from "../models/activityLog.model";
import mongoose from "mongoose";

/**
 * Centralized activity logging service.
 * Call this from any controller to record an activity event.
 * Pass `io` (Socket.io server) to also broadcast to workspace members.
 */
export async function logActivity(
  workspaceId: string | mongoose.Types.ObjectId,
  actorId: string | mongoose.Types.ObjectId,
  action: string,
  entityId: string | mongoose.Types.ObjectId,
  entityModel: string,
  details?: Record<string, any>,
  io?: any
): Promise<void> {
  try {
    const log = await ActivityLog.create({
      workspaceId,
      actorId,
      action,
      entityId,
      entityModel,
      details,
    });

    // Real-time broadcast to all workspace members
    if (io) {
      const populated = await log.populate("actorId", "name");
      io.to(`workspace:${workspaceId}`).emit("activity-created", populated);
    }
  } catch (error) {
    // Log but don't throw — activity logging should never block main operations
    console.error("Activity logging failed:", error);
  }
}

/**
 * Standard action constants for consistent activity tracking.
 */
export const Actions = {
  // Projects
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
  PROJECT_DELETED: "PROJECT_DELETED",

  // Tasks
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "UPDATED_TASK",
  TASK_STATUS_CHANGED: "TASK_STATUS_CHANGED",
  TASK_DELETED: "TASK_DELETED",

  // Comments
  COMMENTED_ON_TASK: "COMMENTED_ON_TASK",
  COMMENT_EDITED: "COMMENT_EDITED",
  COMMENT_DELETED: "COMMENT_DELETED",

  // Task Transitions
  TASK_PRIORITY_CHANGED: "TASK_PRIORITY_CHANGED",
  TASK_DUE_DATE_CHANGED: "TASK_DUE_DATE_CHANGED",
  TASK_WATCHED: "TASK_WATCHED",
  TASK_UNWATCHED: "TASK_UNWATCHED",

  // Workspace
  MEMBER_INVITED: "MEMBER_INVITED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  MEMBER_ROLE_UPDATED: "MEMBER_ROLE_UPDATED",
  WORKSPACE_UPDATED: "WORKSPACE_UPDATED",

  // Planning
  EPIC_CREATED: "EPIC_CREATED",
  EPIC_UPDATED: "EPIC_UPDATED",
  SPRINT_CREATED: "SPRINT_CREATED",
  SPRINT_STARTED: "SPRINT_STARTED",
  SPRINT_UPDATED: "SPRINT_UPDATED",
  SPRINT_COMPLETED: "SPRINT_COMPLETED",
} as const;
