import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { api } from "../../lib/axios";
import { useSocket } from "../../hooks/useSocket";
import { MessageSquare, Send, Tag, Sparkles, FileText, ListTree, Loader2, Wand2, Paperclip, Check, Plus, Trash2, Shield, Zap, Eye, EyeOff, Reply, Edit3, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { toast } from "sonner";
import { useWorkspaceStore } from "../../stores/useWorkspaceStore";

interface Task {
  _id: string;
  key: string;
  title: string;
  status: string;
  description?: string;
  priority: string;
  dueDate?: string;
  projectId?: string;
  assigneeId?: string;
  createdAt?: string;
  attachments?: { url: string; name: string }[];
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  authorId: { _id: string; name: string; username: string; avatarUrl?: string };
  parentCommentId?: string;
  mentions?: string[];
}

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onDelete?: (taskId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-zinc-600",
  IN_PROGRESS: "bg-blue-500",
  IN_REVIEW: "bg-amber-500",
  DONE: "bg-emerald-500",
};

function CommentItem({
  comment,
  onReply,
  onEdit,
  onDelete,
  isEditing,
  editValue,
  onEditChange,
  onEditCancel,
  onEditSave
}: {
  comment: Comment;
  onReply?: () => void;
  onEdit: (content: string) => void;
  onDelete: () => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (val: string) => void;
  onEditCancel: () => void;
  onEditSave: () => void;
}) {
  const currentUserId = localStorage.getItem("userId"); // Simple way to check ownership

  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="text-indigo-400 font-bold bg-indigo-500/10 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  return (
    <div className="flex items-start gap-3 group">
      <Avatar className="h-8 w-8 border border-zinc-800 shrink-0">
        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${comment.authorId?.name}`} />
        <AvatarFallback className="bg-zinc-800 text-[10px]">
          {comment.authorId?.name?.[0] || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-300">{comment.authorId?.name}</span>
            <span className="text-[10px] text-zinc-600 font-mono">
              {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onReply && (
              <Button variant="ghost" size="icon" onClick={onReply} className="h-6 w-6 text-zinc-500 hover:text-indigo-400">
                <Reply className="h-3 w-3" />
              </Button>
            )}
            {comment.authorId?._id === currentUserId && (
              <>
                <Button variant="ghost" size="icon" onClick={() => onEdit(comment.content)} className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} className="h-6 w-6 text-zinc-500 hover:text-red-400">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={onEditSave} className="h-7 text-[10px] bg-indigo-600">Save</Button>
              <Button variant="ghost" size="sm" onClick={onEditCancel} className="h-7 text-[10px]">Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 mt-1 leading-normal break-words">
            {renderContent(comment.content)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TaskDetailModal({ task, open, onClose, onDelete }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [isSummarizingDiscussion, setIsSummarizingDiscussion] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [watchersCount, setWatchersCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");
  const [aiDiscussionSummary, setAiDiscussionSummary] = useState<string | null>(null);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isSuggestingPriority, setIsSuggestingPriority] = useState(false);
  const [isEstimatingDeadline, setIsEstimatingDeadline] = useState(false);

  const [aiResults, setAiResults] = useState<{
    summary?: string;
    subtasks?: { title: string; description: string }[];
    priority?: { priority: string; reason: string };
    deadline?: { estimatedDays: number; complexity: string };
  } | null>(null);

  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Validation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationKey, setDeleteConfirmationKey] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<{ userId?: { _id: string, name: string } }[]>([]);
  const { activeWorkspace } = useWorkspaceStore();
  const socket = useSocket();

  const fetchComments = useCallback(async () => {
    if (!task) return;
    try {
      const { data } = await api.get(`/comments/task/${task._id}`);
      setComments(data);
    } catch {
      console.error("Failed to fetch comments");
    }
  }, [task]);

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const { data } = await api.get(`/workspaces/${activeWorkspace._id}/members`);
      setMembers(data);
    } catch {
      console.error("Failed to fetch workspace members");
    }
  }, [activeWorkspace]);

  useEffect(() => {
    if (open && task) {
      fetchComments();
      setAiResults(null);
      setEditTitle(task.title);
      setEditDesc(task.description || "");
      setIsWatching(false); // In a real app, you'd check this from the task object
      setWatchersCount(0); // In a real app, fetch this
      setIsEditingTitle(false);
      setIsEditingDesc(false);
    }
  }, [open, task, fetchComments]);

  useEffect(() => {
    if (open && activeWorkspace) {
      fetchMembers();
    }
  }, [open, activeWorkspace, fetchMembers]);

  // Real-time comment listener
  useEffect(() => {
    if (!socket || !task) return;

    const handler = (comment: Comment) => {
      setComments((prev) => [...prev, comment]);
    };

    socket.on("comment-added", handler);
    return () => {
      socket.off("comment-added", handler);
    };
  }, [socket, task]);

  const toggleWatch = async () => {
    if (!task) return;
    try {
      const { data } = await api.post(`/tasks/${task._id}/watch`);
      setIsWatching(data.isWatching);
      setWatchersCount(data.watchersCount);
      toast.success(data.isWatching ? "Watching task" : "Stopped watching");
    } catch {
      toast.error("Failed to update watch status");
    }
  };

  const summarizeDiscussion = async () => {
    if (!task) return;
    setIsSummarizingDiscussion(true);
    try {
      const { data } = await api.post("/ai/summarize-discussion", { taskId: task._id });
      setAiDiscussionSummary(data.summary);
      toast.success("Discussion summarized");
    } catch {
      toast.error("Failed to summarize discussion");
    } finally {
      setIsSummarizingDiscussion(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !task) return;
    setPosting(true);
    try {
      await api.post("/comments", {
        taskId: task._id,
        content: newComment,
        parentCommentId: replyingTo?._id
      });
      setNewComment("");
      setReplyingTo(null);
      await fetchComments();
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      await api.patch(`/comments/${commentId}`, { content: editCommentContent });
      setEditingComment(null);
      await fetchComments();
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      await fetchComments();
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const summarizeDescription = async () => {
    if (!task?.description) return;
    setIsSummarizing(true);
    try {
      const { data } = await api.post("/ai/summarize", { title: task.title, description: task.description });
      setAiResults((prev) => ({ ...prev, summary: data.summary }));
    } catch {
      toast.error("Failed to summarize");
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateBreakdown = async () => {
    if (!task) return;
    setIsGeneratingSubtasks(true);
    try {
      const { data } = await api.post("/ai/generate-subtasks", { taskTitle: task.title, taskDescription: task.description });
      setAiResults((prev) => ({ ...prev, subtasks: data.subtasks }));
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const deleteTask = async () => {
    if (!task) return;
    try {
      setIsDeleting(true);
      await api.delete(`/tasks/${task._id}`);
      toast.success("Task deleted");
      onDelete?.(task._id);
      setIsDeleteModalOpen(false);
      onClose();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const suggestPriority = async () => {
    if (!task) return;
    setIsSuggestingPriority(true);
    try {
      const { data } = await api.post("/ai/suggest-priority", { taskTitle: task.title, taskDescription: task.description });
      setAiResults((prev) => ({ ...prev, priority: data }));
      toast.success("Priority suggested");
    } catch {
      toast.error("Failed to suggest priority");
    } finally {
      setIsSuggestingPriority(false);
    }
  };

  const estimateDeadline = async () => {
    if (!task) return;
    setIsEstimatingDeadline(true);
    try {
      const { data } = await api.post("/ai/estimate-deadline", { taskTitle: task.title, taskDescription: task.description });
      setAiResults((prev) => ({ ...prev, deadline: data }));
      toast.success("Deadline estimated");
    } catch {
      toast.error("Failed to estimate deadline");
    } finally {
      setIsEstimatingDeadline(false);
    }
  };

  const saveTaskField = async (field: "title" | "description" | "assigneeId" | "priority" | "dueDate", value: string | null) => {
    if (!task) return;
    try {
      await api.put(`/tasks/${task._id}`, { [field]: value });
      if (field === "title") {
        setIsEditingTitle(false);
      } else if (field === "description") {
        setIsEditingDesc(false);
      }
      toast.success(`${field} updated!`);
    } catch {
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;
    setUploadingFile(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post(`/upload/task/${task._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newAttachment = data.attachment;
      const newAttachments = [...(task.attachments || []), newAttachment];

      task.attachments = newAttachments;
      toast.success("File uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 gap-0 overflow-hidden flex flex-col md:flex-row h-[80vh]">
        {/* Main Content (Left) */}
        <div className="flex-1 flex flex-col border-r border-zinc-800/50">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-800/50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {task.key}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleWatch}
                    className={`h-6 gap-1.5 text-[10px] px-2 rounded-full border transition-all ${isWatching ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}
                  >
                    {isWatching ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    {isWatching ? "Watching" : "Watch"}
                    {watchersCount > 0 && <span className="ml-0.5 opacity-60">{watchersCount}</span>}
                  </Button>
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="h-8 text-xl font-bold bg-zinc-900 border-zinc-700"
                        autoFocus
                        onKeyDown={e => e.key === "Enter" && saveTaskField("title", editTitle)}
                        onBlur={() => saveTaskField("title", editTitle)}
                      />
                    </div>
                  ) : (
                    <DialogTitle
                      onClick={() => setIsEditingTitle(true)}
                      className="text-xl font-bold text-zinc-100 hover:text-indigo-400 cursor-pointer transition-colors border border-transparent hover:border-zinc-800 rounded px-1 -ml-1"
                    >
                      {task.title}
                    </DialogTitle>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold text-white uppercase tracking-wider ${STATUS_COLORS[task.status] || "bg-zinc-700"}`}>
                      {task.status.replace("_", " ")}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                      <Tag className="h-3 w-3" /> Task
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:ml-4 border-l border-zinc-800/50 pl-4">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Assignee:</span>
                    <select
                      value={task.assigneeId || ""}
                      onChange={(e) => saveTaskField("assigneeId", e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 h-8 rounded-lg px-2 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none max-w-[150px]"
                    >
                      <option value="">Unassigned</option>
                      {members.map(m => (
                        <option key={m.userId?._id} value={m.userId?._id}>{m.userId?.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {/* Description */}
              <div className="px-6 py-6 border-b border-zinc-800/30 bg-zinc-900/10 group">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Description</h4>
                  {!isEditingDesc && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingDesc(true)} className="h-6 text-[10px] text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Edit
                    </Button>
                  )}
                </div>
                {isEditingDesc ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 min-h-[100px] text-sm text-zinc-300"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { setIsEditingDesc(false); setEditDesc(task.description || ""); }} className="h-8">Cancel</Button>
                      <Button size="sm" onClick={() => saveTaskField("description", editDesc)} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Check className="h-3 w-3" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => setIsEditingDesc(true)}
                    className="text-sm text-zinc-300 leading-relaxed cursor-text hover:bg-zinc-800/20 p-2 -mx-2 rounded transition-colors"
                  >
                    {task.description || <span className="text-zinc-600 italic">Add a deeper description...</span>}
                  </p>
                )}
              </div>

              {/* Attachments Section */}
              <div className="px-6 py-6 border-b border-zinc-800/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center gap-2">
                    <Paperclip className="h-3 w-3" /> Attachments
                  </h4>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="h-7 text-[10px] border-zinc-800 bg-zinc-900"
                    >
                      {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-1" />}
                      Add File
                    </Button>
                  </div>
                </div>

                {task.attachments && task.attachments.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {task.attachments.map((file, i) => (
                      <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 transition-colors group">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                          <FileText className="h-5 w-5 text-indigo-400" />
                        </div>
                        <span className="text-xs font-medium text-zinc-300 truncate">{file.name}</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-zinc-800/50 rounded-xl bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No attachments yet.</p>
                  </div>
                )}
              </div>

              {/* AI results if any */}
              <AnimatePresence>
                {aiResults && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-6 py-6 bg-indigo-500/5 border-b border-indigo-500/10 space-y-4">
                    {aiResults.summary && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <FileText className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">AI Summary</span>
                        </div>
                        <p className="text-sm text-indigo-200/80 italic">"{aiResults.summary}"</p>
                      </div>
                    )}
                    {aiResults.subtasks && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-indigo-400">
                          <ListTree className="h-4 w-4" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Actionable Subtasks</span>
                        </div>
                        <div className="grid gap-2">
                          {aiResults.subtasks.map((st, idx) => (
                            <div key={idx} className="bg-zinc-900/50 p-2.5 rounded-lg border border-indigo-500/10 flex items-start gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-zinc-200">{st.title}</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">{st.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comments */}
              <div className="px-6 pt-6 pb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-500" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                    Discussion ({comments.length})
                  </h4>
                </div>
                {comments.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={summarizeDiscussion}
                    disabled={isSummarizingDiscussion}
                    className="h-7 gap-2 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20"
                  >
                    {isSummarizingDiscussion ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Summarize Thread
                  </Button>
                )}
              </div>

              {aiDiscussionSummary && (
                <div className="mx-6 mb-4 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl relative group">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setAiDiscussionSummary(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <div className="flex items-center gap-2 text-indigo-400 mb-2">
                    <Sparkles className="h-3 w-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">AI Discussion Summary</span>
                  </div>
                  <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap italic">
                    {aiDiscussionSummary}
                  </div>
                </div>
              )}

              <div className="px-6 space-y-6 pb-12">
                {comments.length === 0 ? (
                  <p className="text-xs text-zinc-700 py-4 italic">No comments yet. Start the conversation!</p>
                ) : (
                  // Filter for top-level comments first
                  comments.filter(c => !c.parentCommentId).map((c) => (
                    <div key={c._id} className="space-y-4">
                      {/* Main Comment */}
                      <CommentItem
                        comment={c}
                        onReply={() => {
                          setReplyingTo(c);
                          // Scroll to input or focus
                        }}
                        onEdit={(content) => {
                          setEditingComment(c._id);
                          setEditCommentContent(content);
                        }}
                        onDelete={() => handleDeleteComment(c._id)}
                        isEditing={editingComment === c._id}
                        editValue={editCommentContent}
                        onEditChange={setEditCommentContent}
                        onEditCancel={() => setEditingComment(null)}
                        onEditSave={() => handleUpdateComment(c._id)}
                      />

                      {/* Replies */}
                      <div className="ml-11 space-y-4 border-l border-zinc-900 pl-4">
                        {comments.filter(reply => reply.parentCommentId === c._id).map(reply => (
                          <CommentItem
                            key={reply._id}
                            comment={reply}
                            onEdit={(content) => {
                              setEditingComment(reply._id);
                              setEditCommentContent(content);
                            }}
                            onDelete={() => handleDeleteComment(reply._id)}
                            isEditing={editingComment === reply._id}
                            editValue={editCommentContent}
                            onEditChange={setEditCommentContent}
                            onEditCancel={() => setEditingComment(null)}
                            onEditSave={() => handleUpdateComment(reply._id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>

          {/* New Comment Input */}
          <div className="p-4 border-t border-zinc-800/50 space-y-3 bg-zinc-950">
            {replyingTo && (
              <div className="flex items-center justify-between bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20">
                <div className="flex items-center gap-2 text-[10px] text-indigo-400">
                  <Reply className="h-3 w-3 " />
                  <span>Replying to <span className="font-bold">{replyingTo.authorId?.name}</span></span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyingTo(null)} className="h-5 w-5 hover:bg-transparent">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex items-end gap-3">
              <Textarea
                placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="bg-zinc-900/50 border-zinc-800 text-sm min-h-[60px] resize-none focus-visible:ring-indigo-500"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
              />
              <Button size="icon" onClick={handlePostComment} disabled={posting || !newComment.trim()} className="h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {/* Task Metadata Sidebar (combined with AI sidebar for cleaner look) */}
        <div className="w-full md:w-72 bg-zinc-900/30 flex flex-col overflow-y-auto">
          <div className="p-6 border-b border-zinc-800/50 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => saveTaskField("priority", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 h-9 rounded-lg px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer hover:border-zinc-700 transition-colors"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                Due Date
              </label>
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ""}
                onChange={(e) => saveTaskField("dueDate", e.target.value || null)}
                className="w-full bg-zinc-900 border border-zinc-800 h-9 rounded-lg px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer hover:border-zinc-700 transition-colors [color-scheme:dark]"
              />
              {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && (
                <p className="text-[10px] text-red-500 font-bold animate-pulse mt-1">OVERDUE</p>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-indigo-400" /> AI Toolkit
              </h4>
              <p className="text-xs text-zinc-600 leading-tight">Use Sprintify AI to optimize this task.</p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={summarizeDescription}
                disabled={isSummarizing || !task.description}
                className="w-full justify-start gap-3 h-11 border-zinc-800/80 bg-zinc-950/50 hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all group"
              >
                {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />}
                <span className="text-xs font-medium">Summarize Task</span>
              </Button>

              <Button
                variant="outline"
                onClick={suggestPriority}
                disabled={isSuggestingPriority}
                className="w-full justify-start gap-3 h-11 border-zinc-800/80 bg-zinc-950/50 hover:bg-amber-500/5 hover:border-amber-500/30 transition-all group"
              >
                {isSuggestingPriority ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />}
                <span className="text-xs font-medium">Suggest Priority</span>
              </Button>

              {aiResults?.priority && (
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase">Suggested: {aiResults.priority.priority}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-amber-500 hover:bg-amber-500/20"
                      onClick={() => saveTaskField("priority", aiResults.priority!.priority)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic leading-tight">"{aiResults.priority.reason}"</p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={estimateDeadline}
                disabled={isEstimatingDeadline}
                className="w-full justify-start gap-3 h-11 border-zinc-800/80 bg-zinc-950/50 hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group"
              >
                {isEstimatingDeadline ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />}
                <span className="text-xs font-medium">Estimate Deadline</span>
              </Button>

              {aiResults?.deadline && (
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Est: {aiResults.deadline.estimatedDays} Days</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-emerald-500 hover:bg-emerald-500/20"
                      onClick={() => {
                        const date = new Date();
                        date.setDate(date.getDate() + aiResults.deadline!.estimatedDays);
                        saveTaskField("dueDate", date.toISOString().split('T')[0]);
                      }}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">Complexity: <span className="text-emerald-500 uppercase">{aiResults.deadline.complexity}</span></p>
                </div>
              )}

              <Button
                variant="outline"
                onClick={generateBreakdown}
                disabled={isGeneratingSubtasks}
                className="w-full justify-start gap-3 h-11 border-zinc-800/80 bg-zinc-950/50 hover:bg-violet-500/5 hover:border-violet-500/30 transition-all group"
              >
                {isGeneratingSubtasks ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTree className="h-4 w-4 text-violet-400 group-hover:scale-110 transition-transform" />}
                <span className="text-xs font-medium">Generate Subtasks</span>
              </Button>
            </div>

            <div className="pt-6 border-t border-zinc-800/50">
              <div className="bg-gradient-to-br from-indigo-500/10 to-transparent p-4 rounded-xl border border-indigo-500/10">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">PRO TIP</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                  "Break down larger tasks to increase sprint completion probability."
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/50">
              <Button
                variant="outline"
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full justify-start gap-3 h-11 border-red-900/30 bg-zinc-950/50 text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all group"
              >
                <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Delete Task</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete Task Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(val) => {
        setIsDeleteModalOpen(val);
        if (!val) setDeleteConfirmationKey("");
      }}>
        <DialogContent className="bg-zinc-950 border-red-900/30 sm:max-w-[425px] rounded-[2rem] z-[60]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-500 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Delete Task
            </DialogTitle>
            <DialogDescription className="text-zinc-500 text-xs mt-2 leading-relaxed">
              This action cannot be undone. This will permanently delete the task and remove it from the sprint board.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-xs font-bold text-zinc-400 mb-2">
              Please type <span className="text-red-400 select-all bg-red-500/10 px-1 rounded">{task.key}</span> to confirm.
            </p>
            <Input
              value={deleteConfirmationKey}
              onChange={(e) => setDeleteConfirmationKey(e.target.value)}
              placeholder={task.key}
              className="bg-zinc-900/50 border-red-900/30 h-12 rounded-xl focus-visible:ring-red-500 text-white placeholder:text-zinc-700"
            />
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button
              variant="ghost"
              onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationKey(""); }}
              className="text-zinc-400 hover:text-white rounded-xl"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={deleteTask}
              disabled={deleteConfirmationKey !== task.key || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold px-6 border border-red-500 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
