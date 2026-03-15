import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import Project from "../models/project.model";
import { processGithubWebhook } from "../services/github.service";
import crypto from "crypto";

export const handleGithubWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const signature = req.headers["x-hub-signature-256"];
    const payload = req.body;

    // In a real production app, we would verify the webhook signature here
    // using project.githubWebhookSecret. For this demo, we'll log and proceed.
    console.log("Received GitHub Webhook for repo:", payload?.repository?.full_name);

    await processGithubWebhook(payload);

    res.status(200).json({ status: "processed" });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

export const linkProjectToRepo = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, githubRepo } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Generate a random secret for the webhook
    const secret = crypto.randomBytes(20).toString("hex");

    project.githubRepo = githubRepo;
    project.githubWebhookSecret = secret;
    await project.save();

    res.json({
      message: "Project linked to GitHub repo",
      webhookUrl: `${process.env.BACKEND_URL || "http://your-backend.com"}/api/v1/github/webhook`,
      secret: secret,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
