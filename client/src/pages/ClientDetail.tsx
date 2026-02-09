import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasReachedBulletCap } from "@/lib/bullets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import { ensureSafeUrl } from "@/lib/safe-url";
import { trpc } from "@/_core/trpc";

const emptyContact = { name: "", role: "", email: "", phone: "" };
const emptyTask = { title: "", dueDate: "", showInDeck: true };
const emptyNote = { body: "" };
const emptyLink = { label: "", url: "" };

type ClientDetailProps = {
  id: string;
};

export default function ClientDetail({ id }: ClientDetailProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [newContact, setNewContact] = useState(emptyContact);
  const [newTask, setNewTask] = useState(emptyTask);
  const [newNote, setNewNote] = useState(emptyNote);
  const [newBill, setNewBill] = useState(emptyLink);
  const [newDoc, setNewDoc] = useState(emptyLink);
  const [newBullet, setNewBullet] = useState("");

  const { data: client, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["client-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["client-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bullets } = useQuery({
    queryKey: ["client-bullets", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_bullets")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bills } = useQuery({
    queryKey: ["client-bills", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_bill_links")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["client-docs", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_doc_links")
        .select("*")
        .eq("client_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("clients")
        .update({
          name: editData.name,
          status: editData.status,
          priority: editData.priority,
          industry: editData.industry || null,
          health_score: editData.health_score,
          today_signal: editData.today_signal || null,
          last_touched_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client", id] });
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      setIsEditing(false);
      toast.success("Client updated successfully");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteClientMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setLocation("/clients");
      toast.success("Client deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_contacts").insert({
        user_id: user.id,
        client_id: id,
        name: newContact.name,
        role: newContact.role || null,
        email: newContact.email || null,
        phone: newContact.phone || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-contacts", id] });
      setNewContact(emptyContact);
      toast.success("Contact added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("client_contacts")
        .delete()
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-contacts", id] }),
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_notes").insert({
        user_id: user.id,
        client_id: id,
        body: newNote.body,
      });
      if (error) throw error;
      await supabase
        .from("clients")
        .update({ last_touched_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-notes", id] });
      await queryClient.invalidateQueries({ queryKey: ["client", id] });
      setNewNote(emptyNote);
      toast.success("Note added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-notes", id] }),
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_tasks").insert({
        user_id: user.id,
        client_id: id,
        title: newTask.title,
        due_date: newTask.dueDate || null,
        show_in_deck: newTask.showInDeck,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-tasks", id] });
      setNewTask(emptyTask);
      toast.success("Task added");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (task: { id: string; is_complete: boolean; show_in_deck: boolean }) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({
          is_complete: task.is_complete,
          show_in_deck: task.show_in_deck,
        })
        .eq("id", task.id);
      if (error) throw error;
      await supabase
        .from("clients")
        .update({ last_touched_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-tasks", id] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("client_tasks").delete().eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-tasks", id] }),
  });

  const createBulletMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_bullets").insert({
        user_id: user.id,
        client_id: id,
        body: newBullet,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-bullets", id] });
      setNewBullet("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteBulletMutation = useMutation({
    mutationFn: async (bulletId: string) => {
      const { error } = await supabase
        .from("client_bullets")
        .delete()
        .eq("id", bulletId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-bullets", id] }),
  });

  const createBillMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_bill_links").insert({
        user_id: user.id,
        client_id: id,
        label: newBill.label,
        url: newBill.url,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-bills", id] });
      setNewBill(emptyLink);
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.from("client_bill_links").delete().eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-bills", id] }),
  });

  const createDocMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in.");
      const { error } = await supabase.from("client_doc_links").insert({
        user_id: user.id,
        client_id: id,
        label: newDoc.label,
        url: newDoc.url,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client-docs", id] });
      setNewDoc(emptyLink);
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("client_doc_links").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-docs", id] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Client not found</h2>
        <Button variant="link" onClick={() => setLocation("/clients")}>Back to clients</Button>
      </div>
    );
  }

  const startEditing = () => {
    setEditData({
      name: client.name,
      status: client.status,
      priority: client.priority,
      industry: client.industry ?? "",
      health_score: client.health_score ?? 50,
      today_signal: client.today_signal ?? "",
    });
    setIsEditing(true);
  };

  const bulletCapReached = hasReachedBulletCap(bullets?.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")}> 
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`status-${client.status}`}>
              {client.status}
            </Badge>
            <Badge variant="secondary" className={`priority-${client.priority}`}>
              {client.priority}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={() => updateClientMutation.mutate()} disabled={updateClientMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={startEditing}>Edit</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {client.name} and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteClientMutation.mutate({ id: parseInt(id) })}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="bullets">Bullets ({bullets?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({contacts?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({bills?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="docs">Documents ({documents?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input
                      value={editData.name}
                      onChange={(event) => setEditData({ ...editData, name: event.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) => setEditData({ ...editData, status: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                        value={editData.priority}
                        onValueChange={(value) => setEditData({ ...editData, priority: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Industry</Label>
                    <Input
                      value={editData.industry}
                      onChange={(event) => setEditData({ ...editData, industry: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Today signal</Label>
                    <Textarea
                      value={editData.today_signal}
                      onChange={(event) => setEditData({ ...editData, today_signal: event.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Health Score ({editData.health_score})</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editData.health_score}
                      onChange={(event) =>
                        setEditData({ ...editData, health_score: parseInt(event.target.value, 10) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{client.industry || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Health Score</p>
                      <p className="font-medium">{client.health_score ?? 50}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Today signal</p>
                    <p className="whitespace-pre-wrap">{client.today_signal || "—"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bullets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key bullets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newBullet}
                  onChange={(event) => setNewBullet(event.target.value)}
                  placeholder="Add a bullet"
                  disabled={bulletCapReached}
                />
                <Button
                  onClick={() => createBulletMutation.mutate()}
                  disabled={!newBullet.trim() || bulletCapReached}
                >
                  Add
                </Button>
              </div>
              {bulletCapReached && (
                <p className="text-xs text-muted-foreground">
                  Bullet cap reached (5 max).
                </p>
              )}
              <div className="space-y-2">
                {bullets?.map((bullet) => (
                  <div key={bullet.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <span>{bullet.body}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteBulletMutation.mutate(bullet.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {bullets?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No bullets yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[2fr,1fr,auto]">
                <Input
                  value={newTask.title}
                  onChange={(event) => setNewTask({ ...newTask, title: event.target.value })}
                  placeholder="Task title"
                />
                <Input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })}
                />
                <Button onClick={() => createTaskMutation.mutate()} disabled={!newTask.title.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-in-deck"
                  checked={newTask.showInDeck}
                  onCheckedChange={(checked) => setNewTask({ ...newTask, showInDeck: !!checked })}
                />
                <Label htmlFor="show-in-deck">Show in Morning Deck</Label>
              </div>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {tasks?.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={task.is_complete}
                          onCheckedChange={(checked) =>
                            updateTaskMutation.mutate({
                              id: task.id,
                              is_complete: !!checked,
                              show_in_deck: task.show_in_deck,
                            })
                          }
                        />
                        <div>
                          <p className={task.is_complete ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </p>
                          {task.due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due {new Date(task.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={task.show_in_deck}
                          onCheckedChange={(checked) =>
                            updateTaskMutation.mutate({
                              id: task.id,
                              is_complete: task.is_complete,
                              show_in_deck: !!checked,
                            })
                          }
                        />
                        <Button variant="ghost" size="sm" onClick={() => deleteTaskMutation.mutate(task.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {tasks?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No tasks yet.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={newNote.body}
                onChange={(event) => setNewNote({ body: event.target.value })}
                rows={3}
                placeholder="Write a note..."
              />
              <Button onClick={() => createNoteMutation.mutate()} disabled={!newNote.body.trim()}>
                Add note
              </Button>
              <div className="space-y-2">
                {notes?.map((note) => (
                  <div key={note.id} className="rounded-md border p-3 space-y-2">
                    <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      <Button variant="ghost" size="sm" onClick={() => deleteNoteMutation.mutate(note.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {notes?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={newContact.name}
                  onChange={(event) => setNewContact({ ...newContact, name: event.target.value })}
                  placeholder="Name"
                />
                <Input
                  value={newContact.role}
                  onChange={(event) => setNewContact({ ...newContact, role: event.target.value })}
                  placeholder="Role"
                />
                <Input
                  type="email"
                  value={newContact.email}
                  onChange={(event) => setNewContact({ ...newContact, email: event.target.value })}
                  placeholder="Email"
                />
                <Input
                  value={newContact.phone}
                  onChange={(event) => setNewContact({ ...newContact, phone: event.target.value })}
                  placeholder="Phone"
                />
              </div>
              <Button onClick={() => createContactMutation.mutate()} disabled={!newContact.name.trim()}>
                Add contact
              </Button>
              <div className="space-y-2">
                {contacts?.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {contact.role || "Role"} · {contact.email || "No email"} · {contact.phone || "No phone"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteContactMutation.mutate(contact.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {contacts?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No contacts yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bill links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[2fr,2fr,auto]">
                <Input
                  value={newBill.label}
                  onChange={(event) => setNewBill({ ...newBill, label: event.target.value })}
                  placeholder="Label"
                />
                <Input
                  value={newBill.url}
                  onChange={(event) => setNewBill({ ...newBill, url: event.target.value })}
                  placeholder="https://"
                />
                <Button onClick={() => createBillMutation.mutate()} disabled={!newBill.label || !newBill.url}>
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {bills?.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <a href={ensureSafeUrl(bill.url)} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
                      {bill.label}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => deleteBillMutation.mutate(bill.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {bills?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No bill links yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-[2fr,2fr,auto]">
                <Input
                  value={newDoc.label}
                  onChange={(event) => setNewDoc({ ...newDoc, label: event.target.value })}
                  placeholder="Label"
                />
                <Input
                  value={newDoc.url}
                  onChange={(event) => setNewDoc({ ...newDoc, url: event.target.value })}
                  placeholder="https://"
                />
                <Button onClick={() => createDocMutation.mutate()} disabled={!newDoc.label || !newDoc.url}>
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {documents?.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <a href={ensureSafeUrl(doc.url)} className="text-sm text-primary underline" target="_blank" rel="noreferrer">
                      {doc.label}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => deleteDocMutation.mutate(doc.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                {documents?.length === 0 && (
                  <p className="text-sm text-muted-foreground">No documents yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
