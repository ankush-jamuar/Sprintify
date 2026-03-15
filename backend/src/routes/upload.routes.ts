import express from "express";
import { uploadAttachment } from "../controllers/upload.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = express.Router();

router.post("/task/:taskId", protect, requireWorkspace, upload.single("file"), uploadAttachment);

export default router;
