import express from "express";
import { createTask, getProjectTasks, updateTaskPosition, getTasks, updateTask, deleteTask, getMyTasks, toggleWatchTask } from "../controllers/task.controller";
import { protect } from "../middlewares/auth.middleware";
import { requireWorkspace } from "../middlewares/workspace.middleware";

const router = express.Router();

router.use(protect);

router.route("/")
  .post(createTask)
  .get(requireWorkspace, getTasks);

router.get("/my-tasks", requireWorkspace, getMyTasks);
router.get("/project/:projectId", getProjectTasks);
router.put("/:id/position", updateTaskPosition);
router.post("/:id/watch", toggleWatchTask);

router.route("/:id")
  .put(updateTask)
  .delete(deleteTask);

export default router;
