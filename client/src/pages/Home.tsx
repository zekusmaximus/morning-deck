import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { getNyDateKey } from "@/lib/date";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Users,
  AlertTriangle,
  Sunrise,
  ArrowRight,
  Clock,
  Target,
  ChevronDown,
  Flame,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [tasksOpen, setTasksOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const todayKey = getNyDateKey();
      const [{ data: clients, error: clientsError }, { data: tasks, error: tasksError }] =
        await Promise.all([
          supabase.from("clients").select("id,name,status,priority,last_touched_at").eq("user_id", user!.id),
          supabase
            .from("client_tasks")
            .select("id,title,is_complete,due_date,client_id,clients(name)")
            .eq("user_id", user!.id)
            .eq("is_complete", false)
            .order("due_date", { ascending: true, nullsFirst: false }),
        ]);

      if (clientsError) throw clientsError;
      if (tasksError) throw tasksError;

      const activeClients = clients?.filter((client) => client.status === "active") ?? [];
      const inactiveClients = clients?.filter((client) => client.status === "inactive") ?? [];
      const prospectClients = clients?.filter((client) => client.status === "prospect") ?? [];
      const now = new Date();
      const needsAttention = activeClients.filter((client) => {
        if (!client.last_touched_at) return true;
        const diff = now.getTime() - new Date(client.last_touched_at).getTime();
        return diff >= 7 * 24 * 60 * 60 * 1000;
      });
      const overdueTasks =
        tasks?.filter(
          (task) =>
            task.due_date &&
            new Date(task.due_date).getTime() < now.getTime()
        ) ?? [];

      // Fetch last 60 days of runs with outcomes to compute today's progress + streak
      const { data: recentRuns } = await supabase
        .from("daily_runs")
        .select("id,run_date,daily_run_clients(outcome)")
        .eq("user_id", user!.id)
        .order("run_date", { ascending: false })
        .limit(60);

      let todayReviewProgress = null as
        | { reviewed: number; flagged: number; total: number }
        | null;

      const todayRun = recentRuns?.find((r) => r.run_date === todayKey);
      if (todayRun) {
        const items = todayRun.daily_run_clients as Array<{ outcome: string | null }>;
        const reviewed = items.filter((i) => i.outcome === "reviewed").length;
        const flagged = items.filter((i) => i.outcome === "flagged").length;
        todayReviewProgress = { reviewed, flagged, total: items.length };
      }

      // Compute consecutive-day streak (days where deck was fully completed)
      let streak = 0;
      const msPerDay = 86_400_000;
      const todayItems = todayRun?.daily_run_clients as Array<{ outcome: string | null }> | undefined;
      const todayComplete = !!(todayItems?.length && todayItems.every((i) => i.outcome));
      // Start from today if today is done, otherwise start checking from yesterday
      let checkDate = new Date(todayKey);
      if (!todayComplete) checkDate = new Date(checkDate.getTime() - msPerDay);
      for (const run of recentRuns ?? []) {
        if (run.run_date === todayKey && !todayComplete) continue; // skip incomplete today
        const runDate = new Date(run.run_date);
        if (runDate.getTime() !== checkDate.getTime()) break; // gap in dates
        const items = run.daily_run_clients as Array<{ outcome: string | null }>;
        if (!items.length || !items.every((i) => i.outcome)) break;
        streak++;
        checkDate = new Date(checkDate.getTime() - msPerDay);
      }

      return {
        activeClients: activeClients.length,
        inactiveClients: inactiveClients.length,
        prospectClients: prospectClients.length,
        needsAttention: needsAttention.length,
        needsContactList: needsAttention.map((c) => ({ id: c.id, name: c.name })),
        pendingTasks: tasks?.length ?? 0,
        overdueTasks: overdueTasks.length,
        todayReviewProgress,
        streak,
        taskList: tasks ?? [],
      };
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ is_complete: true })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Task completed");
    },
  });

  if (loading || isLoading) {
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

  if (!user) {
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

        <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
          <Card className="card-hover">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer select-none">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Tasks
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${tasksOpen ? "rotate-180" : ""}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingTasks ?? 0}</div>
              {(stats?.overdueTasks ?? 0) > 0 && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.overdueTasks} overdue
                </p>
              )}
              <CollapsibleContent>
                {(stats?.taskList?.length ?? 0) > 0 ? (
                  <ul className="mt-3 space-y-2 border-t pt-3">
                    {stats!.taskList.map((task) => {
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date();
                      const clientName = (task.clients as any)?.name;
                      return (
                        <li key={task.id} className="flex items-start gap-2 text-sm">
                          <Checkbox
                            className="mt-0.5"
                            checked={false}
                            onCheckedChange={() => completeTaskMutation.mutate(task.id)}
                            disabled={completeTaskMutation.isPending}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="block truncate">{task.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {clientName && <>{clientName} &middot; </>}
                              {task.due_date ? (
                                <span className={isOverdue ? "text-destructive font-medium" : ""}>
                                  {isOverdue ? "Overdue: " : "Due: "}
                                  {new Date(task.due_date).toLocaleDateString()}
                                </span>
                              ) : (
                                "No due date"
                              )}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">No pending tasks</p>
                )}
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        <Collapsible open={contactsOpen} onOpenChange={setContactsOpen}>
          <Card className="card-hover">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex flex-row items-center justify-between pb-2 cursor-pointer select-none">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Needs Contact
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${contactsOpen ? "rotate-180" : ""}`} />
              </CardHeader>
            </CollapsibleTrigger>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.needsAttention ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                no contact in 7+ days
              </p>
              <CollapsibleContent>
                {(stats?.needsContactList?.length ?? 0) > 0 ? (
                  <ul className="mt-3 space-y-2 border-t pt-3">
                    {stats!.needsContactList.map((client) => (
                      <li key={client.id} className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{client.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">All clients contacted recently</p>
                )}
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Review Streak
            </CardTitle>
            <Flame className={`h-4 w-4 ${(stats?.streak ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.streak ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(stats?.streak ?? 0) === 1 ? "day in a row" : "days in a row"}
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
                {stats?.todayReviewProgress ? "View Today's Review" : "Start Today's Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
