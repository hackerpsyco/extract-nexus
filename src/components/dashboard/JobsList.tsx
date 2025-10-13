import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Trash2, RefreshCw, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useJobProcessor } from "@/hooks/useJobProcessor";

interface Job {
  id: string;
  url: string;
  status: string;
  scraped_pages: number;
  total_pages: number;
  created_at: string;
  error_message: string | null;
}

interface JobsListProps {
  userId: string;
}

export const JobsList = ({ userId }: JobsListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { toast } = useToast();
  const { processJobs, checkPendingJobs, isProcessing } = useJobProcessor();

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("scraping_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast({ title: "Error loading jobs", description: error.message, variant: "destructive" });
    } else {
      setJobs(data || []);
    }
    setIsLoading(false);

    // Check pending jobs count
    const pendingJobs = await checkPendingJobs();
    setPendingCount(pendingJobs);
  };

  useEffect(() => {
    fetchJobs();

    const channel = supabase
      .channel("jobs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraping_jobs", filter: `user_id=eq.${userId}` },
        () => fetchJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleDelete = async (jobId: string) => {
    const { error } = await supabase.from("scraping_jobs").delete().eq("id", jobId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Job deleted successfully" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      running: "default",
      completed: "outline",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Recent Jobs
            </CardTitle>
            <CardDescription>
              Track your scraping jobs in real-time
              {pendingCount > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  ({pendingCount} pending)
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => processJobs().catch(console.error)}
                disabled={isProcessing}
              >
                <Play className="w-4 h-4 mr-1" />
                Process
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={fetchJobs}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No jobs yet. Start by submitting a URL above!
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.url}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(job.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </span>
                    {job.total_pages > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {job.scraped_pages}/{job.total_pages} pages
                      </span>
                    )}
                  </div>
                  {job.error_message && (
                    <p className="text-xs text-destructive mt-1">{job.error_message}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(job.id)}
                  className="ml-2"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
