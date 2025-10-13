import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, CheckCircle2, Database, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  userId: string;
}

export const StatsCards = ({ userId }: StatsCardsProps) => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    completedJobs: 0,
    totalDataPoints: 0,
    activeJobs: 0,
    pendingJobs: 0,
    runningJobs: 0,
    failedJobs: 0,
    totalPagesScraped: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Use the optimized database function for job stats
        const { data: jobStats, error: jobStatsError } = await supabase
          .rpc('get_user_job_stats', { user_uuid: userId });

        if (jobStatsError) {
          console.error('Error fetching job stats:', jobStatsError);
          return;
        }

        // Get data count separately for now (could be optimized further)
        const { count: dataCount } = await supabase
          .from("scraped_data")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId);

        if (jobStats && jobStats.length > 0) {
          const stats = jobStats[0];
          setStats({
            totalJobs: Number(stats.total_jobs) || 0,
            completedJobs: Number(stats.completed_jobs) || 0,
            totalDataPoints: dataCount || 0,
            activeJobs: Number(stats.pending_jobs || 0) + Number(stats.running_jobs || 0),
            pendingJobs: Number(stats.pending_jobs) || 0,
            runningJobs: Number(stats.running_jobs) || 0,
            failedJobs: Number(stats.failed_jobs) || 0,
            totalPagesScraped: Number(stats.total_pages_scraped) || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    const channel = supabase
      .channel("stats-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraping_jobs", filter: `user_id=eq.${userId}` },
        () => fetchStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scraped_data", filter: `user_id=eq.${userId}` },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const statCards = [
    { title: "Total Jobs", value: stats.totalJobs, icon: Briefcase, color: "text-primary" },
    { title: "Completed", value: stats.completedJobs, icon: CheckCircle2, color: "text-green-600" },
    { title: "Data Points", value: stats.totalDataPoints, icon: Database, color: "text-blue-600" },
    { title: "Pages Scraped", value: stats.totalPagesScraped, icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title} className="backdrop-blur-sm bg-card/50 border-border/50 transition-all hover:shadow-lg hover:shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
