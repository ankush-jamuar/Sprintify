import { useState, useEffect } from "react";
import { api } from "../lib/axios";
import { Dialog, DialogContent } from "./ui/dialog";
import { Input } from "./ui/input";
import { Search as SearchIcon, FolderKanban, CheckSquare, User, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "../stores/useWorkspaceStore";

interface SearchResults {
  projects: { _id: string, name: string }[];
  tasks: { _id: string, title: string, status: string, key: string, projectId?: string }[];
  members: { _id: string, name: string, email: string }[];
}

export default function SearchOverlay({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ projects: [], tasks: [], members: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ projects: [], tasks: [], members: [] });
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !activeWorkspace) {
      setResults({ projects: [], tasks: [], members: [] });
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/search?q=${query}`);
        setResults(data);
      } catch {
        console.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeWorkspace]);

  const goToProject = (id: string) => {
    navigate(`/projects/${id}`);
    onClose();
  };

  const hasResults = results.projects.length > 0 || results.tasks.length > 0 || results.members.length > 0;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-xl p-0 bg-zinc-950 border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl rounded-2xl">
        <div className="flex items-center px-4 border-b border-zinc-800">
          <SearchIcon className="h-5 w-5 text-zinc-500 mr-2" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, tasks, or members..."
            className="border-0 bg-transparent h-14 focus-visible:ring-0 px-0 text-lg shadow-none"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500 ml-2" />}
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {!query.trim() && !loading && (
            <div className="p-8 text-center text-zinc-600 text-sm">
              Type to start searching...
            </div>
          )}

          {query.trim() && !loading && !hasResults && (
            <div className="p-8 text-center text-zinc-600 text-sm">
              No results found for "{query}".
            </div>
          )}

          {hasResults && (
            <div className="p-2 space-y-4">
              {results.projects.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Projects</h4>
                  {results.projects.map(p => (
                    <button key={p._id} onClick={() => goToProject(p._id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200">{p.name}</p>
                        <p className="text-xs text-zinc-500">Project Workspace</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.tasks.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Tasks</h4>
                  {results.tasks.map(t => (
                    <button key={t._id} onClick={() => goToProject(t.projectId || "")} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-900 transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200">
                          <span className="text-blue-400 mr-1">{t.key}</span>
                          {t.title}
                        </p>
                        <p className="text-xs text-zinc-500 line-clamp-1">{t.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.members.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Members</h4>
                  {results.members.map(m => (
                    <div key={m._id} className="flex items-center gap-3 p-3 rounded-xl cursor-default text-left">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-200">{m.name}</p>
                        <p className="text-xs text-zinc-500">{m.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
