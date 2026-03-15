import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import ActivityTimeline from "../ActivityTimeline";
import { useNavigate } from "react-router-dom";

export default function RecentActivityWidget() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between ml-1 shrink-0 mt-2">
                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Recent Activity</h4>
                <Button
                    variant="link"
                    onClick={() => navigate("/recent-activity")}
                    className="h-auto p-0 text-[10px] font-black text-indigo-500 hover:text-indigo-400 uppercase tracking-widest"
                >
                    View All
                </Button>
            </div>
            <Card className="bg-zinc-900/40 border-zinc-800 rounded-2xl overflow-hidden flex-1 flex flex-col min-h-[320px] max-h-[320px] hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                    <ActivityTimeline limit={4} hideHeader={true} />
                </CardContent>
            </Card>
        </div>
    );
}
