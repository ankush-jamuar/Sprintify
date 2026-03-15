import { Zap } from "lucide-react";
import { cn } from "../../lib/utils";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../stores/useAuthStore";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function Logo({ iconOnly = false, className }: LogoProps) {
  const { user } = useAuthStore();

  return (
    <Link to={user ? "/dashboard" : "/"} className={cn("flex items-center gap-2 font-black tracking-tighter hover:opacity-90 transition-opacity", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20">
        <Zap className="h-5 w-5 text-white fill-white/20" />
        <div className="absolute inset-0 rounded-lg border border-white/20" />
      </div>
      {!iconOnly && (
        <span className="text-xl tracking-tight text-zinc-900 dark:text-zinc-100">
          Sprint<span className="text-indigo-500 font-extrabold">ify</span>
        </span>
      )}
    </Link>
  );
}
