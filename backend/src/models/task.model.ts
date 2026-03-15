import mongoose, { Schema, Document } from "mongoose";

export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
}

export interface IAttachment {
  url: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
}

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  assigneeId?: mongoose.Types.ObjectId;
  key: string;       // Human readable ID like "SPR-1"
  title: string;
  description: string;
  status: TaskStatus;
  priority: string;
  priorityScore: number;
  dueDate?: Date;
  sprintDate?: Date;
  epicId?: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId;
  order: number; // For Kanban dragging
  attachments: IAttachment[];
  watchers: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema({
  url: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, default: "application/octet-stream" },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const TaskSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    key: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    priorityScore: { type: Number, default: 3 }, // CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4
    dueDate: { type: Date, default: null },
    sprintDate: { type: Date },
    epicId: { type: Schema.Types.ObjectId, ref: "Epic" },
    sprintId: { type: Schema.Types.ObjectId, ref: "Sprint" },
    order: { type: Number, default: 0 },
    attachments: [AttachmentSchema],
    watchers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Ensure task key is unique per project
TaskSchema.index({ projectId: 1, key: 1 }, { unique: true });
// Compound index for efficient Kanban column queries (sorted by order)
TaskSchema.index({ projectId: 1, status: 1, order: 1 });

export default mongoose.model<ITask>("Task", TaskSchema);
