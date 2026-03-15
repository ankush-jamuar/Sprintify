import { Router } from "express";
import { globalSearch } from "../controllers/search.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";

const router = Router();

router.get("/", protect, requireWorkspace, globalSearch);

export default router;
