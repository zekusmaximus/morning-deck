import { trpc } from "@/lib/trpc";
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
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery();

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

  const reviewProgress = stats?.todayReviewProgress 
    ? ((stats.todayReviewProgress.reviewed + stats.todayReviewProgress.flagged) / stats.todayReviewProgress.total) * 100
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
              onClick={() => setLocation("/tasks")}
            >
              <CheckSquare className="h-4 w-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Review Tasks</div>
                <div className="text-xs text-muted-foreground">Check pending and overdue tasks</div>
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
                Swipe through cards, mark as reviewed or skip, and stay on top of your relationships.
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
