import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, Clock, Zap, TrendingUp } from "lucide-react";

interface PerformanceMonitorProps {
  userId: string;
}

interface PerformanceMetrics {
  averageProcessingTime: number;
  successRate: number;
  pagesPerJob: number;
  activeJobs: number;
  recentJobsCount: number;
}

export const PerformanceMonitor = ({ userId }: PerformanceMonitorProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageProcessingTime: 0,
    successRate: 0,
    pagesPerJob: 0,
    activeJobs: 0,
    recentJobsCount: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Get jobs from last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: recentJobs } = await supabase
          .from("scraping_jobs")
          .select("*")
          .eq("user_id", userId)
          .gte("created_at", twentyFourHoursAgo);

        if (recentJobs) {
          const completedJobs = recentJobs.filter(job => job.status === 'completed' && job.completed_at);
          const failedJobs = recentJobs.filter(job => job.status === 'failed');
          const activeJobs = recentJobs.filter(job => job.status === 'running' || job.status === 'pending');

          // Calculate average processing time for completed jobs
          const avgProcessingTime = completedJobs.length > 0 
            ? completedJobs.reduce((acc, job) => {
                const start = new Date(job.created_at).getTime();
                const end = new Date(job.completed_at).getTime();
                return acc + (end - start);
              }, 0) / completedJobs.length / 1000 / 60 // Convert to minutes
            : 0;

          // Calculate success rate
          const totalFinishedJobs = completedJobs.length + failedJobs.length;
          const successRate = totalFinishedJobs > 0 
            ? (completedJobs.length / totalFinishedJobs) * 100 
            : 100;

          // Calculate average pages per job
          const totalPages = completedJobs.reduce((acc, job) => acc + (job.scraped_pages || 0), 0);
          const avgPagesPerJob = completedJobs.length > 0 
            ? totalPages / completedJobs.length 
            : 0;

          setMetrics({
            averageProcessingTime: Math.round(avgProcessingTime * 10) / 10,
            successRate: Math.round(successRate * 10) / 10,
            pagesPerJob: Math.round(avgPagesPerJob * 10) / 10,
            activeJobs: activeJobs.length,
            recentJobsCount: recentJobs.length,
          });
        }
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
      }
    };

    fetchMetrics();

    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);

    // Listen for job changes
    const channel = supabase
      .channel("performance-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraping_jobs", filter: `user_id=eq.${userId}` },
        () => fetchMetrics()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getProcessingTimeColor = (time: number) => {
    if (time <= 2) return "text-green-600";
    if (time <= 5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Performance Monitor
        </CardTitle>
        <CardDescription>
          Real-time scraping performance metrics (last 24 hours)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Success Rate</span>
              <span className={`text-sm font-bold ${getSuccessRateColor(metrics.successRate)}`}>
                {metrics.successRate}%
              </span>
            </div>
            <Progress value={metrics.successRate} className="h-2" />
          </div>

          {/* Processing Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Avg Processing Time</span>
              <span className={`text-sm font-bold ${getProcessingTimeColor(metrics.averageProcessingTime)}`}>
                {metrics.averageProcessingTime}m
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {metrics.averageProcessingTime <= 2 ? "Excellent" : 
                 metrics.averageProcessingTime <= 5 ? "Good" : "Needs optimization"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pages per Job */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30">
            <Zap className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Avg Pages/Job</p>
              <p className="text-lg font-bold">{metrics.pagesPerJob}</p>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card/30">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium">Active Jobs</p>
              <p className="text-lg font-bold">{metrics.activeJobs}</p>
            </div>
          </div>
        </div>

        {metrics.recentJobsCount > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Based on {metrics.recentJobsCount} jobs in the last 24 hours
          </div>
        )}
      </CardContent>
    </Card>
  );
};