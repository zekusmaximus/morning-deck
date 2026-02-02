import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity as ActivityIcon,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  SkipForward,
  Eye,
  User
} from "lucide-react";
import { useLocation } from "wouter";

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="h-4 w-4 text-green-500" />,
  updated: <Pencil className="h-4 w-4 text-blue-500" />,
  deleted: <Trash2 className="h-4 w-4 text-red-500" />,
  reviewed: <Eye className="h-4 w-4 text-primary" />,
  skipped: <SkipForward className="h-4 w-4 text-yellow-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
};

const entityLabels: Record<string, string> = {
  client: "Client",
  contact: "Contact",
  note: "Note",
  task: "Task",
  tag: "Tag",
  review: "Review",
};

export default function Activity() {
  const [, setLocation] = useLocation();
  const { data: activities, isLoading } = trpc.activity.list.useQuery({ limit: 100 });
  const { data: clients } = trpc.clients.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const getClientName = (clientId: number | null) => {
    if (!clientId) return null;
    return clients?.find(c => c.id === clientId)?.name;
  };

  const formatDetails = (details: string | null) => {
    if (!details) return null;
    try {
      const parsed = JSON.parse(details);
      if (parsed.name) return `"${parsed.name}"`;
      if (parsed.title) return `"${parsed.title}"`;
      if (parsed.note) return `Note: "${parsed.note.substring(0, 50)}${parsed.note.length > 50 ? '...' : ''}"`;
      return null;
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">
          Recent activity across your account
        </p>
      </div>

      {/* Activity List */}
      {activities?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <ActivityIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No activity yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your recent actions will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-2 pr-4">
            {activities?.map(activity => {
              const clientName = getClientName(activity.clientId);
              const details = formatDetails(activity.details);
              
              return (
                <Card key={activity.id} className="transition-colors hover:bg-muted/50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {actionIcons[activity.action] || <ActivityIcon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="capitalize">
                          {activity.action}
                        </Badge>
                        <span className="text-sm">
                          {entityLabels[activity.entityType] || activity.entityType}
                        </span>
                        {details && (
                          <span className="text-sm text-muted-foreground truncate">
                            {details}
                          </span>
                        )}
                      </div>
                      {clientName && (
                        <button
                          onClick={() => setLocation(`/clients/${activity.clientId}`)}
                          className="text-xs text-primary flex items-center gap-1 hover:underline mt-1"
                        >
                          <User className="h-3 w-3" />
                          {clientName}
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
