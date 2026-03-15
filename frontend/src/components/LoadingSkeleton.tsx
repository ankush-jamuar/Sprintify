import React from "react";
import { cn } from "../lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-800/50", className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 w-full">
      <div className="flex justify-between items-start">
        <Skeleton className="h-5 w-1/3 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-12 rounded-md" />
        <Skeleton className="h-6 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-[320px] shrink-0 p-3 rounded-2xl bg-zinc-900/10 border border-zinc-800/30 h-full">
      <Skeleton className="h-6 w-24 rounded-lg ml-2" />
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/50">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}
