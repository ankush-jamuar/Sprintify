import { useState } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "../../components/ui/avatar";
import { api } from "../../lib/axios";
import { toast } from "sonner";
import { User, Mail, Lock, Camera, LogOut, ChevronRight, Star, Shield, Zap, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";

export default function Profile() {
  const { user, setAuth, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const payload: Record<string, string> = { name, email };
      if (password) payload.password = password;

      const { data } = await api.put("/auth/profile", payload);
      
      setAuth(
        { _id: data._id, name: data.name, email: data.email, avatarUrl: user?.avatarUrl }, 
        data.token
      );
      
      toast.success("Profile updated successfully!");
      setPassword("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await api.delete("/auth/me");
      toast.success("Account permanently deleted");
      logout();
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center gap-10">
         <div className="relative group">
            <Avatar className="h-32 w-32 md:h-40 md:w-40 border-[6px] border-zinc-950 shadow-2xl relative z-10">
                <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.name}`} />
                <AvatarFallback className="text-4xl bg-indigo-600 text-white font-black">{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600/20 group-hover:border-indigo-600/40 transition-all scale-110 blur-xl group-hover:blur-2xl opacity-50" />
            <Button size="icon" className="absolute bottom-2 right-2 z-20 h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white border-4 border-zinc-950 shadow-xl">
               <Camera className="h-4 w-4" />
            </Button>
         </div>
         <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
               <Star className="h-3 w-3 fill-indigo-400" />
               Professional Developer
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{user?.name}</h1>
            <p className="text-zinc-500 text-lg font-medium">Head of Engineering @ Sprintify</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-8">
               <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-zinc-300">Verified identity</span>
               </div>
               <div className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/5 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-zinc-300">Fast responder</span>
               </div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="md:col-span-2 space-y-8">
            <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
               <CardHeader className="p-10 pb-4">
                  <CardTitle className="text-xl font-black text-white">Personal Information</CardTitle>
               </CardHeader>
               <CardContent className="p-10 pt-4 space-y-6">
                  <div className="grid gap-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Full Name</label>
                     <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                           value={name} 
                           onChange={(e) => setName(e.target.value)}
                           className="bg-zinc-950/50 border-zinc-800 h-14 pl-12 rounded-2xl focus-visible:ring-indigo-500 text-base" 
                        />
                     </div>
                  </div>
                  <div className="grid gap-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
                     <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                           value={email} 
                           onChange={(e) => setEmail(e.target.value)}
                           className="bg-zinc-950/50 border-zinc-800 h-14 pl-12 rounded-2xl focus-visible:ring-indigo-500 text-base" 
                        />
                     </div>
                  </div>
                  <Button 
                     onClick={handleUpdateProfile}
                     disabled={loading}
                     className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-2xl h-14 px-10 font-bold text-base mt-2 shadow-2xl disabled:opacity-50"
                  >
                     {loading ? "Updating..." : "Update Profile"}
                  </Button>
               </CardContent>
            </Card>

            <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] overflow-hidden">
               <CardHeader className="p-10 pb-4">
                  <CardTitle className="text-xl font-black text-white">Security & Password</CardTitle>
               </CardHeader>
               <CardContent className="p-10 pt-4 space-y-6">
                  <div className="grid gap-2">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">New Password</label>
                     <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                           type="password" 
                           placeholder="Leave blank to keep current" 
                           value={password}
                           onChange={(e) => setPassword(e.target.value)}
                           className="bg-zinc-950/50 border-zinc-800 h-14 pl-12 rounded-2xl focus-visible:ring-indigo-500 text-base" 
                        />
                     </div>
                  </div>
                  <div className="p-6 mt-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between opacity-50 grayscale pointer-events-none">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                           <Shield className="h-4 w-4 text-zinc-500" />
                        </div>
                        <div>
                           <p className="text-sm font-bold text-white">Two-Factor Authentication</p>
                           <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">Coming soon to Pro Users</p>
                        </div>
                     </div>
                     <ChevronRight className="h-5 w-5 text-zinc-700" />
                  </div>
               </CardContent>
            </Card>
         </div>

         <div className="space-y-6">
            <Card className="bg-zinc-900/40 border-zinc-800/80 rounded-[2.5rem] p-8">
               <h4 className="text-xs font-black text-zinc-600 uppercase tracking-widest mb-4">Session Control</h4>
               <Button 
                 onClick={logout} 
                 variant="outline" 
                 className="w-full h-14 border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-bold gap-3 transition-all"
               >
                  <LogOut className="h-5 w-5" />
                  Sign Out
               </Button>
            </Card>
            
            <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/20 text-center">
               <Zap className="h-10 w-10 text-indigo-400 mx-auto mb-4" />
               <h4 className="text-lg font-bold text-white">Sprintify Platinum</h4>
               <p className="text-xs text-indigo-200 mt-2 leading-relaxed">You are currently using the Platinum tier with all active AI features enabled.</p>
               <Button variant="ghost" className="mt-6 text-white font-bold h-10 border border-white/10 rounded-xl hover:bg-white/5 w-full">Learn More</Button>
            </div>

            <Card className="bg-zinc-950/50 border border-red-900/20 rounded-[2.5rem] p-8 mt-6">
               <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <AlertTriangle className="h-4 w-4" /> Danger Zone
               </h4>
               <div className="space-y-4">
                 <p className="text-xs text-zinc-500 leading-relaxed">Permanently delete your Sprintify account, projects, and active user traces.</p>
                 <Button 
                   onClick={() => setIsDeleteModalOpen(true)} 
                   variant="outline" 
                   className="w-full h-14 border-red-900/30 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-bold gap-3 transition-all"
                 >
                    <Trash2 className="h-5 w-5" />
                    Delete Account
                 </Button>
               </div>
            </Card>
         </div>
      </div>
      
      {/* Delete Account Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
         setIsDeleteModalOpen(open);
         if (!open) setDeleteConfirmationEmail("");
      }}>
        <DialogContent className="bg-zinc-950 border-red-900/30 sm:max-w-[425px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
               <Shield className="h-5 w-5" /> 
               Delete Account
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-2 leading-relaxed">
              This action cannot be undone. This will permanently delete your account, remove your associations from all workspaces, and erase your personal data. Workspaces you exclusively own may become orphaned.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <p className="text-xs font-bold text-zinc-400">
              Please type <span className="text-red-400 select-all bg-red-500/10 px-1 rounded">{user?.email}</span> to confirm.
            </p>
            <Input 
              value={deleteConfirmationEmail}
              onChange={(e) => setDeleteConfirmationEmail(e.target.value)}
              placeholder={user?.email}
              className="bg-zinc-900/50 border-red-900/30 h-12 rounded-xl focus-visible:ring-red-500 text-white placeholder:text-zinc-700" 
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-2">
            <Button 
               variant="ghost" 
               onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationEmail(""); }} 
               className="text-zinc-400 hover:text-white rounded-xl"
               disabled={isDeleting}
            >
               Cancel
            </Button>
            <Button 
               onClick={handleDeleteAccount} 
               disabled={deleteConfirmationEmail !== user?.email || isDeleting}
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
