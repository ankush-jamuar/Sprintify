import { FolderKanban, Plus, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { CardSkeleton } from "../LoadingSkeleton";
import { Card, CardContent } from "../ui/card";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Project { _id: string; name: string; description?: string; createdAt?: string }

interface RecentProjectsWidgetProps {
    projects: Project[];
    isAdmin: boolean;
    loading: boolean;
    handleCreateProject: () => void;
}

export default function RecentProjectsWidget({ projects, isAdmin, loading, handleCreateProject }: RecentProjectsWidgetProps) {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xl font-black text-zinc-100 flex items-center gap-3">
                    <FolderKanban className="h-5 w-5 text-indigo-400" /> Recent Projects
                </h3>
                {isAdmin && (
                    <Button onClick={handleCreateProject} variant="outline" size="sm" className="rounded-xl border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white gap-2 h-9">
                        <Plus className="h-4 w-4" /> New
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {loading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : projects.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 p-12 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center">
                        <FolderKanban className="h-12 w-12 text-zinc-800 mb-4" />
                        <p className="text-zinc-500 font-medium">No active projects found.</p>
                    </div>
                ) : (
                    projects.map((p: Project, i: number) => (
                        <motion.div
                            key={p._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card
                                onClick={() => navigate(`/projects/${p._id}`)}
                                className="group cursor-pointer bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-800/50 hover:border-indigo-500/40 transition-all duration-500 rounded-3xl p-2 h-full"
                            >
                                <CardContent className="p-6 h-full flex flex-col">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                            <FolderKanban className="h-6 w-6 text-indigo-400" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">Active</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-zinc-100 mb-1">{p.name}</h4>
                                    <p className="text-xs text-zinc-500 line-clamp-2 flex-1">{p.description || "No description provided."}</p>

                                    <div className="mt-6 pt-6 border-t border-zinc-800/50 flex items-center justify-between shrink-0">
                                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                                            <Clock className="h-3 w-3" />
                                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10">Active</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
