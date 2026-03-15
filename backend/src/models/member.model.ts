import mongoose, { Schema, Document } from "mongoose";

export enum Role {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
  VIEWER = "VIEWER",
}

export interface IMember extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema: Schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: Object.values(Role), default: Role.MEMBER },
  },
  { timestamps: true }
);

// Prevent user from being added twice to same workspace
MemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export default mongoose.model<IMember>("Member", MemberSchema);
