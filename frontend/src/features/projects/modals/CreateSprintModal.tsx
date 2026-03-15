import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { toast } from "sonner";
import { Zap } from "lucide-react";

interface CreateSprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
}

const CreateSprintModal: React.FC<CreateSprintModalProps> = ({ isOpen, onClose, projectId: propProjectId }) => {
    const { projectId: paramsProjectId } = useParams();
    const projectId = propProjectId || paramsProjectId;
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [goal, setGoal] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const createSprintMutation = useMutation({
        mutationFn: async () => {
            if (!projectId) throw new Error("Project ID is required");
            await api.post("/planning/sprints", {
                name,
                goal,
                startDate,
                endDate,
                projectId,
                status: "PLANNED"
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
            queryClient.invalidateQueries({ queryKey: ["activeSprint", projectId] });
            toast.success("Sprint created successfully");
            setName("");
            setGoal("");
            setStartDate("");
            setEndDate("");
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to create sprint");
        }
    });

    const handleCreate = () => {
        if (!name || !goal || !startDate || !endDate) {
            toast.error("All fields are required");
            return;
        }
        createSprintMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        Create New Sprint
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Sprint Name</label>
                        <Input
                            placeholder="e.g. Sprint 1 - Core Auth"
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Goal</label>
                        <Input
                            placeholder="e.g. Implement user login and signup"
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Start Date</label>
                            <Input
                                type="date"
                                className="bg-zinc-900 border-zinc-800 rounded-xl"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase">End Date</label>
                            <Input
                                type="date"
                                className="bg-zinc-900 border-zinc-800 rounded-xl"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={createSprintMutation.isPending}
                        className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8"
                    >
                        {createSprintMutation.isPending ? "Creating..." : "Create Sprint"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateSprintModal;
