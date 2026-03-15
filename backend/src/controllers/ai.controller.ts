import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import OpenAI from "openai";
import Task, { ITask } from "../models/task.model";
import Project from "../models/project.model";
import Comment, { IComment } from "../models/comment.model";
import Sprint from "../models/sprint.model";
import { Actions, logActivity } from "../services/activity.service";
import { notify } from "../services/notification.service";
import { NotificationType } from "../models/notification.model";
import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.model";

let _openai: OpenAI | null = null;
const getOpenAI = () => {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
  }
  return _openai;
};

// Shared helper to call GPT with JSON mode
async function askAI(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Groq API key missing");
  }

  try {
    const openai = getOpenAI();
    const model = "llama-3.3-70b-versatile";
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    console.log("====== GROQ RAW DEBUG ======");
    console.log("Using Groq model:", model);
    console.log("System Prompt Sent:", systemPrompt);
    console.log("User Prompt Sent:", userPrompt);
    console.log("Groq raw response:", completion.choices[0].message.content);
    console.log("==============================");

    const aiResponse = completion.choices[0].message.content;
    return aiResponse || "{}";
  } catch (error: any) {
    console.error("AI Model Generation Error:", error.message || error);
    // Return a special error string that we can check for
    return `ERROR: ${error.message || "Unknown OpenAI error"}`;
  }
}

// ═══════════════════════════════════════
// 1. AI Project Planner
// ═══════════════════════════════════════
export const planProject = async (req: AuthRequest, res: Response) => {
  try {
    const { idea } = req.body;
    if (!idea) return res.status(400).json({ message: "Project idea is required" });

    const aiRaw = await askAI(
      "You are a seasoned software project manager. Given a project idea, output a detailed project plan as JSON: { \"name\": \"project name\", \"milestones\": [{ \"title\": \"Milestone Name\", \"tasks\": [{ \"title\": \"Specific actionable task\", \"description\": \"Clear technical description of what needs to be done\" }] }] }. Generate 3-4 milestones each with 2-4 specific, professional engineering tasks. Task titles must be action-oriented (e.g. 'Design JWT authentication strategy', not 'Setup auth'). Descriptions must explain the technical approach.",
      `Plan this project: ${idea}`
    );

    // Dynamic Fallback Generator for project plans based on the input text
    const phrases = idea.split(/(?:and|then|\.|,|;)\s+/i).map((s: string) => s.trim()).filter((s: string) => s.length > 4);
    const generatedTasks = phrases.length > 0
      ? phrases.map((p: string, i: number) => ({ title: `Implement: ${p.substring(0, 40)}`, description: `Execute on the requirement: ${p}` }))
      : [
        { title: "Initial setup", description: `Initialize foundations for ${idea}` },
        { title: "Core development", description: "Build the primary logical components." }
      ];

    const fallbackPlan = {
      name: idea.substring(0, 50),
      milestones: [
        {
          title: "Phase 1: Implementation",
          tasks: generatedTasks
        }
      ],
    };

    try {
      res.json(JSON.parse(aiRaw));
    } catch (parseError) {
      res.json(fallbackPlan);
    }
  } catch (error: any) {
    res.status(200).json({ name: "Fallback Plan", milestones: [] });
  }
};

// ═══════════════════════════════════════
// 2. AI Sprint Task Generator (existing, enhanced)
// ═══════════════════════════════════════
export const generateSprintTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, prompt } = req.body;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId as string)) {
      return res.status(400).json({ message: "Invalid or missing project ID" });
    }
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const aiRaw = await askAI(
      `You are a senior software architect and project manager.

Break the following project goal into 6-10 realistic development tasks.

Requirements:
- Tasks must represent real engineering steps.
- Tasks must be action-oriented.
- Avoid generic phrases like "setup" or "implement".
- Cover the full development lifecycle.

Lifecycle phases to consider:
Planning
Architecture
Development
Testing
Deployment

Return JSON format:

{
 "tasks": [
   { "title": "Task title", "description": "Technical explanation" }
 ]
}`,
      `Project goal:\n${prompt}`
    );

    let tasks: { title: string; description: string }[] = [];

    try {
      const parsed = JSON.parse(aiRaw);
      if (parsed.tasks && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks;
      } else {
        throw new Error("Invalid structure from AI");
      }
    } catch (e) {
      console.warn("Failed to parse AI sprint tasks", e);
      tasks = [
        { title: `Define requirements for ${prompt}`, description: "Analyze user stories, create acceptance criteria, and determine technical constraints" },
        { title: `Implement ${prompt} core logic`, description: "Build the primary functionality following the agreed architecture" },
        { title: `Write tests for ${prompt}`, description: "Create unit and integration tests ensuring coverage of edge cases" },
      ];
    }

    const createdTasks = [];
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];

      const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId },
        { $inc: { taskCounter: 1 } },
        { new: true }
      );
      if (!updatedProject) throw new Error("Project not found during AI task generation");
      const taskKey = `${updatedProject.prefix}-${updatedProject.taskCounter}`;

      const task = await Task.create({
        projectId, workspaceId: project.workspaceId,
        key: taskKey,
        title: t.title, description: t.description, order: i,
      });
      createdTasks.push(task);
    }

    const io = req.app.get("io");
    if (io) {
      createdTasks.forEach((t) => io.to(`project:${projectId}`).emit("task-created", t));

      // Notify the requester
      await notify({
        workspaceId: project.workspaceId,
        recipientId: req.user!._id,
        type: NotificationType.SYSTEM,
        message: `AI generated ${createdTasks.length} tasks for your sprint.`,
        entityId: project._id,
        entityModel: "Project"
      }, io);

      io.to(`workspace:${project.workspaceId}`).emit("dashboard-updated");
    }

    // Return the created tasks. The frontend should handle these.
    // NOTE: If using WebSockets, the frontend might get duplicates if it listens to "task-created" 
    // AND uses this response. We'll refine the frontend to prefer the response or handle duplicates.
    res.json(createdTasks);
  } catch (error: any) {
    res.status(200).json([]);
  }
};

// ═══════════════════════════════════════
// 3. AI Task Generator (Subtask Breakdown)
// ═══════════════════════════════════════
export const generateSubtasks = async (req: AuthRequest, res: Response) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) return res.status(400).json({ message: "Task title is required" });

    const aiRaw = await askAI(
      `You are a senior software engineer mentoring a developer.

Break the task into 4-6 detailed subtasks.

Each subtask should:
- begin with a verb
- represent a real development action
- be technically meaningful

Return JSON:

{
 "subtasks": [
   { "title": "Subtask", "description": "Details" }
 ]
}`,
      `Task Title: ${taskTitle}\nTask Description: ${taskDescription || "None"}`
    );

    const fallbackSubtasks = {
      subtasks: [
        { title: `Draft architecture for ${taskTitle.substring(0, 30)}`, description: "Plan dependencies and edge cases." },
        { title: `Execute core coding for ${taskTitle.substring(0, 30)}`, description: "Implement main requirements." },
      ]
    };

    try {
      const parsed = JSON.parse(aiRaw);
      if (parsed.subtasks && Array.isArray(parsed.subtasks)) {
        return res.status(200).json(parsed);
      } else {
        throw new Error("Invalid subtask output from AI");
      }
    } catch (parseError) {
      console.warn("Failed to parse AI subtasks", parseError);
      return res.status(200).json(fallbackSubtasks);
    }
  } catch (error: any) {
    res.status(200).json({ subtasks: [] });
  }
};

// ═══════════════════════════════════════
// 4. AI Meeting Notes → Tasks
// ═══════════════════════════════════════
export const parseNotes = async (req: AuthRequest, res: Response) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ message: "Meeting notes are required" });

    const aiRaw = await askAI(
      "You are a meeting notes parser. Extract actionable tasks from meeting notes. Output JSON: { \"tasks\": [{ \"title\": \"...\", \"description\": \"...\", \"priority\": \"HIGH|MEDIUM|LOW\" }] }",
      `Extract tasks from these meeting notes:\n\n${notes}`
    );

    const lines = notes.split("\n").filter((l: string) => l.trim().length > 10).slice(0, 4);
    const fallbackTasks = { tasks: lines.map((l: string) => ({ title: l.trim().substring(0, 80), description: l.trim(), priority: "MEDIUM" })) };

    try {
      res.json(JSON.parse(aiRaw));
    } catch (parseError) {
      res.json(fallbackTasks);
    }
  } catch (error: any) {
    res.status(200).json({ tasks: [] });
  }
};

// ═══════════════════════════════════════
// 5. AI Task Summarizer
// ═══════════════════════════════════════
export const summarizeTask = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!description) return res.status(400).json({ message: "Description is required" });

    const aiRaw = await askAI(
      `You are a technical writer specializing in engineering documentation.

Rewrite the task description into a concise summary of the main objective.

Rules:
- 1–2 sentences
- Do not copy the original description
- Focus on the main goal

Return JSON:

{
 "summary": "Concise summary"
}`,
      `Task Title: ${title}\nTask Description: ${description}`
    );

    const fallbackSummary = { summary: description.substring(0, 120) + (description.length > 120 ? "..." : "") };

    try {
      const parsed = JSON.parse(aiRaw);
      if (parsed.summary) {
        return res.status(200).json(parsed);
      } else {
        throw new Error("Invalid summary output from AI");
      }
    } catch (parseError) {
      console.warn("Failed to parse AI summary", parseError);
      return res.status(200).json(fallbackSummary);
    }
  } catch (error: any) {
    res.status(200).json({ summary: "AI service temporarily unavailable." });
  }
};

// ═══════════════════════════════════════
// 6. AI Smart Prioritization
// ═══════════════════════════════════════
export const prioritizeTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId as string)) {
      return res.status(400).json({ message: "Invalid or missing project ID" });
    }
    const tasks = await Task.find({ projectId, status: { $ne: "DONE" } }).lean();

    if (tasks.length === 0) return res.json({ prioritized: [] });

    const taskList = tasks.map((t) => `- ${t.title} [Status: ${t.status}] [Current Priority: ${t.priority}] [Due: ${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'None'}]`).join("\n");

    const aiRaw = await askAI(
      "You are a task prioritization expert for Sprintify. Given a list of tasks with their current status and due dates, rank them by urgency. Output JSON: { \"prioritized\": [{ \"title\": \"...\", \"priority\": \"CRITICAL|HIGH|MEDIUM|LOW\", \"reason\": \"...\" }] }. CRITICAL is for overdue or blocking tasks. HIGH for near deadlines.",
      `Prioritize these tasks:\n${taskList}`
    );

    const fallbackPrioritized = {
      prioritized: tasks.map((t, i) => ({
        title: t.title,
        priority: i === 0 ? "CRITICAL" : i < 2 ? "HIGH" : i < 4 ? "MEDIUM" : "LOW",
        reason: "Ranked by urgency and deadline proximity (mock)"
      }))
    };

    try {
      res.json(JSON.parse(aiRaw));
    } catch (parseError) {
      res.json(fallbackPrioritized);
    }
  } catch (error: any) {
    res.status(200).json({ prioritized: [] });
  }
};

// ═══════════════════════════════════════
// 7. AI Sprint Prediction
// ═══════════════════════════════════════
export const predictSprint = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId as string)) {
      return res.status(400).json({ message: "Invalid or missing project ID" });
    }
    const tasks = await Task.find({ projectId }).lean();
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;

    if (total === 0) return res.json({ probability: 0, analysis: "No tasks in the project." });

    const taskSummary = `Total: ${total}, Done: ${done}, In Progress: ${inProgress}, Remaining: ${total - done}`;

    const aiRaw = await askAI(
      "You are a sprint analytics expert. Given task metrics, predict sprint completion probability (0-100) and provide analysis. Output JSON: { \"probability\": number, \"analysis\": \"...\", \"risks\": [\"...\"], \"recommendations\": [\"...\"] }",
      `Sprint metrics: ${taskSummary}`
    );

    const prob = total > 0 ? Math.round((done / total) * 100) : 0;
    const fallbackSprint = {
      probability: prob,
      analysis: `${done} of ${total} tasks completed (${prob}%). ${inProgress} tasks in progress.`,
      risks: inProgress > 3 ? ["Too many tasks in progress simultaneously"] : [],
      recommendations: ["Focus on completing in-progress tasks before starting new ones"],
    };

    try {
      res.json(JSON.parse(aiRaw));
    } catch (parseError) {
      res.json(fallbackSprint);
    }
  } catch (error: any) {
    res.status(200).json({ probability: 0, analysis: "AI service temporarily unavailable", risks: [], recommendations: [] });
  }
};

// ═══════════════════════════════════════
// 10. AI Sprint Auto Planning
// ═══════════════════════════════════════
export const planSprint = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, sprintGoal } = req.body;
    if (!projectId || !sprintGoal) {
      return res.status(400).json({ message: "Project ID and Sprint Goal are required" });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const aiRaw = await askAI(
      `You are a senior software project manager.
      Break this sprint goal into 6–10 tasks.
      Each task must include:
      - title
      - description
      - priority (LOW, MEDIUM, HIGH, CRITICAL)
      - estimatedDays (number)

      Output format JSON:
      {
       "tasks": [
        {
         "title": "",
         "description": "",
         "priority": "",
         "estimatedDays": 3
        }
       ]
      }`,
      `Sprint Goal: ${sprintGoal}`
    );

    let tasksData: any[] = [];
    try {
      const parsed = JSON.parse(aiRaw);
      tasksData = parsed.tasks || [];
    } catch (e) {
      throw new Error("Failed to parse AI sprint plan");
    }

    const createdTasks: ITask[] = [];
    const today = new Date();

    for (let i = 0; i < tasksData.length; i++) {
      const t = tasksData[i];
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + (t.estimatedDays || 1));

      const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId },
        { $inc: { taskCounter: 1 } },
        { new: true }
      );
      if (!updatedProject) continue;

      const taskKey = `${updatedProject.prefix}-${updatedProject.taskCounter}`;

      const task = await Task.create({
        projectId,
        workspaceId: project.workspaceId,
        key: taskKey,
        title: t.title,
        description: t.description,
        priority: t.priority || "MEDIUM",
        dueDate: dueDate,
        order: i,
      });
      createdTasks.push(task as ITask);
    }

    const io = req.app.get("io");
    if (io) {
      createdTasks.forEach((t) => io.to(`project:${projectId}`).emit("task-created", t));
      io.to(`workspace:${project.workspaceId}`).emit("dashboard-updated");
    }

    res.json({ tasks: createdTasks });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to plan sprint" });
  }
};

// ═══════════════════════════════════════
// 11. AI Task Priority Suggestion
// ═══════════════════════════════════════
export const suggestPriority = async (req: AuthRequest, res: Response) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) return res.status(400).json({ message: "Task title is required" });

    const aiRaw = await askAI(
      `You are a project management assistant. Analyze the task and suggest a priority.
      Available priorities: LOW, MEDIUM, HIGH, CRITICAL.
      Output format JSON: { "priority": "", "reason": "" }`,
      `Task: ${taskTitle}\nDescription: ${taskDescription || ""}`
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to suggest priority" });
  }
};

// ═══════════════════════════════════════
// 12. AI Deadline Estimation
// ═══════════════════════════════════════
export const estimateDeadline = async (req: AuthRequest, res: Response) => {
  try {
    const { taskTitle, taskDescription } = req.body;
    if (!taskTitle) return res.status(400).json({ message: "Task title is required" });

    const aiRaw = await askAI(
      `You are a senior developer. Estimate the development time and complexity.
      Output format JSON: { "estimatedDays": number, "complexity": "low|medium|high" }`,
      `Task: ${taskTitle}\nDescription: ${taskDescription || ""}`
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to estimate deadline" });
  }
};

// ═══════════════════════════════════════
// 13. AI Daily Summary
// ═══════════════════════════════════════
export const getDailySummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tasksDue = await Task.find({ assigneeId: userId, dueDate: { $gte: todayStart, $lte: todayEnd }, status: { $ne: "DONE" } }).lean();
    const tasksOverdue = await Task.find({ assigneeId: userId, dueDate: { $lt: todayStart }, status: { $ne: "DONE" } }).lean();
    const tasksCompleted = await Task.find({ assigneeId: userId, updatedAt: { $gte: todayStart, $lte: todayEnd }, status: "DONE" }).lean();

    const stats = {
      due: tasksDue.map(t => t.title),
      overdue: tasksOverdue.map(t => t.title),
      done: tasksCompleted.map(t => t.title)
    };

    const aiRaw = await askAI(
      `You are a productivity coach. Summarize the user's work for today and suggest a focus.
      Return exactly these fields in JSON: { "summaryText": "...", "focus": [""] }`,
      `User Progress:\nDone Today: ${stats.done.join(", ") || "None"}\nDue Today: ${stats.due.join(", ") || "None"}\nOverdue: ${stats.overdue.join(", ") || "None"}`
    );

    const parsed = JSON.parse(aiRaw);
    res.json({
      completedToday: tasksCompleted.length,
      inProgress: tasksDue.length,
      overdueTasks: tasksOverdue.length,
      summaryText: parsed.summaryText || parsed.summary || "No summary available.",
      focus: parsed.focus || []
    });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate daily summary" });
  }
};

// ═══════════════════════════════════════
// 14. AI Smart Task Creation
// ═══════════════════════════════════════
export const generateTasksFromDescription = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, description } = req.body;
    if (!projectId || !description) return res.status(400).json({ message: "Description is required" });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const aiRaw = await askAI(
      `Break this description into multiple actionable tasks.
      Include priorities and estimated days.
      Output format JSON: { "tasks": [{ "title": "", "description": "", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "estimatedDays": number }] }`,
      `Description: ${description}`
    );

    const parsed = JSON.parse(aiRaw);
    const tasksData = parsed.tasks || [];
    const createdTasks: ITask[] = [];
    const today = new Date();

    for (let i = 0; i < tasksData.length; i++) {
      const t = tasksData[i];
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + (t.estimatedDays || 1));

      const updatedProject = await Project.findOneAndUpdate(
        { _id: projectId },
        { $inc: { taskCounter: 1 } },
        { new: true }
      );
      if (!updatedProject) continue;
      const taskKey = `${updatedProject.prefix}-${updatedProject.taskCounter}`;

      const task = await Task.create({
        projectId, workspaceId: project.workspaceId,
        key: taskKey,
        title: t.title, description: t.description, priority: t.priority || "MEDIUM",
        dueDate, order: i,
      });
      createdTasks.push(task as ITask);
    }

    const io = req.app.get("io");
    if (io) {
      createdTasks.forEach((t) => io.to(`project:${projectId}`).emit("task-created", t));
      io.to(`workspace:${project.workspaceId}`).emit("dashboard-updated");
    }

    res.json(createdTasks);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate tasks" });
  }
};
export const summarizeTaskDiscussion = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.body;
    const workspaceId = req.workspaceId;

    const [task, comments] = await Promise.all([
      Task.findOne({ _id: taskId, workspaceId }),
      Comment.find({ taskId, workspaceId }).populate('authorId', 'name').sort({ createdAt: 1 })
    ]);

    if (!task) return res.status(404).json({ message: "Task not found" });

    if (comments.length === 0) {
      return res.json({ summary: "No comments found to summarize." });
    }

    const discussionText = comments.map((c: any) => `${c.authorId ? (c.authorId as any).name : 'Unknown'}: ${c.content}`).join('\n');

    const prompt = `You are an AI assistant for Sprintify. Summarize the following project management discussion for task "${task.title}". 
    Focus on key decisions, pending questions, and assigned action items.
    
    Discussion:
    ${discussionText}
    
    Provide a concise summary in bullet points.`;

    const chatCompletion = await getOpenAI().chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });

    res.json({ summary: chatCompletion.choices[0]?.message?.content || "Could not generate summary." });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ═══════════════════════════════════════
// 15. AI Productivity Insights (Enhanced)
// ═══════════════════════════════════════
export const getInsights = async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.workspaceId;

    const tasks = await Task.find({ workspaceId }).lean();
    const logs = await ActivityLog.find({ workspaceId }).sort({ createdAt: -1 }).limit(50).lean();

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const overdue = tasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE").length;

    // Simple velocity: tasks done in last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentDone = tasks.filter(t => t.status === "DONE" && t.updatedAt >= weekAgo).length;

    const summary = `
      Workspace Metrics:
      - Total Tasks: ${total}
      - Done: ${done}
      - In Progress: ${inProgress}
      - Overdue: ${overdue}
      - Velocity (Done last 7d): ${recentDone}
      - Recent Activity count: ${logs.length}
    `;

    const aiRaw = await askAI(
      `You are a senior productivity analyst. Analyze these metrics and provide 4-5 strategic insights.
      Focus on: overdue tasks, bottlenecks (too many in progress), velocity, and recommendations.
      Output format JSON: { "insights": [{ "title": "", "description": "", "type": "positive|warning|neutral" }] }`,
      summary
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(200).json({ insights: [] });
  }
};

// ═══════════════════════════════════════
// 16. AI Project Chat Assistant (Advanced)
// ═══════════════════════════════════════
export const chatAssistant = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, question } = req.body;
    if (!question) return res.status(400).json({ message: "Question is required" });
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId as string)) {
      return res.status(400).json({ message: "Invalid or missing project ID" });
    }

    const tasks = await Task.find({ projectId }).lean();
    const context = tasks.map((t) => {
      const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE';
      return `[${t.status}] ${t.title} (Priority: ${t.priority}${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''}${isOverdue ? ', OVERDUE' : ''})`;
    }).join("\n");

    const aiRaw = await askAI(
      `You are an advanced AI Copilot for Sprintify.
      You can answer complex questions about project status, overdue tasks, and blockers.
      Analyze the provided task list to answer the user's question accurately.
      
      User might ask:
      - "What should I work on today?" (Suggest high priority or near-deadline tasks)
      - "Which tasks are overdue?" (List overdue tasks)
      - "What tasks are blocking the sprint?" (Identify potential blockers)

      Output format JSON: { "answer": "Detailed answer using markdown", "relatedTasks": ["task title"] }`,
      `Project Context:\n${context}\n\nUser Question: ${question}`
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(500).json({ answer: "AI service temporarily unavailable.", relatedTasks: [] });
  }
};

export const generateRoadmap = async (req: AuthRequest, res: Response) => {
  try {
    const { projectIdea, timelineMonths } = req.body;

    const aiRaw = await askAI(
      "You are a senior product strategist. Generate a high-level roadmap for the brand new project. Provide 4-6 Epics with their planned month (1 to timelineMonths) and status (PLANNED). Output JSON: { \"epics\": [{ \"name\": \"\", \"description\": \"\", \"month\": 1, \"status\": \"PLANNED\" }], \"milestones\": [\"\"] }",
      `Project idea: ${projectIdea}\nTimeline: ${timelineMonths} months`
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to generate roadmap" });
  }
};

export const getSprintHealthInsights = async (req: AuthRequest, res: Response) => {
  try {
    const { sprintId } = req.body;
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return res.status(404).json({ message: "Sprint not found" });

    const tasks = await Task.find({ sprintId });
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const completionRate = total > 0 ? (done / total) * 100 : 0;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;

    const summary = `Sprint ${sprint.name} (${sprint.goal}):
    - Tasks: ${total}
    - Done: ${done} (${completionRate.toFixed(1)}%)
    - Overdue: ${overdue}`;

    const aiRaw = await askAI(
      "You are a sprint health consultant. Analyze the metrics and provide a status (Great, Good, At Risk, Critical) and 3 bullet insights. Output JSON: { \"status\": \"\", \"insights\": [\"\"] }",
      summary
    );

    res.json(JSON.parse(aiRaw));
  } catch (error: any) {
    res.status(500).json({ message: "Failed to get sprint health insights" });
  }
};
