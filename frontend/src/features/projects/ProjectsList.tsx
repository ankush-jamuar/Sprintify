import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { FolderKanban, Plus, Trash2, Pencil, Search, Filter, MoreHorizontal, Calendar, Users, Star, Archive } from "lucide-react";
import { CardSkeleton } from "../../components/LoadingSkeleton";
import { toast } from "sonner";
import CreateActionModal from "../../components/CreateActionModal";
import { useCurrentRole } from "../../hooks/useCurrentRole";

interface Project { _id: string; name: string; description?: string; createdAt?: string; isFavorite?: boolean; isArchived?: boolean; memberCount?: number; }

export default function ProjectsList() {
  const { activeWorkspace } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, role } = useCurrentRole();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ["projects", activeWorkspace?._id, showArchived],
    queryFn: async () => {
      if (!activeWorkspace) return [];
      const { data } = await api.get(`/projects${showArchived ? "?archived=true" : ""}`);
      return data;
    },
    enabled: !!activeWorkspace
  });

  const handleNewProject = () => setIsNewModalOpen(true);

  const confirmDelete = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] });
      toast.success("Project deleted");
      setDeletingProject(null);
    } catch {
      toast.error("Error deleting project");
    }
  };

  const submitEdit = async () => {
    if (!editingProject || !editName.trim()) return;
    try {
      await api.put(`/projects/${editingProject._id}`, { name: editName, description: editDesc });
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] });
      toast.success("Project updated");
      setEditingProject(null);
    } catch {
      toast.error("Error updating project");
    }
  };

  const toggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/projects/${id}/star`);
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] });
      toast.success(data.isFavorite ? "Project starred" : "Project unstarred");
    } catch {
      toast.error("Error updating favorite status");
    }
  };

  const toggleArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data } = await api.patch(`/projects/${id}/archive`);
      queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] });
      toast.success(data.isArchived ? "Project archived" : "Project unarchived");
    } catch {
      toast.error("Error updating archive status");
    }
  };

  const filteredProjects = projects.filter((p: Project) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a: Project, b: Project) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  return (
    <div className="space-y-8">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-white">Projects</h2>
          <p className="text-zinc-500 mt-2 font-medium">Manage and organize all your team's initiatives.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
             variant={showArchived ? "default" : "outline"} 
             onClick={() => setShowArchived(!showArchived)}
             className={`rounded-xl h-11 px-6 ${showArchived ? "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20" : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"}`}
          >
             {showArchived ? "View Active" : "View Archived"}
          </Button>
          {isAdmin && (
            <Button onClick={handleNewProject} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11 px-6 rounded-xl font-bold shadow-lg shadow-indigo-600/20">
              <Plus className="h-5 w-5" /> New Project
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-2 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 bg-transparent border-none text-base h-11 focus-visible:ring-0 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-2 pr-2">
           <Button variant="ghost" size="sm" className="bg-zinc-950/50 border border-zinc-800 text-zinc-500 rounded-xl px-4 h-10 hover:text-white gap-2">
              <Filter className="h-4 w-4" /> Filters
           </Button>
           <Button variant="ghost" size="icon" className="h-10 w-10 text-zinc-500 hover:text-white border border-transparent hover:border-zinc-800 rounded-xl">
              <MoreHorizontal className="h-5 w-5" />
           </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
             <CardSkeleton />
             <CardSkeleton />
             <CardSkeleton />
             <CardSkeleton />
             <CardSkeleton />
             <CardSkeleton />
          </>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project: Project, i: number) => (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card
                onClick={() => navigate(`/projects/${project._id}`)}
                className="group cursor-pointer bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-indigo-500/50 transition-all duration-500 rounded-[2rem] overflow-hidden"
              >
                <div className="h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 relative group-hover:from-indigo-600/20 group-hover:to-violet-600/20 transition-all duration-500">
                   <div className="absolute top-4 right-4">
                      <Button variant="ghost" size="icon" className={`h-8 w-8 transition-colors ${project.isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-white/20 group-hover:text-white/40'}`} onClick={(e) => toggleStar(project._id, e)}>
                         <Star className={`h-4 w-4 ${project.isFavorite ? 'fill-current' : ''}`} />
                      </Button>
                   </div>
                </div>
                <CardHeader className="pt-6 relative">
                  <div className="absolute -top-8 left-6 w-16 h-16 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center p-3 shadow-xl">
                    <FolderKanban className="h-full w-full text-indigo-400" />
                  </div>
                  <div className="flex items-center justify-between mt-8">
                     <div className="flex items-center gap-2">
                       <CardTitle className="text-xl text-white font-bold">{project.name}</CardTitle>
                       <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border bg-zinc-900/50 text-zinc-400 border-zinc-800">
                         {role}
                       </span>
                     </div>
                     {isAdmin && (
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-indigo-400 rounded-lg" onClick={(e) => { e.stopPropagation(); setEditingProject(project); setEditName(project.name); setEditDesc(project.description || ""); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-300 rounded-lg" onClick={(e) => toggleArchive(project._id, e)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400 rounded-lg" onClick={(e) => { e.stopPropagation(); setDeletingProject(project); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                       </div>
                     )}
                  </div>
                </CardHeader>
                <CardContent className="pb-8 space-y-4">
                  <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2">
                     {project.description || "No description provided."}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                     <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        <span>{project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                     </div>
                     {project.memberCount !== undefined && (
                       <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          <span>{project.memberCount} Member{project.memberCount !== 1 ? 's' : ''}</span>
                       </div>
                     )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
        )}
      </div>

      {!loading && filteredProjects.length === 0 && (
        <div className="text-center py-32 bg-zinc-900/10 rounded-3xl border-2 border-dashed border-zinc-800">
          <FolderKanban className="h-16 w-16 text-zinc-800 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-zinc-300">No projects found</h3>
          <p className="text-zinc-600 mt-2 max-w-xs mx-auto">
            {searchQuery ? "Try adjusting your search query or filters." : "Start by creating your first project."}
          </p>
          {!searchQuery && isAdmin && (
            <Button onClick={handleNewProject} className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 h-12 font-bold">
               Create Now
            </Button>
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Dialog open={!!deletingProject} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Delete Project</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-zinc-400 text-sm">
            Are you sure you want to delete <span className="text-white font-bold">{deletingProject?.name}</span>? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingProject(null)} className="text-zinc-500 hover:text-white">Cancel</Button>
            <Button onClick={() => { if(deletingProject) { confirmDelete(deletingProject._id); } }} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl px-6">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Edit Project</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Project Name</label>
               <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500 text-white" />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Description</label>
               <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Describe your project..." className="bg-zinc-900 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingProject(null)} className="text-zinc-500 hover:text-white">Cancel</Button>
            <Button onClick={submitEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-6">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isNewModalOpen && (
        <CreateActionModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSuccess={() => { 
            setIsNewModalOpen(false); 
            queryClient.invalidateQueries({ queryKey: ["projects", activeWorkspace?._id] }); 
          }}
          defaultType="project"
        />
      )}
    </div>
  );
}
