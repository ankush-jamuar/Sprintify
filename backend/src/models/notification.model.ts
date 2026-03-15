import mongoose, { Document, Schema } from 'mongoose';

export enum NotificationType {
  MENTION = 'MENTION',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  SYSTEM = 'SYSTEM',
  INFO = 'INFO'
}

export interface INotification extends Document {
  workspaceId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  senderId?: mongoose.Types.ObjectId;
  type: NotificationType;
  entityId?: mongoose.Types.ObjectId; // E.g., taskId
  entityModel?: string; // E.g., 'Task'
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: Object.values(NotificationType), required: true },
  entityId: { type: Schema.Types.ObjectId },
  entityModel: { type: String, enum: ['Task', 'Project', 'Workspace', 'Invitation'] },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

// For querying a user's unread notifications quickly
notificationSchema.index({ recipientId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', notificationSchema);
