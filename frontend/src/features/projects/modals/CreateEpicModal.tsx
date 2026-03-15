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
import { Textarea } from "../../../components/ui/textarea";
import { toast } from "sonner";
import { Layers } from "lucide-react";

interface CreateEpicModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
}

const CreateEpicModal: React.FC<CreateEpicModalProps> = ({ isOpen, onClose, projectId: propProjectId }) => {
    const { projectId: paramsProjectId } = useParams();
    const projectId = propProjectId || paramsProjectId;
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const createEpicMutation = useMutation({
        mutationFn: async () => {
            if (!projectId) throw new Error("Project ID is required");
            await api.post("/planning/epics", { name, description, projectId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["epics", projectId] });
            toast.success("Epic created successfully");
            setName("");
            setDescription("");
            onClose();
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || "Failed to create epic");
        }
    });

    const handleCreate = () => {
        if (!name) {
            toast.error("Epic name is required");
            return;
        }
        createEpicMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-950 border-zinc-800 text-white rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <Layers className="h-5 w-5 text-white" />
                        </div>
                        Create New Epic
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Epic Name</label>
                        <Input
                            placeholder="e.g. Authentication System"
                            className="bg-zinc-900 border-zinc-800 rounded-xl"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Description</label>
                        <Textarea
                            placeholder="What is this epic about?"
                            className="bg-zinc-900 border-zinc-800 rounded-xl min-h-[100px]"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleCreate}
                        disabled={createEpicMutation.isPending}
                        className="bg-white text-black hover:bg-zinc-200 rounded-xl px-8"
                    >
                        {createEpicMutation.isPending ? "Creating..." : "Create Epic"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateEpicModal;
