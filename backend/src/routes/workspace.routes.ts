import express from "express";
import { createWorkspace, getUserWorkspaces, getWorkspaceProjects, inviteMember, acceptInvite, declineInvite, getWorkspaceMembers, removeMember, updateWorkspace, updateMemberRole, deleteWorkspace } from "../controllers/workspace.controller";
import { protect } from "../middlewares/auth.middleware";

const router = express.Router();

router.use(protect); // All routes require auth

router.route("/")
  .post(createWorkspace)
  .get(getUserWorkspaces);

router.get("/:workspaceId/projects", getWorkspaceProjects);
router.put("/:workspaceId", updateWorkspace);
router.delete("/:workspaceId", deleteWorkspace);
router.post("/:workspaceId/invite", inviteMember);
router.post("/invitations/:invitationId/accept", acceptInvite);
router.post("/invitations/:invitationId/decline", declineInvite);
router.get("/:workspaceId/members", getWorkspaceMembers);
router.delete("/:workspaceId/members/:memberId", removeMember);
router.put("/:workspaceId/members/:memberId/role", updateMemberRole);

export default router;
