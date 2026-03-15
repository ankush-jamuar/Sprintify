import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../../lib/axios";
import {
    Layers,
    Activity,
    Milestone,
    LayoutGrid,
    Briefcase,
    Users
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { useTheme } from "../../components/ThemeProvider";

// Sub-components
import ProjectKanban from "./ProjectKanban";
import EpicsPage from "./EpicsPage";
import SprintBoard from "./SprintBoard";
import RoadmapPage from "./RoadmapPage";

export default function ProjectPage() {
    const { projectId } = useParams();
    const [activeTab, setActiveTab] = useState("board");
    const [project, setProject] = useState<{ _id: string, name: string } | null>(null);
    const { theme } = useTheme();
    const isDark = theme === "dark";

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const res = await api.get(`/projects/${projectId}`);
                setProject(res.data);
            } catch (error) {
                console.error("Failed to fetch project", error);
            }
        };
        if (projectId) fetchProject();
    }, [projectId]);

    const tabs = [
        { id: "board", label: "Board", icon: LayoutGrid },
        { id: "epics", label: "Epics", icon: Layers },
        { id: "sprint", label: "Sprint", icon: Activity },
        { id: "roadmap", label: "Roadmap", icon: Milestone },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "board":
                return <ProjectKanban />;
            case "epics":
                return <EpicsPage />;
            case "sprint":
                return <SprintBoard />;
            case "roadmap":
                return <RoadmapPage />;
            default:
                return <ProjectKanban />;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-zinc-950">
            {/* Unified Project Header */}
            <div className="flex flex-col border-b border-zinc-900 bg-zinc-950/20 pt-6 px-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? "bg-zinc-900 border border-zinc-800 shadow-xl shadow-indigo-500/5" : "bg-white border border-zinc-200 shadow-sm"}`}>
                            <Briefcase className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <h1 className={`text-2xl font-black tracking-tight ${isDark ? "text-white" : "text-zinc-900"}`}>
                                {project?.name || "Loading..."}
                            </h1>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Project Workspace</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 h-10 px-4 text-xs font-bold">
                            <Users className="h-4 w-4 mr-2" /> Members
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-xs font-black uppercase tracking-widest transition-all relative ${isActive ? "text-indigo-400 bg-zinc-900/50" : "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/20"
                                    }`}
                            >
                                <tab.icon className={`h-3.5 w-3.5 ${isActive ? "text-indigo-400" : "text-zinc-700"}`} />
                                {tab.label}
                                {isActive && (
                                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-hidden"
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
