import mongoose, { Document, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  workspaceId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  action: string;
  entityId: mongoose.Types.ObjectId;
  entityModel: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // E.g., 'CREATED_TASK', 'UPDATED_STATUS'
  entityId: { type: Schema.Types.ObjectId, required: true },
  entityModel: { type: String, required: true }, // E.g., 'Task', 'Project'
  details: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: true, updatedAt: false } });

// For analytics aggregations and project timeline
activityLogSchema.index({ workspaceId: 1, createdAt: -1 });
activityLogSchema.index({ entityId: 1, entityModel: 1, createdAt: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
