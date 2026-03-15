import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  workspaceId: mongoose.Types.ObjectId;
  prefix: string;        // e.g. "SPR" — derived from project name
  taskCounter: number;   // atomic counter for task key generation
  githubRepo?: string;   // e.g. "owner/repo"
  githubWebhookSecret?: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a project prefix from its name.
 * Takes first 3 uppercase letters, or first 3 chars uppercased if name is short.
 * Examples: "Sprintify" -> "SPR", "UI" -> "UI", "My App" -> "MYA"
 */
export function generatePrefix(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return cleaned.slice(0, 3) || "PRJ";
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    prefix: { type: String, required: true },
    taskCounter: { type: Number, default: 0 },
    githubRepo: { type: String },
    githubWebhookSecret: { type: String },
    isFavorite: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Ensure prefix is unique within a workspace
ProjectSchema.index({ workspaceId: 1, prefix: 1 }, { unique: true });

export default mongoose.model<IProject>("Project", ProjectSchema);
