import { Card, CardContent } from "../ui/card";

interface InsightsMetricsProps {
    stats: {
        todo: number;
        inProgress: number;
        done: number;
        total: number;
    }
}

export default function InsightsMetricsCard({ stats }: InsightsMetricsProps) {
    return (
        <Card className="bg-zinc-900/40 border-zinc-800/60 rounded-[2rem] p-4 text-center h-full flex flex-col justify-center min-h-[300px]">
            <CardContent className="pt-6">
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-indigo-500/20 border-t-indigo-600 relative mb-4 shadow-[0_0_20px_rgba(79,70,229,0.1)] mx-auto">
                    <span className="text-3xl font-black text-white">
                        {stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0}%
                    </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2">
                    {stats.total > 0 ? (stats.done / stats.total > 0.7 ? "Excellent Progress" : "Moving Ahead") : "No Data Yet"}
                </h4>
                <p className="text-xs text-zinc-500 px-4">
                    {stats.total > 0
                        ? `${stats.done} of ${stats.total} total tasks completed in this workspace.`
                        : "Create tasks to see your productivity insights here."}
                </p>
            </CardContent>
        </Card>
    );
}
