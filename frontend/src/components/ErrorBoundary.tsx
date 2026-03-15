import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-indigo-500/30">
          <div className="max-w-md w-full p-8 rounded-[2rem] bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden text-center space-y-6">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <AlertTriangle className="h-48 w-48 text-red-500" />
             </div>
             <div className="relative z-10 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                   <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <div>
                   <h1 className="text-2xl font-black text-white tracking-tighter">Something went wrong</h1>
                   <p className="text-sm text-zinc-400 mt-2 font-medium">
                     An unexpected error occurred in the application. Let's get you back on track.
                   </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left overflow-auto max-h-32 custom-scrollbar">
                   <span className="text-xs font-mono text-red-400/80">
                      {this.state.error?.message || "Unknown rendering error"}
                   </span>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                   <Button onClick={() => window.location.reload()} className="h-12 w-full bg-indigo-600 hover:bg-indigo-700 font-bold gap-2">
                     <RefreshCw className="h-4 w-4" />
                     Reload Application
                   </Button>
                   <Button onClick={() => window.location.href = "/"} variant="outline" className="h-12 w-full border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 gap-2">
                     <Home className="h-4 w-4" />
                     Go to Dashboard
                   </Button>
                </div>
             </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
