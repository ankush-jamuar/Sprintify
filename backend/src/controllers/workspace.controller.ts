import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Workspace from "../models/workspace.model";
import Member, { Role } from "../models/member.model";
import Project from "../models/project.model";
import Task from "../models/task.model";
import User from "../models/user.model";
import Invitation, { InvitationStatus } from "../models/invitation.model";
import Notification, { NotificationType } from "../models/notification.model";
import mongoose from "mongoose";
import { logActivity, Actions } from "../services/activity.service";
import { notify, notifyAdminsAndOwners } from "../services/notification.service";

export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { name } = req.body;
    const workspace = await Workspace.create({ name, ownerId: req.user._id });

    await Member.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: Role.OWNER,
    });

    res.status(201).json(workspace);
  } catch (error: any) {
    console.error("createWorkspace Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await Member.find({ userId: req.user?._id }).populate("workspaceId");
    const workspaces = memberships.map((m: any) => {
      // populate replaces workspaceId with the actual workspace document
      const ws = m.workspaceId.toObject ? m.workspaceId.toObject() : m.workspaceId;
      return { ...ws, role: m.role };
    });
    res.json(workspaces);
  } catch (error: any) {
    console.error("getUserWorkspaces Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const getWorkspaceProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(workspaceId as string)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    // Basic tenant isolation check -> user must be a member
    const isMember = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!isMember) return res.status(403).json({ message: "Not a member of this workspace" });

    const projects = await Project.find({ workspaceId });
    res.json(projects);
  } catch (error: any) {
    console.error("getWorkspaceProjects Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const inviteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    const { workspaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId as string)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    // Verify the inviter is a member (owner/admin)
    const inviterMember = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!inviterMember || ![Role.OWNER, Role.ADMIN].includes(inviterMember.role)) {
      return res.status(403).json({ message: "Only owners and admins can invite members" });
    }

    // Check if user is already a member
    const userToInvite = await User.findOne({ email });
    if (userToInvite) {
      const existingMember = await Member.findOne({
        workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        userId: userToInvite._id
      });
      if (existingMember) return res.status(400).json({ message: "User is already a member" });
    }

    // Create or update invitation
    const invitation = await Invitation.findOneAndUpdate(
      { workspaceId: new mongoose.Types.ObjectId(workspaceId as string), email, status: InvitationStatus.PENDING },
      { inviterId: req.user?._id, role: role || Role.MEMBER },
      { upsert: true, new: true }
    );

    // If user exists, send a notification
    if (userToInvite) {
      const io = req.app.get("io");
      await notify({
        workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
        recipientId: userToInvite._id,
        senderId: req.user?._id,
        type: NotificationType.SYSTEM,
        message: `You were invited to join Workspace: ${workspace.name}`,
        entityId: invitation._id,
        entityModel: 'Invitation'
      }, io);
    }

    res.status(201).json({ message: "Invitation sent", invitation });
  } catch (error: any) {
    console.error("inviteMember Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?._id;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return res.json({ message: "Already accepted", workspaceId: invitation.workspaceId });
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return res.status(400).json({ message: "Invalid or expired invitation" });
    }

    const user = await User.findById(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ message: "This invitation is not for you" });
    }

    // Double check they aren't somehow already a member
    const existingMember = await Member.findOne({ workspaceId: invitation.workspaceId, userId });
    if (existingMember) {
      invitation.status = InvitationStatus.ACCEPTED;
      await invitation.save();
      return res.json({ message: "Already a member", workspaceId: invitation.workspaceId });
    }

    // Add to members
    await Member.create({
      workspaceId: invitation.workspaceId,
      userId: userId,
      role: invitation.role as Role,
    });

    invitation.status = InvitationStatus.ACCEPTED;
    await invitation.save();

    await logActivity(invitation.workspaceId, userId!, Actions.WORKSPACE_UPDATED, invitation.workspaceId, "Workspace", {
      action: "Member Joined",
      invitationId: invitation._id
    });

    const io = req.app.get("io");
    if (io && user) {
      await notifyAdminsAndOwners({
        workspaceId: invitation.workspaceId,
        senderId: userId,
        type: NotificationType.SYSTEM,
        message: `${user.name} has joined the workspace!`,
        entityId: invitation.workspaceId,
        entityModel: "Workspace",
      }, io);
    }

    res.json({ message: "Invitation accepted", workspaceId: invitation.workspaceId });
  } catch (error: any) {
    console.error("acceptInvite Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const getWorkspaceMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(workspaceId as string)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const isMember = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!isMember) return res.status(403).json({ message: "Not a member" });

    const members = await Member.find({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string)
    }).populate("userId", "name email avatarUrl");
    res.json(members);
  } catch (error: any) {
    console.error("getWorkspaceMembers Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId as string) || !mongoose.Types.ObjectId.isValid(memberId as string)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if requester is owner/admin
    const requester = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!requester || ![Role.OWNER, Role.ADMIN].includes(requester.role)) {
      return res.status(403).json({ message: "Only owners and admins can remove members" });
    }

    const memberToDelete = await Member.findById(memberId);
    if (!memberToDelete) return res.status(404).json({ message: "Member not found" });

    // Cannot remove owner
    if (memberToDelete.role === Role.OWNER) {
      return res.status(400).json({ message: "Cannot remove the workspace owner" });
    }

    await Member.findByIdAndDelete(memberId);
    res.json({ message: "Member removed" });
  } catch (error: any) {
    console.error("removeMember Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;

    if (!mongoose.Types.ObjectId.isValid(workspaceId as string)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    const requester = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!requester || ![Role.OWNER, Role.ADMIN].includes(requester.role)) {
      return res.status(403).json({ message: "Only owners and admins can update workspace settings" });
    }

    const workspace = await Workspace.findByIdAndUpdate(workspaceId, { name }, { new: true });
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    res.json(workspace);
  } catch (error: any) {
    console.error("updateWorkspace Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(workspaceId as string) || !mongoose.Types.ObjectId.isValid(memberId as string)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Only owner can change roles
    const requester = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(workspaceId as string),
      userId: req.user?._id
    });
    if (!requester || requester.role !== Role.OWNER) {
      return res.status(403).json({ message: "Only the workspace owner can change roles" });
    }

    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (member.role === Role.OWNER) return res.status(400).json({ message: "Cannot change owner role" });

    member.role = role;
    await member.save();

    res.json(member);
  } catch (error: any) {
    console.error("updateMemberRole Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const declineInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = req.user?._id;

    const invitation = await Invitation.findById(invitationId);
    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status === InvitationStatus.DECLINED) {
      return res.json({ message: "Already declined" });
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      return res.status(400).json({ message: "Invalid or expired invitation" });
    }

    const user = await User.findById(userId);
    if (!user || user.email !== invitation.email) {
      return res.status(403).json({ message: "This invitation is not for you" });
    }

    invitation.status = InvitationStatus.DECLINED;
    await invitation.save();

    res.json({ message: "Invitation declined" });
  } catch (error: any) {
    console.error("declineInvite Error: ", error);
    res.status(500).json({ message: error.message });
  }
};

export const deleteWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const wsIdStr = workspaceId as string;

    if (!mongoose.Types.ObjectId.isValid(wsIdStr)) {
      return res.status(400).json({ message: "Invalid workspace ID" });
    }

    // Only the Owner can delete the workspace
    const requester = await Member.findOne({
      workspaceId: new mongoose.Types.ObjectId(wsIdStr),
      userId: req.user?._id,
    });

    if (!requester || requester.role !== Role.OWNER) {
      return res.status(403).json({ message: "Only the workspace owner can delete it" });
    }

    // Cascade: delete all tasks, projects, members, invitations and notifications
    const wid = new mongoose.Types.ObjectId(wsIdStr);
    await Task.deleteMany({ workspaceId: wid });
    await Project.deleteMany({ workspaceId: wid });
    await Member.deleteMany({ workspaceId: wid });
    await Invitation.deleteMany({ workspaceId: wid });
    await Notification.deleteMany({ workspaceId: wid });
    await Workspace.findByIdAndDelete(wsIdStr);

    // Notify all sockets in the workspace room about the deletion
    const io = req.app.get("io");
    if (io) io.to(`workspace:${wsIdStr}`).emit("workspace-deleted", { workspaceId: wsIdStr });

    res.json({ message: "Workspace deleted successfully" });
  } catch (error: any) {
    console.error("deleteWorkspace Error: ", error);
    res.status(500).json({ message: error.message });
  }
};
