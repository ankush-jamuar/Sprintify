import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, BarChart3, MessageSquare, Zap, Loader2, ListChecks, FileText, BrainCircuit, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { api } from "../../lib/axios";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface AIResults {
  milestones?: { title: string; tasks: { title: string; description: string }[] }[];
  insights?: { title: string; description: string; type: "positive" | "warning" | "neutral" }[];
  prioritized?: { title: string; priority: string; reason: string }[];
  probability?: number;
  analysis?: string;
  tasks?: { title: string; description: string; priority: string }[];
  createdSprintTasks?: { title: string; description: string }[];
  subtasks?: { title: string; description: string }[];
  summary?: string;
}

export default function AIPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"chat" | "planner" | "sprint" | "insights" | "tools">("chat");
  const { projectId } = useParams();

  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isGeneratingSprint, setIsGeneratingSprint] = useState(false);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isParsingNotes, setIsParsingNotes] = useState(false);

  const [input, setInput] = useState("");
  const [sprintPrompt, setSprintPrompt] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskDesc, setSubtaskDesc] = useState("");
  const [summarizeTitle, setSummarizeTitle] = useState("");
  const [summarizeDesc, setSummarizeDesc] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);
  const [results, setResults] = useState<AIResults | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsChatLoading(true);
    try {
      const { data } = await api.post("/ai/chat", { projectId, question: userMsg });
      setMessages((prev) => [...prev, { role: "ai", content: data.answer || "I'm not sure how to answer that." }]);
    } catch {
      toast.error("AI chat failed");
      setMessages((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't process that request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const runProjectPlanner = async () => {
    if (!input.trim()) return;
    setIsPlanning(true);
    try {
      const { data } = await api.post("/ai/plan-project", { idea: input });
      setResults((prev) => ({ ...prev, milestones: data.milestones }));
      toast.success("Project plan generated");
    } catch {
      toast.error("Failed to generate project plan");
    } finally {
      setIsPlanning(false);
    }
  };

  const planSprint = async () => {
    if (!sprintPrompt.trim() || !projectId) return toast.warning("Project ID and sprint goal required");
    setIsGeneratingSprint(true);
    try {
      const { data } = await api.post("/ai/plan-sprint", { projectId, sprintGoal: sprintPrompt });
      setResults((prev) => ({ ...prev, createdSprintTasks: data.tasks }));
      toast.success("Sprint plan generated with due dates");
    } catch {
      toast.error("Failed to plan sprint");
    } finally {
      setIsGeneratingSprint(false);
    }
  };

  const generateTasksFromDesc = async () => {
    if (!input.trim() || !projectId) return toast.warning("Project ID and description required");
    setIsPlanning(true);
    try {
      const { data } = await api.post("/ai/generate-tasks", { projectId, description: input });
      setResults((prev) => ({ ...prev, createdSprintTasks: data }));
      toast.success("Tasks generated from description");
    } catch {
      toast.error("Failed to generate tasks");
    } finally {
      setIsPlanning(false);
    }
  };
  const generateSubtasks = async () => {
    if (!subtaskTitle.trim()) return toast.warning("Task title required");
    setIsGeneratingSubtasks(true);
    try {
      const { data } = await api.post("/ai/generate-subtasks", { taskTitle: subtaskTitle, taskDescription: subtaskDesc });
      setResults((prev) => ({ ...prev, subtasks: data.subtasks }));
      toast.success("Subtasks generated");
    } catch {
      toast.error("Failed to generate subtasks");
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const summarizeTask = async () => {
    if (!summarizeTitle.trim() || !summarizeDesc.trim()) return toast.warning("Title & Description required");
    setIsSummarizing(true);
    try {
      const { data } = await api.post("/ai/summarize", { title: summarizeTitle, description: summarizeDesc });
      setResults((prev) => ({ ...prev, summary: data.summary }));
      toast.success("Task summarized");
    } catch {
      toast.error("Failed to summarize task");
    } finally {
      setIsSummarizing(false);
    }
  };

  const getProductivityInsights = async () => {
    setIsInsightsLoading(true);
    try {
      const { data } = await api.post("/ai/insights");
      setResults((prev) => ({ ...prev, insights: data.insights }));
      toast.success("Insights gathered");
    } catch {
      toast.error("Failed to get insights");
    } finally {
      setIsInsightsLoading(false);
    }
  };

  const predictSprintProgress = async () => {
    if (!projectId) return toast.warning("Select a project first");
    setIsInsightsLoading(true);
    try {
      const { data } = await api.post("/ai/predict-sprint", { projectId });
      setResults((prev) => ({ ...prev, probability: data.probability, analysis: data.analysis }));
      toast.success("Sprint predicted");
    } catch {
      toast.error("Failed to predict sprint");
    } finally {
      setIsInsightsLoading(false);
    }
  };

  const prioritizeTasks = async () => {
    if (!projectId) return toast.warning("Select a project first");
    setIsInsightsLoading(true);
    try {
      const { data } = await api.post("/ai/prioritize", { projectId });
      setResults((prev) => ({ ...prev, prioritized: data.prioritized }));
      toast.success("Tasks prioritized");
    } catch {
      toast.error("Failed to prioritize tasks");
    } finally {
      setIsInsightsLoading(false);
    }
  };

  const parseMeetingNotes = async () => {
    if (!input.trim()) return;
    setIsParsingNotes(true);
    try {
      const { data } = await api.post("/ai/meeting-notes", { notes: input });
      setResults((prev) => ({ ...prev, tasks: data.tasks }));
      toast.success("Notes parsed");
    } catch {
      toast.error("Failed to parse notes");
    } finally {
      setIsParsingNotes(false);
    }
  };

  const tabs = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "planner", icon: Sparkles, label: "Planner" },
    { id: "sprint", icon: ListChecks, label: "Sprint Tools" },
    { id: "insights", icon: BarChart3, label: "Insights" },
    { id: "tools", icon: FileText, label: "Utilities" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed top-0 right-0 w-[450px] h-screen bg-zinc-950/90 backdrop-blur-2xl border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
        >
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <BrainCircuit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100">AI Copilot</h2>
                <p className="text-xs text-zinc-500">Intelligent Project Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-500 hover:text-zinc-100 h-10 w-10">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex p-2 gap-1 bg-zinc-900/20 border-b border-zinc-800/50 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setResults(null); }}
                className={`flex-1 flex flex-col items-center py-2 px-1 rounded-lg transition-all min-w-[72px] shrink-0 ${activeTab === tab.id ? "bg-indigo-500/10 text-indigo-400" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                  }`}
              >
                <tab.icon className="h-4 w-4 mb-1" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {activeTab === "chat" && (
              <div className="h-full flex flex-col">
                <div className="flex-1 space-y-4 mb-4">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                      <MessageSquare className="h-12 w-12 text-zinc-700" />
                      <p className="text-sm text-zinc-500">Ask about ongoing tasks, priorities, or project status.</p>
                      <div className="grid grid-cols-1 gap-2 w-full max-w-[300px]">
                        {["What tasks are pending?", "How is our sprint health?", "Summarize recent activity"].map((q) => (
                          <button key={q} onClick={() => { setInput(q); }} className="text-[10px] p-2 border border-zinc-800 rounded-md hover:bg-zinc-900 transition-colors text-left text-zinc-300">
                            "{q}"
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m: Message, i: number) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-tl-none"
                        }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                        <span className="text-xs text-zinc-500">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleChat} className="relative mt-auto pt-2">
                  <textarea
                    placeholder="Type your question... (Shift+Enter for new line)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleChat(e as unknown as React.FormEvent);
                      }
                    }}
                    className="w-full bg-zinc-900/50 border border-zinc-800 pr-12 pl-4 py-3 min-h-[50px] max-h-[150px] rounded-xl focus:ring-1 focus:ring-indigo-500 text-zinc-100 placeholder:text-zinc-600 resize-none custom-scrollbar"
                    rows={1}
                  />
                  <Button type="submit" size="icon" disabled={isChatLoading || !input.trim()} className="absolute right-2 bottom-2 h-9 w-9 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                    <Send className="h-4 w-4 text-white" />
                  </Button>
                </form>
              </div>
            )}

            {activeTab === "planner" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Project Idea</label>
                  <textarea
                    placeholder="Describe your project idea (e.g., 'A fitness app with meal tracking and AI workouts')"
                    className="w-full h-24 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button onClick={runProjectPlanner} disabled={isPlanning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                    {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Project Plan"}
                  </Button>
                </div>

                {results?.milestones && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" /> Recommended Milestones
                    </h3>
                    {results.milestones.map((m: { title: string; tasks: { title: string; description: string }[] }, idx: number) => (
                      <Card key={idx} className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader className="p-4">
                          <CardTitle className="text-sm text-zinc-100">{m.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          {m.tasks.map((t: { title: string; description: string }, tIdx: number) => (
                            <div key={tIdx} className="p-2 bg-zinc-950 rounded border border-zinc-800">
                              <p className="text-xs font-medium text-zinc-300">{t.title}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{t.description}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "sprint" && (
              <div className="space-y-8">
                {/* Generate Sprint Plan */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-indigo-400" /> AI Sprint Auto Planning
                  </h3>
                  <textarea
                    placeholder="Describe your sprint goal (e.g. 'Build user auth with login and signup')..."
                    className="w-full h-20 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={sprintPrompt}
                    onChange={(e) => setSprintPrompt(e.target.value)}
                  />
                  <Button onClick={planSprint} disabled={isGeneratingSprint} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                    {isGeneratingSprint ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Sprint Plan"}
                  </Button>
                  {results?.createdSprintTasks && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-bold text-emerald-400">Created {results.createdSprintTasks.length} Tasks:</p>
                      {results.createdSprintTasks.map((t, i) => (
                        <div key={i} className="p-2 bg-zinc-950 rounded items-start border border-zinc-800">
                          <p className="text-xs font-medium text-zinc-300">{t.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{t.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-zinc-800/50" />

                {/* Generate Subtasks */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-emerald-400" /> Break Task into Subtasks
                  </h3>
                  <Input
                    placeholder="Task Title..."
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-10 rounded-lg"
                    value={subtaskTitle}
                    onChange={(e) => setSubtaskTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="Task Description (Optional)..."
                    className="w-full h-16 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={subtaskDesc}
                    onChange={(e) => setSubtaskDesc(e.target.value)}
                  />
                  <Button onClick={generateSubtasks} disabled={isGeneratingSubtasks} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm">
                    {isGeneratingSubtasks ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Subtasks"}
                  </Button>
                  {results?.subtasks && (
                    <div className="mt-3 space-y-2">
                      {results.subtasks.map((st, i) => (
                        <div key={i} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 shadow-sm flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-zinc-200">{st.title}</p>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{st.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <hr className="border-zinc-800/50" />

                {/* Summarize Task */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-400" /> Summarize Long Task
                  </h3>
                  <Input
                    placeholder="Task Title..."
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-10 rounded-lg"
                    value={summarizeTitle}
                    onChange={(e) => setSummarizeTitle(e.target.value)}
                  />
                  <textarea
                    placeholder="Paste long task description..."
                    className="w-full h-20 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={summarizeDesc}
                    onChange={(e) => setSummarizeDesc(e.target.value)}
                  />
                  <Button onClick={summarizeTask} disabled={isSummarizing} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm">
                    {isSummarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Summarize Description"}
                  </Button>
                  {results?.summary && (
                    <div className="mt-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <p className="text-xs text-indigo-200 leading-relaxed font-medium">"{results.summary}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={getProductivityInsights} disabled={isInsightsLoading} className="h-auto py-4 flex flex-col gap-2 border-zinc-800 hover:bg-zinc-900">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                    <span className="text-[10px] whitespace-normal text-center">Productivity Insights</span>
                  </Button>
                  <Button variant="outline" onClick={predictSprintProgress} disabled={isInsightsLoading} className="h-auto py-4 flex flex-col gap-2 border-zinc-800 hover:bg-zinc-900">
                    <Zap className="h-5 w-5 text-amber-400" />
                    <span className="text-[10px] whitespace-normal text-center">Sprint Prediction</span>
                  </Button>
                  <Button variant="outline" onClick={prioritizeTasks} disabled={isInsightsLoading} className="h-auto py-4 flex flex-col gap-2 border-zinc-800 hover:bg-zinc-900 col-span-2">
                    <ListChecks className="h-5 w-5 text-indigo-400" />
                    <span className="text-[10px] whitespace-normal text-center">Smart Prioritization</span>
                  </Button>
                </div>

                {isInsightsLoading && <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>}

                {results?.prioritized && !isInsightsLoading && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-300">Prioritization Recommendations</h3>
                    {results.prioritized.map((p: { title: string; priority: string; reason: string }, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-zinc-200">{p.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${p.priority === "CRITICAL" ? "bg-red-500/20 text-red-500" :
                            p.priority === "HIGH" ? "bg-amber-500/20 text-amber-500" : "bg-zinc-800 text-zinc-400"
                            }`}>{p.priority}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">"{p.reason}"</p>
                      </div>
                    ))}
                  </div>
                )}

                {results?.insights && !isInsightsLoading && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-300">Workspace Insights</h3>
                    {results.insights.map((ins: { title: string; description: string; type: "positive" | "warning" | "neutral" }, idx: number) => (
                      <div key={idx} className={`p-4 rounded-xl border ${ins.type === "positive" ? "bg-emerald-500/5 border-emerald-500/20" :
                        ins.type === "warning" ? "bg-amber-500/5 border-amber-500/20" : "bg-zinc-900 border-zinc-800"
                        }`}>
                        <p className={`text-xs font-bold ${ins.type === "positive" ? "text-emerald-400" :
                          ins.type === "warning" ? "text-amber-400" : "text-zinc-300"
                          }`}>{ins.title}</p>
                        <p className="text-xs text-zinc-500 mt-1">{ins.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {results?.probability !== undefined && !isInsightsLoading && (
                  <div className="space-y-4">
                    <div className="text-center p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Sprint Health Score</p>
                      <h4 className={`text-5xl font-black ${results.probability > 70 ? "text-emerald-500" : "text-amber-500"}`}>
                        {results.probability}%
                      </h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-400">AI Analysis</p>
                      <div className="p-4 bg-zinc-900/30 rounded-xl border border-zinc-800 text-xs text-zinc-500 leading-relaxed italic">
                        "{results.analysis}"
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "tools" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Smart Task Creation</label>
                  </div>
                  <textarea
                    placeholder="E.g. Build authentication system with login, signup and JWT security"
                    className="w-full h-28 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button onClick={generateTasksFromDesc} disabled={isPlanning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isPlanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Tasks"}
                  </Button>
                </div>

                <hr className="border-zinc-800/50" />

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-indigo-400" />
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Meeting Notes to Tasks</label>
                  </div>
                  <textarea
                    placeholder="Paste meeting transcript or notes here..."
                    className="w-full h-40 bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 text-sm focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-zinc-100 placeholder:text-zinc-600"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button onClick={parseMeetingNotes} disabled={isParsingNotes} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isParsingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extract Actions"}
                  </Button>
                </div>

                {results?.tasks && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-zinc-300">Extracted Actions</h3>
                    {results.tasks.map((t: { title: string; description: string; priority: string }, idx: number) => (
                      <div key={idx} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-start gap-4">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.priority === "HIGH" ? "bg-red-500" : t.priority === "MEDIUM" ? "bg-amber-500" : "bg-zinc-500"
                          }`} />
                        <div>
                          <p className="text-xs font-bold text-zinc-200">{t.title}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{t.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-zinc-800 bg-zinc-900/20 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-medium">Sprintify Groq AI Engine</span>
            </div>
            <div className="text-[10px] text-zinc-600 font-mono">Llama3-70b-8192</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
