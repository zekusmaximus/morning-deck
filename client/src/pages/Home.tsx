import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { getNyDateKey } from "@/lib/date";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  CheckSquare, 
  AlertTriangle, 
  TrendingUp,
  Sunrise,
  ArrowRight,
  Clock,
  Target
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    enabled: !!user,
    queryFn: async () => {
      const todayKey = getNyDateKey();
      const [{ data: clients, error: clientsError }, { data: tasks, error: tasksError }] =
        await Promise.all([
          supabase.from("clients").select("id,status,priority,last_touched_at"),
          supabase
            .from("client_tasks")
            .select("id,is_complete,due_date")
            .eq("is_complete", false),
        ]);

      if (clientsError) throw clientsError;
      if (tasksError) throw tasksError;

      const activeClients = clients?.filter((client) => client.status === "active") ?? [];
      const inactiveClients = clients?.filter((client) => client.status === "inactive") ?? [];
      const prospectClients = clients?.filter((client) => client.status === "prospect") ?? [];
      const highPriorityClients =
        clients?.filter((client) => client.priority === "high") ?? [];
      const now = new Date();
      const needsAttention =
        clients?.filter((client) => {
          if (!client.last_touched_at) return false;
          const diff =
            now.getTime() - new Date(client.last_touched_at).getTime();
          return diff >= 7 * 24 * 60 * 60 * 1000;
        }) ?? [];
      const overdueTasks =
        tasks?.filter(
          (task) =>
            task.due_date &&
            new Date(task.due_date).getTime() < now.getTime()
        ) ?? [];

      const { data: dailyRun } = await supabase
        .from("daily_runs")
        .select("id")
        .eq("run_date", todayKey)
        .maybeSingle();

      let todayReviewProgress = null as
        | { reviewed: number; flagged: number; total: number }
        | null;

      if (dailyRun?.id) {
        const { data: dailyRunClients } = await supabase
          .from("daily_run_clients")
          .select("outcome")
          .eq("daily_run_id", dailyRun.id);

        const reviewed =
          dailyRunClients?.filter((item) => item.outcome === "reviewed")
            .length ?? 0;
        const flagged =
          dailyRunClients?.filter((item) => item.outcome === "flagged").length ??
          0;
        const total = dailyRunClients?.length ?? 0;
        todayReviewProgress = { reviewed, flagged, total };
      }

      return {
        activeClients: activeClients.length,
        inactiveClients: inactiveClients.length,
        prospectClients: prospectClients.length,
        highPriorityClients: highPriorityClients.length,
        needsAttention: needsAttention.length,
        pendingTasks: tasks?.length ?? 0,
        overdueTasks: overdueTasks.length,
        todayReviewProgress,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Morning Deck</h1>
        <p className="text-muted-foreground max-w-md">
          Sign in to review your clients and start today&#39;s deck.
        </p>
        <Button onClick={() => setLocation("/login")}>Go to login</Button>
      </div>
    );
  }

  const reviewProgress = stats?.todayReviewProgress?.total
    ? ((stats.todayReviewProgress.reviewed + stats.todayReviewProgress.flagged) /
        stats.todayReviewProgress.total) *
      100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back. Here's your client overview.
          </p>
        </div>
        <Button 
          onClick={() => setLocation("/morning")}
          className="gap-2"
          size="lg"
        >
          <Sunrise className="h-4 w-4" />
          Start Morning Deck
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Today's Review Progress */}
      {stats?.todayReviewProgress && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Today's Review Progress
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {stats.todayReviewProgress.reviewed + stats.todayReviewProgress.flagged} / {stats.todayReviewProgress.total}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={reviewProgress} className="h-2" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{stats.todayReviewProgress.reviewed} reviewed</span>
              <span>{stats.todayReviewProgress.flagged} flagged</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeClients ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.prospectClients ?? 0} prospects, {stats?.inactiveClients ?? 0} inactive
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Tasks
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingTasks ?? 0}</div>
            {(stats?.overdueTasks ?? 0) > 0 && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stats?.overdueTasks} overdue
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Priority
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.highPriorityClients ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              clients need attention
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Contact
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.needsAttention ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              no contact in 7+ days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant="outline" 
              className="justify-start h-auto py-3"
              onClick={() => setLocation("/clients")}
            >
              <Users className="h-4 w-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">View All Clients</div>
                <div className="text-xs text-muted-foreground">Manage your client portfolio</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => setLocation("/morning")}
            >
              <Sunrise className="h-4 w-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Review Morning Deck</div>
                <div className="text-xs text-muted-foreground">
                  Start today&#39;s client ritual
                </div>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Morning Deck</CardTitle>
            <CardDescription>Your daily client review ritual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The Morning Deck helps you maintain discipline by reviewing every active client daily. 
                Swipe through cards, mark as reviewed or flagged, and stay on top of your relationships.
              </p>
              <Button 
                onClick={() => setLocation("/morning")}
                className="w-full gap-2"
              >
                <Sunrise className="h-4 w-4" />
                {stats?.todayReviewCompleted ? "View Today's Review" : "Start Today's Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
