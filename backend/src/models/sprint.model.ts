import mongoose, { Schema, Document } from "mongoose";

export interface ISprint extends Document {
    name: string;
    projectId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    goal: string;
    status: "PLANNED" | "ACTIVE" | "COMPLETED";
}

const sprintSchema = new Schema<ISprint>({
    name: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    goal: { type: String, required: true },
    status: { type: String, enum: ["PLANNED", "ACTIVE", "COMPLETED"], default: "PLANNED" },
});

export default mongoose.model<ISprint>("Sprint", sprintSchema);
