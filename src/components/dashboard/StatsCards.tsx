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
  });

  useEffect(() => {
    const fetchStats = async () => {
      const { data: jobs } = await supabase
        .from("scraping_jobs")
        .select("*")
        .eq("user_id", userId);

      const { count: dataCount } = await supabase
        .from("scraped_data")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (jobs) {
        setStats({
          totalJobs: jobs.length,
          completedJobs: jobs.filter((j) => j.status === "completed").length,
          totalDataPoints: dataCount || 0,
          activeJobs: jobs.filter((j) => j.status === "running" || j.status === "pending").length,
        });
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
    { title: "Completed", value: stats.completedJobs, icon: CheckCircle2, color: "text-accent" },
    { title: "Data Points", value: stats.totalDataPoints, icon: Database, color: "text-primary" },
    { title: "Active Jobs", value: stats.activeJobs, icon: TrendingUp, color: "text-accent" },
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
