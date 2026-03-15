import Task, { TaskStatus } from "../models/task.model";
import Project from "../models/project.model";
import ActivityLog from "../models/activityLog.model";

export const processGithubWebhook = async (payload: any) => {
  const { commits, repository } = payload;
  if (!commits || !repository) return;

  const repoFullName = repository.full_name; // e.g. "owner/repo"
  const project = await Project.findOne({ githubRepo: repoFullName });
  if (!project) return;

  for (const commit of commits) {
    const message = commit.message;
    const author = commit.author.name;

    // Regex to find task keys like SPR-123
    const keyMatch = message.match(/SPR-\d+/g);
    if (!keyMatch) continue;

    const shouldClose = /fixes|closes|resolves|completes/i.test(message);

    for (const key of keyMatch) {
      const task = await Task.findOne({ key, projectId: project._id });
      if (!task) continue;

      if (shouldClose && task.status !== TaskStatus.DONE) {
        task.status = TaskStatus.DONE;
        await task.save();

        // Log the activity
        await ActivityLog.create({
          workspaceId: project.workspaceId,
          action: "UPDATED_TASK",
          entityId: task._id,
          entityModel: "Task",
          details: {
            status: TaskStatus.DONE,
            via: "GitHub Webhook",
            commit: commit.id,
            message: message,
            author: author,
          },
        });

        // Potentially emit socket event here if we had access to IO
        // Since this is a service, we'll return the updated tasks for the controller to handle emissions
      }
    }
  }
};
