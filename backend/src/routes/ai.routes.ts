import express from "express";
import {
  generateSprintTasks,
  planProject,
  generateSubtasks,
  parseNotes,
  summarizeTask,
  prioritizeTasks,
  predictSprint,
  getInsights,
  chatAssistant,
  planSprint,
  suggestPriority,
  estimateDeadline,
  getDailySummary,
  generateTasksFromDescription,
  summarizeTaskDiscussion,
  generateRoadmap,
  getSprintHealthInsights
} from "../controllers/ai.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";

const router = express.Router();

router.use(protect);

router.post("/generate-sprint", generateSprintTasks);
router.post("/plan-project", planProject);
router.post("/generate-subtasks", generateSubtasks);
router.post("/meeting-notes", parseNotes);
router.post("/summarize", summarizeTask);
router.post("/prioritize", requireWorkspace, prioritizeTasks);
router.post("/predict-sprint", requireWorkspace, predictSprint);
router.post("/insights", requireWorkspace, getInsights);
router.post("/chat", requireWorkspace, chatAssistant);

// Phase 10 New Endpoints
router.post("/plan-sprint", requireWorkspace, planSprint);
router.post("/suggest-priority", suggestPriority);
router.post("/estimate-deadline", estimateDeadline);
router.get("/daily-summary", getDailySummary);
router.post("/generate-tasks", requireWorkspace, generateTasksFromDescription);
router.post("/summarize-discussion", requireWorkspace, summarizeTaskDiscussion);
router.post("/generate-roadmap", requireWorkspace, generateRoadmap);
router.post("/sprint-health", requireWorkspace, getSprintHealthInsights);

export default router;
