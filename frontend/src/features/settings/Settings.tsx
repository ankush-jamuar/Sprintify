import { useState, useEffect, useCallback } from "react";
import { api } from "../../lib/axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Settings as SettingsIcon, 
  Users, 
  Zap, 
  Mail, 
  Github, 
  Trash2, 
  Save, 
  Copy,
  CheckCircle2,
  Shield
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { toast } from "sonner";
import { useCurrentRole } from "../../hooks/useCurrentRole";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";

interface Project { _id: string; name: string }

export default function Settings() {
  const { activeWorkspace } = useWorkspaceStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [linkResult, setLinkResult] = useState<{ webhookUrl: string; secret: string } | null>(null);
  const [activeTab, setActiveTab] = useState("General");
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || "");
  const [members, setMembers] = useState<{ _id: string, role: string, userId: { _id: string, name: string, email: string, avatarUrl?: string } }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const { user } = useAuthStore();
  const { isOwner, isAdmin } = useCurrentRole();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      if (!activeWorkspace) return;
      setLoadingMembers(true);
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/members`);
      setMembers(data);
    } catch {
      console.error("Failed to fetch members");
    } finally {
      setLoadingMembers(false);
    }
  }, [activeWorkspace]);

  const fetchProjects = useCallback(async () => {
    try {
      if (!activeWorkspace) return;
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/projects`);
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0]._id);
    } catch {
      console.error("Failed to fetch projects");
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace) {
      setWorkspaceName(activeWorkspace.name);
      fetchProjects();
      fetchMembers();
    }
  }, [activeWorkspace, fetchProjects, fetchMembers]);

  const handleLinkRepo = async () => {
    if (!selectedProjectId || !githubRepo) return;
    try {
      const { data } = await api.post(`/projects/${selectedProjectId}/github`, { githubRepo });
      setLinkResult(data);
      toast.success("Repository linked successfully!");
    } catch {
      toast.error("Failed to link repository");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !activeWorkspace) return;
    try {
      await api.post(`/workspaces/${activeWorkspace._id}/invite`, { 
        email: inviteEmail, 
        role: inviteRole 
      });
      setInviteEmail("");
      toast.success("Invitation sent successfully!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to invite member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeWorkspace) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace._id}/members/${memberId}`);
      toast.success("Member removed");
      fetchMembers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to remove member");
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!activeWorkspace) return;
    try {
      await api.put(`/workspaces/${activeWorkspace._id}/members/${memberId}/role`, { role: newRole });
      toast.success("Role updated");
      fetchMembers();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || "Failed to update role");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    try {
      setIsDeleting(true);
      await api.delete(`/workspaces/${activeWorkspace._id}`);
      
      // Invalidate queries to erase data from cache
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      
      localStorage.removeItem("sprintify_workspace");
      toast.success("Workspace deleted");
      setIsDeleteModalOpen(false);
      navigate("/dashboard");
    } catch {
      toast.error("Failed to delete workspace. You might not be the owner.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black tracking-tighter text-white">Workspace Settings</h2>
        <p className="text-zinc-500 mt-2 font-medium">Control your workspace environment and global integrations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         {/* Sidebar Navigation */}
         <div className="space-y-2">
            {[
              { id: "General", icon: SettingsIcon },
              { id: "Team & Access", icon: Users },
              { id: "Integrations", icon: Zap },
            ].map(item => (
              <Button 
                key={item.id}
                variant="ghost" 
                onClick={() => setActiveTab(item.id)}
                className={`w-full justify-start h-11 px-4 gap-3 rounded-xl font-bold transition-all ${
                  activeTab === item.id ? 'bg-zinc-900 text-white shadow-xl border border-white/5' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <item.icon className={`h-4 w-4 ${activeTab === item.id ? 'text-indigo-400' : ''}`} />
                {item.id}
              </Button>
            ))}
         </div>

         {/* Content Area */}
         <div className="md:col-span-3 space-y-8">
            {/* General Settings */}
            {activeTab === "General" && (
              <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-white">General Information</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                    <div className="grid gap-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Workspace Name</label>
                      <Input 
                        value={workspaceName} 
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="bg-zinc-950/50 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Contact Email</label>
                      <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                          <Input 
                            placeholder="admin@workspace.com"
                            className="bg-zinc-950/50 border-zinc-800 h-12 pl-10 rounded-xl focus-visible:ring-indigo-500" 
                          />
                      </div>
                    </div>
                    <Button className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl h-11 px-8 font-bold gap-2">
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                </CardContent>
              </Card>
            )}

            {/* Team & Access */}
            {activeTab === "Team & Access" && (
              <div className="space-y-6">
                {isAdmin && (
                  <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xl font-black text-white">Invite Members</CardTitle>
                        <p className="text-xs text-zinc-500 mt-1">Invite your teammates to collaborate on products.</p>
                    </CardHeader>
                    <CardContent className="p-8 pt-4">
                        <div className="flex gap-4">
                          <div className="flex-1 relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                            <Input 
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                              placeholder="teammate@company.com"
                              className="bg-zinc-950/50 border-zinc-800 h-12 pl-10 rounded-xl focus-visible:ring-indigo-500" 
                            />
                          </div>
                          <select 
                            className="w-32 bg-zinc-950/50 border border-zinc-800 h-12 rounded-xl px-4 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                          <Button onClick={handleInvite} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold">
                            Invite
                          </Button>
                        </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                      <CardTitle className="text-xl font-black text-white">Workspace Members</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-4">
                      <div className="space-y-4">
                        {loadingMembers ? (
                          <div className="text-center py-12 text-zinc-500">Loading members...</div>
                        ) : members.length === 0 ? (
                          <div className="text-center py-12 text-zinc-500">No members found.</div>
                        ) : (
                          members.map((member) => {
                            return (
                              <div key={member._id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/30 border border-zinc-800/50 group">
                                <div className="flex items-center gap-4">
                                  <Avatar className="h-10 w-10 border border-white/5">
                                  <AvatarImage src={member.userId.avatarUrl || `https://api.dicebear.com/7.x/notionists/svg?seed=${member.userId.email}`} />
                                  <AvatarFallback>{member.userId.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-bold text-white">{member.userId.name}</p>
                                  <p className="text-xs text-zinc-500">{member.userId.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {isOwner && member.userId._id !== user?._id ? (
                                  <select 
                                    value={member.role}
                                    onChange={(e) => handleUpdateRole(member._id, e.target.value)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                                      member.role === 'OWNER' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                      member.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                      'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                    }`}
                                  >
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="MEMBER">MEMBER</option>
                                    <option value="VIEWER">VIEWER</option>
                                  </select>
                                ) : (
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border ${
                                    member.role === 'OWNER' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                    member.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                  }`}>
                                    {member.role}
                                  </span>
                                )}
                                {member.role !== 'OWNER' && (
                                  <Button 
                                    onClick={() => handleRemoveMember(member._id)}
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                        )}
                      </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Integrations */}
            {activeTab === "Integrations" && (
              <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black text-white">GitHub Integration</CardTitle>
                    <p className="text-xs text-zinc-500 mt-1">Connect your repositories to sync tasks with commit messages.</p>
                  </div>
                  <Github className="h-8 w-8 text-zinc-700" />
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-8">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                      <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-500/90 leading-relaxed font-medium">
                        <strong className="text-amber-400">Environment Requirement:</strong> Make sure <code className="bg-amber-500/20 px-1 rounded">GITHUB_APP_SECRET</code> is configured on the backend to successfully register and receive webhooks from GitHub.
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Target Project</label>
                        <select 
                          className="w-full bg-zinc-950/50 border border-zinc-800 h-12 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none"
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                        >
                          {projects.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Repository Path</label>
                        <Input 
                           placeholder="owner/repo" 
                           value={githubRepo}
                           onChange={(e) => setGithubRepo(e.target.value)}
                           className="bg-zinc-950/50 border-zinc-800 h-12 rounded-xl focus-visible:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleLinkRepo}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-bold gap-3 shadow-lg shadow-indigo-600/20"
                    >
                      <Zap className="h-5 w-5" />
                      Link Repository
                    </Button>

                    {linkResult && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-6"
                      >
                         <div className="flex items-center gap-3 text-emerald-400 mb-4">
                            <CheckCircle2 className="h-6 w-6" />
                            <h4 className="font-black text-lg">Successfully Linked!</h4>
                         </div>
                         
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Webhook URL</label>
                               <div className="flex gap-2">
                                  <Input readOnly value={linkResult.webhookUrl} className="bg-zinc-950/50 border-zinc-800 flex-1 font-mono text-[10px]" />
                                  <Button size="icon" variant="ghost" className="shrink-0 border border-zinc-800" onClick={() => handleCopy(linkResult.webhookUrl)}>
                                     <Copy className="h-4 w-4" />
                                  </Button>
                               </div>
                            </div>
                            
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Secret Key</label>
                               <div className="flex gap-2">
                                  <Input readOnly type="password" value={linkResult.secret} className="bg-zinc-950/50 border-zinc-800 flex-1 font-mono text-[10px]" />
                                  <Button size="icon" variant="ghost" className="shrink-0 border border-zinc-800" onClick={() => handleCopy(linkResult.secret)}>
                                     <Copy className="h-4 w-4" />
                                  </Button>
                               </div>
                            </div>
                         </div>

                         <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
                               <span className="text-white font-bold">Pro Tip:</span> Add these to your GitHub repo settings under <span className="text-indigo-400 italic">Webhooks</span> to enable auto-task closure.
                            </p>
                         </div>
                      </motion.div>
                    )}
                </CardContent>
              </Card>
            )}

            {/* Danger Zone - Only visible on General tab for Owners */}
            {activeTab === "General" && isOwner && (
              <Card className="bg-zinc-950/50 border border-red-900/20 rounded-[2.5rem] overflow-hidden">
                 <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-xl font-black text-red-500">Danger Zone</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 pt-4 flex items-center justify-between">
                    <div>
                       <p className="text-sm font-bold text-white">Delete Workspace</p>
                       <p className="text-xs text-zinc-600 mt-1">Once you delete a workspace, there is no going back. Please be certain.</p>
                    </div>
                    <Button onClick={() => setIsDeleteModalOpen(true)} variant="outline" className="text-red-500 border-red-900/30 hover:bg-red-500 hover:text-white rounded-xl h-11 px-6 font-bold gap-2 transition-all">
                       <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                 </CardContent>
              </Card>
            )}
         </div>
      </div>
      
      {/* Delete Workspace Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
         setIsDeleteModalOpen(open);
         if (!open) setDeleteConfirmationName("");
      }}>
        <DialogContent className="bg-zinc-950 border-red-900/30 sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
               <Shield className="h-5 w-5" /> 
               Delete Workspace
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-2 leading-relaxed">
              This action cannot be undone. This will permanently delete the 
              <strong className="text-white mx-1">{activeWorkspace?.name}</strong> 
              workspace, including all projects, tasks, and member associations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-xs font-bold text-zinc-400">
              Please type <span className="text-red-400 select-all bg-red-500/10 px-1 rounded">{activeWorkspace?.name}</span> to confirm.
            </p>
            <Input 
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              placeholder={activeWorkspace?.name}
              className="bg-zinc-900/50 border-red-900/30 h-12 rounded-xl focus-visible:ring-red-500 text-white placeholder:text-zinc-700" 
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <Button 
               variant="ghost" 
               onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationName(""); }} 
               className="text-zinc-400 hover:text-white rounded-xl"
               disabled={isDeleting}
            >
               Cancel
            </Button>
            <Button 
               onClick={handleDeleteWorkspace} 
               disabled={deleteConfirmationName !== activeWorkspace?.name || isDeleting}
               className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-6 border border-red-500 disabled:opacity-50"
            >
               {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
