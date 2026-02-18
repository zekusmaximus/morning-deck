import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/_core/hooks/useAuth";
import { getNyDateKey, daysSince } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Flag,
  FileText,
  CheckSquare,
  User,
  Phone,
  Mail,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { ensureSafeUrl } from "@/lib/safe-url";

export default function MorningDeck() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayKey = useMemo(() => getNyDateKey(), []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [notesLimit, setNotesLimit] = useState(10);
  const [focusNote, setFocusNote] = useState("");

  const { data: dailyRun, isLoading: runLoading } = useQuery({
    queryKey: ["daily-run", todayKey, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      let { data: run, error } = await supabase
         .from("daily_runs")
        .select("*")
        .eq("user_id", user.id)
        .eq("run_date", todayKey)
        .maybeSingle();
      if (error) throw error;

      if (!run) {
        const { data: created, error: insertError } = await supabase
          .from("daily_runs")
          .insert({ user_id: user.id, run_date: todayKey })
          .select()
          .single();
        if (insertError) throw insertError;
        run = created;
      }

      const { data: runClients } = await supabase
        .from("daily_run_clients")
        .select("id,client:clients!inner(id)")
        .eq("daily_run_id", run.id)
        .eq("client.status", "active");

      if (!runClients || runClients.length === 0) {
        const { data: clients, error: clientsError } = await supabase
          .from("clients")
          .select("id,name,priority,last_touched_at")
          .eq("user_id", user.id)
          .eq("status", "active");
        if (clientsError) throw clientsError;

        const priorityWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const urgencyScore = (c: { priority?: string | null; last_touched_at?: string | null }) => {
          const weight = priorityWeight[c.priority ?? "low"] ?? 1;
          const days = c.last_touched_at
            ? Math.floor((Date.now() - new Date(c.last_touched_at).getTime()) / 86_400_000)
            : 999;
          return weight * days;
        };
        const sorted = [...(clients ?? [])].sort((a, b) => urgencyScore(b) - urgencyScore(a));
        if (sorted.length > 0) {
          const payload = sorted.map((client, index) => ({
            user_id: user.id,
            daily_run_id: run.id,
            client_id: client.id,
            ordinal_index: index + 1,
          }));
          const { error: insertClientsError } = await supabase
            .from("daily_run_clients")
            .insert(payload);
          if (insertClientsError) throw insertClientsError;
        }
      }

      return run;
    },
  });

  const { data: runClients, isLoading: itemsLoading } = useQuery({
    queryKey: ["daily-run-clients", dailyRun?.id],
    enabled: !!dailyRun?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_run_clients")
        .select(
          "id,client_id,ordinal_index,outcome,quick_note,reviewed_at,contact_made,client:clients!inner(*)"
        )
        .eq("daily_run_id", dailyRun?.id)
        .eq("client.status", "active")
        .order("ordinal_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const currentItem = runClients?.[currentIndex];
  const currentClient = currentItem?.client as Record<string, any> | undefined;

  const { data: bullets } = useQuery({
    queryKey: ["client-bullets", currentItem?.client_id],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_bullets")
        .select("id,body")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ["client-tasks", currentItem?.client_id],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tasks")
        .select("id,title,is_complete,show_in_deck,due_date")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: notes } = useQuery({
    queryKey: ["client-notes", currentItem?.client_id, notesLimit],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select("id,body,created_at")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false })
        .limit(notesLimit);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: bills } = useQuery({
    queryKey: ["client-bills", currentItem?.client_id],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_bill_links")
        .select("id,label,url")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["client-docs", currentItem?.client_id],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_doc_links")
        .select("id,label,url")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ["client-contacts", currentItem?.client_id],
    enabled: !!currentItem?.client_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_contacts")
        .select("id,name,role,email,phone")
        .eq("client_id", currentItem?.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: dailyFocus } = useQuery({
    queryKey: ["daily-focus", todayKey],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_focus")
        .select("id,note")
        .eq("run_date", todayKey)
        .maybeSingle();
      return data ?? null;
    },
  });

  useEffect(() => {
    if (dailyFocus?.note) {
      setFocusNote(dailyFocus.note);
    }
  }, [dailyFocus?.note]);

  useEffect(() => {
    if (!runClients) return;
    const firstPending = runClients.findIndex((item) => !item.outcome);
    if (firstPending !== -1) {
      setCurrentIndex(firstPending);
    }
  }, [runClients]);

  useEffect(() => {
    setNotesLimit(10);
  }, [currentItem?.client_id]);

  const markItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      outcome,
      quickNote,
    }: {
      itemId: string;
      outcome: "reviewed" | "flagged";
      quickNote?: string;
    }) => {
      const { error } = await supabase
        .from("daily_run_clients")
        .update({
          outcome,
          quick_note: quickNote ?? null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (error) throw error;

      if (quickNote && currentItem?.client_id) {
        await supabase.from("client_notes").insert({
          user_id: user?.id,
          client_id: currentItem.client_id,
          body: quickNote,
        });
        await supabase
          .from("clients")
          .update({ last_touched_at: new Date().toISOString() })
          .eq("id", currentItem.client_id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["daily-run-clients"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: { id: string; is_complete: boolean }) => {
      const { error } = await supabase
        .from("client_tasks")
        .update({ is_complete: task.is_complete })
        .eq("id", task.id);
      if (error) throw error;
      await supabase
        .from("clients")
        .update({ last_touched_at: new Date().toISOString() })
        .eq("id", currentItem?.client_id ?? "");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-tasks"] }),
  });

  const quickNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      if (!user || !currentItem?.client_id) return;
      const { error } = await supabase.from("client_notes").insert({
        user_id: user.id,
        client_id: currentItem.client_id,
        body: note,
      });
      if (error) throw error;
      await supabase
        .from("clients")
        .update({ last_touched_at: new Date().toISOString() })
        .eq("id", currentItem.client_id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-notes"] }),
  });

  const contactMadeMutation = useMutation({
    mutationFn: async ({
      itemId,
      clientId,
      checked,
    }: {
      itemId: string;
      clientId: string;
      checked: boolean;
    }) => {
      const { error } = await supabase
        .from("daily_run_clients")
        .update({ contact_made: checked })
        .eq("id", itemId);
      if (error) throw error;
      if (checked) {
        const now = new Date().toISOString();
        await supabase
          .from("clients")
          .update({ last_touched_at: now, last_contact_made_at: now })
          .eq("id", clientId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-run-clients"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const saveFocusMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { data: existing } = await supabase
        .from("daily_focus")
        .select("id")
        .eq("run_date", todayKey)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await supabase
          .from("daily_focus")
          .update({ note: focusNote })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_focus").insert({
          user_id: user.id,
          run_date: todayKey,
          note: focusNote,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => toast.success("Top-of-mind saved."),
  });

  const moveToNext = () => {
    if (!runClients) return;
    const nextPending = runClients.findIndex(
      (item, index) => index > currentIndex && !item.outcome
    );

    if (nextPending !== -1) {
      setCurrentIndex(nextPending);
      setIsExpanded(false);
      return;
    }

    const remaining = runClients.findIndex((item) => !item.outcome);
    if (remaining !== -1) {
      setCurrentIndex(remaining);
    } else {
      setCurrentIndex(runClients.length);
    }
    setIsExpanded(false);
  };

  const handleReview = () => {
    if (!currentItem) return;
    markItemMutation.mutate({ itemId: currentItem.id, outcome: "reviewed" });
    moveToNext();
  };

  const handleFlag = (note?: string) => {
    if (!currentItem) return;
    markItemMutation.mutate({
      itemId: currentItem.id,
      outcome: "flagged",
      quickNote: note,
    });
    setShowFlagDialog(false);
    setFlagNote("");
    moveToNext();
  };

  // Keep latest handlers in refs so the keydown listener never goes stale
  const handleReviewRef = useRef(handleReview);
  handleReviewRef.current = handleReview;

  const currentItemRef = useRef(currentItem);
  currentItemRef.current = currentItem;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentItemRef.current) return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "textarea" || tag === "input") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleReviewRef.current();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setShowFlagDialog(true);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setIsExpanded((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // registered once; reads latest values via refs

  if (runLoading || itemsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  if (!dailyRun) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Create a daily run to begin.</p>
      </div>
    );
  }

  const allComplete = runClients?.length ? runClients.every((item) => item.outcome) : false;
  const flaggedClients = runClients?.filter((item) => item.outcome === "flagged") ?? [];

  if (allComplete) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Morning Deck Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {flaggedClients.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Flagged clients</h3>
                {flaggedClients.map((item) => (
                  <div key={item.id} className="rounded-md border p-3">
                    <p className="font-medium">{(item.client as any)?.name}</p>
                    {item.quick_note && (
                      <p className="text-sm text-muted-foreground">{item.quick_note}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No clients flagged today.</p>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Top-of-mind note for today</h3>
              <Textarea
                value={focusNote}
                onChange={(event) => setFocusNote(event.target.value)}
                rows={3}
              />
              <Button onClick={() => saveFocusMutation.mutate()} disabled={saveFocusMutation.isPending}>
                Save top-of-mind note
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentItem || !currentClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No active clients to review today.</p>
      </div>
    );
  }

  const taskPreview = (tasks ?? []).filter(
    (task) => task.show_in_deck && !task.is_complete
  );
  const taskSnippet = taskPreview.slice(0, 2);
  const extraTasks = taskPreview.length - taskSnippet.length;
  const lastTouchedDays = daysSince(currentClient.last_touched_at);
  const lastTouchedLabel =
    lastTouchedDays === null
      ? "Never"
      : `${lastTouchedDays}d ago`;
  const lastTouchedClass =
    lastTouchedDays === null || lastTouchedDays <= 7
      ? "bg-muted"
      : lastTouchedDays <= 14
        ? "bg-yellow-100 text-yellow-900"
        : "bg-red-100 text-red-900";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Morning Deck</h1>
          <p className="text-muted-foreground">{todayKey}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden md:flex items-center gap-1.5">
            <kbd className="rounded border px-1 py-0.5 text-xs font-mono bg-muted">R</kbd> reviewed
            <kbd className="rounded border px-1 py-0.5 text-xs font-mono bg-muted ml-1">F</kbd> flag
            <kbd className="rounded border px-1 py-0.5 text-xs font-mono bg-muted ml-1">E</kbd> expand
          </span>
          <span>{currentIndex + 1} / {runClients?.length ?? 0}</span>
        </div>
      </div>

      <Card className="relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{currentClient.name}</CardTitle>
              {currentClient.priority === "high" && (
                <Badge variant="destructive" className="text-xs">High</Badge>
              )}
              {currentClient.priority === "medium" && (
                <Badge variant="secondary" className="text-xs">Medium</Badge>
              )}
            </div>
            <Badge className={lastTouchedClass}>{lastTouchedLabel}</Badge>
          </div>
          {currentClient.today_signal && (
            <p className="text-sm text-muted-foreground">{currentClient.today_signal}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {bullets?.map((bullet) => (
              <div key={bullet.id} className="text-sm text-muted-foreground">
                • {bullet.body}
              </div>
            ))}
            {bullets?.length === 0 && (
              <p className="text-sm text-muted-foreground">No bullets yet.</p>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4" />
              Task preview
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {taskSnippet.map((task) => (
                <div key={task.id}>
                  • {task.title}
                  {task.due_date && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      — {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
              {taskSnippet.length === 0 && <div>No deck tasks.</div>}
              {extraTasks > 0 && <div>+{extraTasks} more</div>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="contact-made"
              checked={!!currentItem.contact_made}
              onCheckedChange={(checked) =>
                contactMadeMutation.mutate({
                  itemId: currentItem.id,
                  clientId: currentItem.client_id,
                  checked: !!checked,
                })
              }
            />
            <label
              htmlFor="contact-made"
              className="text-sm font-medium cursor-pointer select-none"
            >
              Contact made?
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleReview} className="gap-2">
              <Check className="h-4 w-4" /> Reviewed
            </Button>
            <Button variant="outline" onClick={() => setShowFlagDialog(true)} className="gap-2">
              <Flag className="h-4 w-4" /> Flag
            </Button>
            <Button variant="ghost" onClick={() => setIsExpanded((value) => !value)} className="gap-2">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>

          {isExpanded && (
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="tasks">
                <AccordionTrigger>Tasks (toggle only)</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(tasks ?? []).map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={task.is_complete}
                            onCheckedChange={(checked) =>
                              toggleTaskMutation.mutate({ id: task.id, is_complete: !!checked })
                            }
                          />
                          <span className={task.is_complete ? "line-through text-muted-foreground" : ""}>
                            {task.title}
                          </span>
                        </div>
                        {task.show_in_deck && <Badge variant="secondary">Deck</Badge>}
                      </div>
                    ))}
                    {tasks?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No tasks.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="quick-note">
                <AccordionTrigger>Quick Note</AccordionTrigger>
                <AccordionContent>
                  <QuickNoteForm
                    onSave={(note) => quickNoteMutation.mutate(note)}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="notes">
                <AccordionTrigger>Notes</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(notes ?? []).map((note) => (
                      <div key={note.id} className="rounded-md border p-3">
                        <p className="text-sm">{note.body}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesLimit((limit) => limit + 10)}
                    >
                      Load more
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="bills">
                <AccordionTrigger>Bills</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(bills ?? []).map((bill) => (
                      <a
                        key={bill.id}
                        href={ensureSafeUrl(bill.url)}
                        className="flex items-center gap-2 text-sm text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="h-4 w-4" />
                        {bill.label}
                      </a>
                    ))}
                    {bills?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No bills.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="documents">
                <AccordionTrigger>Documents</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(documents ?? []).map((doc) => (
                      <a
                        key={doc.id}
                        href={ensureSafeUrl(doc.url)}
                        className="flex items-center gap-2 text-sm text-primary underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="h-4 w-4" />
                        {doc.label}
                      </a>
                    ))}
                    {documents?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No documents.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="contacts">
                <AccordionTrigger>Contacts</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {(contacts ?? []).map((contact) => (
                      <div key={contact.id} className="rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{contact.name}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {contact.role && <div>{contact.role}</div>}
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3" /> {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" /> {contact.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {contacts?.length === 0 && (
                      <p className="text-sm text-muted-foreground">No contacts.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag this client</DialogTitle>
          </DialogHeader>
          <Textarea
            value={flagNote}
            onChange={(event) => setFlagNote(event.target.value)}
            placeholder="Add a quick note (optional)"
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleFlag()}>
              Skip note
            </Button>
            <Button onClick={() => handleFlag(flagNote)}>
              Save note & flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickNoteForm({ onSave }: { onSave: (note: string) => void }) {
  const [note, setNote] = useState("");

  return (
    <div className="space-y-2">
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Capture a quick note"
        rows={3}
      />
      <Button
        size="sm"
        onClick={() => {
          if (!note.trim()) return;
          onSave(note);
          setNote("");
        }}
      >
        Save quick note
      </Button>
    </div>
  );
}
