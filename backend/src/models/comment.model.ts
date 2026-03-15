import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  taskId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  parentCommentId?: mongoose.Types.ObjectId;
  mentions?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>({
  taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  parentCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

export default mongoose.model<IComment>('Comment', commentSchema);
