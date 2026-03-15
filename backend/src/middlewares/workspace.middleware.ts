import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware";
import Member from "../models/member.model";
import mongoose from "mongoose";

/**
 * Workspace isolation middleware.
 * Extracts workspaceId from the x-workspace-id header,
 * verifies the authenticated user is a member of that workspace,
 * and injects the verified workspaceId into req.workspaceId.
 */
export const requireWorkspace = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;

    if (!workspaceId) {
      return res.status(400).json({ message: "x-workspace-id header is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const membership = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      userId: req.user?._id,
    });

    if (!membership) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    // Inject verified workspace context
    req.workspaceId = workspaceId;
    (req as any).memberRole = membership.role;

    next();
  } catch (error: any) {
    res.status(500).json({ message: "Workspace validation failed", error: error.message });
  }
};
