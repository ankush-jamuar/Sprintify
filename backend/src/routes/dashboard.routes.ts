import { Router } from "express";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";
import { getTaskStats, getActivityHeatmap } from "../controllers/dashboard.controller";

const router = Router();

router.use(protect);

router.get("/task-stats", requireWorkspace, getTaskStats);
router.get("/activity-heatmap", requireWorkspace, getActivityHeatmap);

export default router;
