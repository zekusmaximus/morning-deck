import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Plus,
  User,
  FileText,
  CheckSquare,
  Tag,
  Phone,
  Mail,
  Pin,
  Calendar
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: client, isLoading } = trpc.clients.get.useQuery({ id: clientId });
  const { data: contacts } = trpc.contact.list.useQuery({ clientId });
  const { data: notes } = trpc.note.list.useQuery({ clientId });
  const { data: tasks } = trpc.task.list.useQuery({ clientId });
  const { data: clientTags } = trpc.clients.getTags.useQuery({ clientId });
  const { data: allTags } = trpc.tag.list.useQuery();

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.get.invalidate({ id: clientId });
      utils.clients.list.invalidate();
      setIsEditing(false);
      toast.success("Client updated successfully");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setLocation("/clients");
      toast.success("Client deleted");
    },
    onError: (error) => toast.error(error.message),
  });

  // Contact mutations
  const [newContact, setNewContact] = useState({ name: "", role: "", email: "", phone: "", isPrimary: false });
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  
  const createContactMutation = trpc.contact.create.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ clientId });
      setIsContactDialogOpen(false);
      setNewContact({ name: "", role: "", email: "", phone: "", isPrimary: false });
      toast.success("Contact added");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteContactMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate({ clientId });
      toast.success("Contact deleted");
    },
  });

  // Note mutations
  const [newNote, setNewNote] = useState({ title: "", content: "" });
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);

  const createNoteMutation = trpc.note.create.useMutation({
    onSuccess: () => {
      utils.note.list.invalidate({ clientId });
      utils.clients.get.invalidate({ id: clientId });
      setIsNoteDialogOpen(false);
      setNewNote({ title: "", content: "" });
      toast.success("Note added");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteNoteMutation = trpc.note.delete.useMutation({
    onSuccess: () => {
      utils.note.list.invalidate({ clientId });
      toast.success("Note deleted");
    },
  });

  const togglePinMutation = trpc.note.update.useMutation({
    onSuccess: () => utils.note.list.invalidate({ clientId }),
  });

  // Task mutations
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" as const, dueDate: "" });
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const createTaskMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ clientId });
      setIsTaskDialogOpen(false);
      setNewTask({ title: "", description: "", priority: "medium", dueDate: "" });
      toast.success("Task added");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => utils.task.list.invalidate({ clientId }),
  });

  const deleteTaskMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ clientId });
      toast.success("Task deleted");
    },
  });

  // Tag mutations
  const addTagMutation = trpc.clients.addTag.useMutation({
    onSuccess: () => utils.clients.getTags.invalidate({ clientId }),
  });

  const removeTagMutation = trpc.clients.removeTag.useMutation({
    onSuccess: () => utils.clients.getTags.invalidate({ clientId }),
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
        <Button variant="link" onClick={() => setLocation("/clients")}>
          Back to clients
        </Button>
      </div>
    );
  }

  const handleSave = () => {
    if (editData) {
      updateMutation.mutate({ id: clientId, ...editData });
    }
  };

  const startEditing = () => {
    setEditData({
      name: client.name,
      status: client.status,
      priority: client.priority,
      industry: client.industry || "",
      healthScore: client.healthScore || 50,
      notes: client.notes || "",
    });
    setIsEditing(true);
  };

  const availableTags = allTags?.filter(
    tag => !clientTags?.some(ct => ct.tagId === tag.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
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
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
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
                      onClick={() => deleteMutation.mutate({ id: clientId })}
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
          <TabsTrigger value="contacts">Contacts ({contacts?.length || 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
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
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select
                        value={editData.status}
                        onValueChange={(v) => setEditData({ ...editData, status: v })}
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
                        onValueChange={(v) => setEditData({ ...editData, priority: v })}
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
                      onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Health Score ({editData.healthScore})</Label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editData.healthScore}
                      onChange={(e) => setEditData({ ...editData, healthScore: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={4}
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
                      <div className="flex items-center gap-2">
                        <div className="health-bar flex-1">
                          <div 
                            className={`health-bar-fill ${
                              (client.healthScore || 50) >= 70 ? "health-good" :
                              (client.healthScore || 50) >= 40 ? "health-fair" : "health-poor"
                            }`}
                            style={{ width: `${client.healthScore || 50}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{client.healthScore || 50}%</span>
                      </div>
                    </div>
                  </div>
                  {client.notes && (
                    <div>
                      <p className="text-sm text-muted-foreground">Notes</p>
                      <p className="whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Last Contact</p>
                      <p>{client.lastContactAt ? new Date(client.lastContactAt).toLocaleDateString() : "Never"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Reviewed</p>
                      <p>{client.lastReviewedAt ? new Date(client.lastReviewedAt).toLocaleDateString() : "Never"}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Tags</CardTitle>
              {availableTags && availableTags.length > 0 && (
                <Select onValueChange={(tagId) => addTagMutation.mutate({ clientId, tagId: parseInt(tagId) })}>
                  <SelectTrigger className="w-32">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tag
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              {clientTags && clientTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {clientTags.map(ct => (
                    <Badge
                      key={ct.id}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/10"
                      onClick={() => removeTagMutation.mutate({ clientId, tagId: ct.tagId })}
                    >
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ct.tagColor }} />
                      {ct.tagName}
                      <span className="text-muted-foreground ml-1">×</span>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags assigned</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Name *</Label>
                    <Input
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Input
                      value={newContact.role}
                      onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                      placeholder="e.g., CEO, Manager"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Phone</Label>
                      <Input
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="primary"
                      checked={newContact.isPrimary}
                      onCheckedChange={(c) => setNewContact({ ...newContact, isPrimary: !!c })}
                    />
                    <Label htmlFor="primary">Primary contact</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createContactMutation.mutate({ clientId, ...newContact })}
                    disabled={!newContact.name || createContactMutation.isPending}
                  >
                    Add Contact
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {contacts && contacts.length > 0 ? (
            <div className="grid gap-3">
              {contacts.map(contact => (
                <Card key={contact.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{contact.name}</p>
                          {contact.isPrimary && (
                            <Badge variant="secondary" className="text-xs">Primary</Badge>
                          )}
                        </div>
                        {contact.role && (
                          <p className="text-sm text-muted-foreground">{contact.role}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </span>
                          )}
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteContactMutation.mutate({ id: contact.id })}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-8">
              <CardContent className="flex flex-col items-center text-center">
                <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No contacts yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Title (optional)</Label>
                    <Input
                      value={newNote.title}
                      onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Content *</Label>
                    <Textarea
                      value={newNote.content}
                      onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createNoteMutation.mutate({ clientId, ...newNote })}
                    disabled={!newNote.content || createNoteMutation.isPending}
                  >
                    Add Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {notes && notes.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <div className="grid gap-3 pr-4">
                {notes.map(note => (
                  <Card key={note.id} className={note.isPinned ? "border-primary/30" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {note.title && (
                            <p className="font-medium mb-1">{note.title}</p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePinMutation.mutate({ id: note.id, isPinned: !note.isPinned })}
                          >
                            <Pin className={`h-4 w-4 ${note.isPinned ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteNoteMutation.mutate({ id: note.id })}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="py-8">
              <CardContent className="flex flex-col items-center text-center">
                <FileText className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No notes yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Priority</Label>
                      <Select
                        value={newTask.priority}
                        onValueChange={(v) => setNewTask({ ...newTask, priority: v as any })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={newTask.dueDate}
                        onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => createTaskMutation.mutate({ clientId, ...newTask })}
                    disabled={!newTask.title || createTaskMutation.isPending}
                  >
                    Add Task
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {tasks && tasks.length > 0 ? (
            <div className="grid gap-3">
              {tasks.map(task => (
                <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Checkbox
                      checked={task.status === "completed"}
                      onCheckedChange={(checked) => 
                        updateTaskMutation.mutate({ 
                          id: task.id, 
                          status: checked ? "completed" : "pending" 
                        })
                      }
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === "completed" ? "line-through" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className={`priority-${task.priority}`}>
                          {task.priority}
                        </Badge>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTaskMutation.mutate({ id: task.id })}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="py-8">
              <CardContent className="flex flex-col items-center text-center">
                <CheckSquare className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No tasks yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
