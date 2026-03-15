import { Router } from "express";
import { handleGithubWebhook, linkProjectToRepo } from "../controllers/github.controller";
import { protect } from "../middlewares/auth.middleware";

const router = Router();

// Webhook endpoint (Public, but we verify signature in controller)
router.post("/webhook", handleGithubWebhook);

// Link project to repo (Protected)
router.post("/link", protect, linkProjectToRepo);

export default router;
