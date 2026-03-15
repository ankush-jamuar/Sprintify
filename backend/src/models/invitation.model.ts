import mongoose, { Document, Schema } from 'mongoose';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED'
}

export interface IInvitation extends Document {
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  inviterId: mongoose.Types.ObjectId;
  role: string;
  status: InvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
  email: { type: String, required: true },
  inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, default: 'MEMBER' },
  status: { type: String, enum: Object.values(InvitationStatus), default: InvitationStatus.PENDING }
}, { timestamps: true });

// Ensure a user isn't invited to the same workspace multiple times if pending
invitationSchema.index({ workspaceId: 1, email: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'PENDING' } });

export default mongoose.model<IInvitation>('Invitation', invitationSchema);
