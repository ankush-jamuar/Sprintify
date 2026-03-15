import express from "express";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";
import {
    createEpic, getEpics, updateEpic,
    createSprint, getSprints, getActiveSprint, updateSprintStatus,
    startSprint, endSprint,
    getVelocityData, getBurndownData
} from "../controllers/planning.controller";

const router = express.Router();

router.use(protect);
router.use(requireWorkspace);

// Epics
router.post("/epics", createEpic);
router.get("/projects/:projectId/epics", getEpics);
router.patch("/epics/:id", updateEpic);

// Sprints
router.post("/sprints", createSprint);
router.get("/projects/:projectId/sprints", getSprints);
router.get("/projects/:projectId/sprints/active", getActiveSprint);
router.patch("/sprints/:id/status", updateSprintStatus);
router.patch("/sprints/:id/start", startSprint);
router.patch("/sprints/:id/end", endSprint);

// Analytics
router.get("/projects/:projectId/velocity", getVelocityData);
router.get("/sprints/:sprintId/burndown", getBurndownData);

export default router;
