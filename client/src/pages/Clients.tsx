import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Users,
  Building2,
  ArrowRight,
  Filter
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Clients() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    status: "active" as "active" | "inactive" | "prospect",
    priority: "medium" as "high" | "medium" | "low",
    industry: "",
    healthScore: 50,
  });

  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("clients").insert({
        user_id: user.id,
        name: newClient.name,
        status: newClient.status,
        priority: newClient.priority,
        industry: newClient.industry || null,
        health_score: newClient.healthScore,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setIsCreateOpen(false);
      setNewClient({
        name: "",
        status: "active",
        priority: "medium",
        industry: "",
        healthScore: 50,
      });
      toast.success("Client created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newClient.name.trim()) {
      toast.error("Client name is required");
      return;
    }
    createMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "status-active",
      inactive: "status-inactive",
      prospect: "status-prospect",
    };
    return <Badge variant="secondary" className={styles[status]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return <Badge variant="secondary" className={styles[priority]}>{priority}</Badge>;
  };

  const getHealthColor = (score: number | null) => {
    if (!score) return "health-fair";
    if (score >= 70) return "health-good";
    if (score >= 40) return "health-fair";
    return "health-poor";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client portfolio
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client to track in your portfolio.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Client name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select
                    value={newClient.status}
                    onValueChange={(v) => setNewClient({ ...newClient, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priority</Label>
                  <Select
                    value={newClient.priority}
                    onValueChange={(v) => setNewClient({ ...newClient, priority: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={newClient.industry}
                  onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                  placeholder="e.g., Technology, Healthcare"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="health">Health Score ({newClient.healthScore})</Label>
                <input
                  type="range"
                  id="health"
                  min="0"
                  max="100"
                  value={newClient.healthScore}
                  onChange={(e) => setNewClient({ ...newClient, healthScore: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Grid */}
      {filteredClients?.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No clients found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Try adjusting your search" : "Add your first client to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredClients?.map((client) => (
            <Card 
              key={client.id} 
              className="card-hover cursor-pointer group"
              onClick={() => setLocation(`/clients/${client.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                      {client.name}
                    </h3>
                    {client.industry && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{client.industry}</span>
                      </div>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  {getStatusBadge(client.status)}
                  {getPriorityBadge(client.priority)}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Health Score</span>
                    <span>{client.health_score ?? 50}%</span>
                  </div>
                  <div className="health-bar">
                    <div 
                      className={`health-bar-fill ${getHealthColor(client.health_score)}`}
                      style={{ width: `${client.health_score ?? 50}%` }}
                    />
                  </div>
                </div>

                {client.lastContactAt && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Last contact: {new Date(client.lastContactAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
