import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/error.middleware";

import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import projectRoutes from "./routes/project.routes";
import taskRoutes from "./routes/task.routes";
import aiRoutes from "./routes/ai.routes";
import commentRoutes from "./routes/comment.routes";
import notificationRoutes from "./routes/notification.routes";
import analyticsRoutes from "./routes/analytics.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import githubRoutes from "./routes/github.routes";
import searchRoutes from "./routes/search.routes";
import uploadRoutes from "./routes/upload.routes";
import planningRoutes from "./routes/planning.routes";

const app = express();

// Build allowed origins from CLIENT_URL (supports comma-separated values)
const allowedOrigins: string[] = [];
if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(",").forEach(u => allowedOrigins.push(u.trim()));
}
if (!allowedOrigins.includes("http://localhost:5173")) allowedOrigins.push("http://localhost:5173");
if (!allowedOrigins.includes("http://localhost:5174")) allowedOrigins.push("http://localhost:5174");

// Middlewares
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// Register Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/workspaces", workspaceRoutes);
app.use("/api/v1/projects", projectRoutes);
app.use("/api/v1/tasks", taskRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/comments", commentRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/github", githubRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/planning", planningRoutes);

// Centralized error handler (must be last)
app.use(errorHandler);

export default app;
