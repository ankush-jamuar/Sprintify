import mongoose, { Schema, Document } from "mongoose";

export interface IEpic extends Document {
    name: string;
    description: string;
    projectId: mongoose.Types.ObjectId;
    status: "PLANNED" | "IN_PROGRESS" | "DONE";
    createdAt: Date;
}

const epicSchema = new Schema<IEpic>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    status: { type: String, enum: ["PLANNED", "IN_PROGRESS", "DONE"], default: "PLANNED" },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IEpic>("Epic", epicSchema);
