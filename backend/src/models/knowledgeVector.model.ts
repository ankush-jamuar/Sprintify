import mongoose, { Schema, Document } from "mongoose";

export interface IKnowledgeVector extends Document {
  workspaceId: mongoose.Types.ObjectId;
  sourceId: mongoose.Types.ObjectId;
  textChunk: string;
  embedding: number[];
  createdAt: Date;
}

const KnowledgeVectorSchema: Schema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    textChunk: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IKnowledgeVector>("KnowledgeVector", KnowledgeVectorSchema);
