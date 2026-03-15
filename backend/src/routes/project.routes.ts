import express from "express";
import { createProject, getProjectDetails, getProjects, updateProject, deleteProject, toggleStarProject, toggleArchiveProject } from "../controllers/project.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";

const router = express.Router();

router.use(protect);

router.route("/")
  .post(requireWorkspace, createProject)
  .get(requireWorkspace, getProjects);

router.route("/:id")
  .get(requireWorkspace, getProjectDetails)
  .put(requireWorkspace, updateProject)
  .delete(requireWorkspace, deleteProject);

router.patch("/:id/star", requireWorkspace, toggleStarProject);
router.patch("/:id/archive", requireWorkspace, toggleArchiveProject);

export default router;
