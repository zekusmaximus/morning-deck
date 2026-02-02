import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Sunrise,
  Flag,
  Clock,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  User,
  Phone,
  Mail,
  Trophy
} from "lucide-react";

type ReviewItem = {
  id: number;
  clientId: number;
  orderIndex: number;
  status: "pending" | "reviewed" | "flagged";
  reviewedAt: Date | null;
  quickNote: string | null;
  clientName: string;
  clientStatus: string;
  clientPriority: string;
  clientIndustry: string | null;
  clientHealthScore: number | null;
  clientLastContactAt: Date | null;
  clientLastTouchedAt: Date | null;
  clientNotes: string | null;
};

export default function MorningDeck() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [flagNote, setFlagNote] = useState("");
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  
  // Get or create today's review
  const { data: todayReview, isLoading: reviewLoading } = trpc.review.today.useQuery();
  const startMutation = trpc.review.start.useMutation({
    onSuccess: () => {
      utils.review.today.invalidate();
    },
  });

  // Get review items when we have a review
  const { data: reviewItems, isLoading: itemsLoading } = trpc.review.items.useQuery(
    { reviewId: todayReview?.id ?? 0 },
    { enabled: !!todayReview?.id }
  );

  const markItemMutation = trpc.review.markItem.useMutation({
    onSuccess: () => {
      utils.review.items.invalidate();
      utils.review.today.invalidate();
      utils.dashboard.stats.invalidate();
    },
  });

  // Get current client details for expanded view
  const currentItem = reviewItems?.[currentIndex];
  const { data: contacts } = trpc.contact.list.useQuery(
    { clientId: currentItem?.clientId ?? 0 },
    { enabled: !!currentItem?.clientId && isExpanded }
  );
  const { data: notes } = trpc.note.list.useQuery(
    { clientId: currentItem?.clientId ?? 0 },
    { enabled: !!currentItem?.clientId && isExpanded }
  );
  const { data: tasks } = trpc.task.list.useQuery(
    { clientId: currentItem?.clientId ?? 0 },
    { enabled: !!currentItem?.clientId && isExpanded }
  );

  const updateTaskMutation = trpc.task.update.useMutation({
    onSuccess: () => utils.task.list.invalidate(),
  });

  // Find first pending item on load
  useEffect(() => {
    if (reviewItems) {
      const firstPending = reviewItems.findIndex(item => item.status === "pending");
      if (firstPending !== -1) {
        setCurrentIndex(firstPending);
      }
    }
  }, [reviewItems]);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isExpanded) return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || isExpanded) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = Math.abs(e.touches[0].clientY - touchStart.y);
    
    // Only track horizontal swipes
    if (deltaY < 50) {
      setTouchDelta(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || isExpanded) return;
    
    const threshold = 100;
    if (touchDelta > threshold) {
      handleReview();
    } else if (touchDelta < -threshold) {
      setShowFlagDialog(true);
    }
    
    setTouchStart(null);
    setTouchDelta(0);
  };

  const handleReview = () => {
    if (!currentItem) return;
    
    setSwipeDirection("right");
    setTimeout(() => {
      markItemMutation.mutate({ itemId: currentItem.id, status: "reviewed" });
      moveToNext();
      setSwipeDirection(null);
    }, 300);
  };

  const handleFlag = (note?: string) => {
    if (!currentItem) return;
    
    setSwipeDirection("left");
    setTimeout(() => {
      markItemMutation.mutate({ 
        itemId: currentItem.id, 
        status: "flagged",
        quickNote: note,
      });
      setShowFlagDialog(false);
      setFlagNote("");
      moveToNext();
      setSwipeDirection(null);
    }, 300);
  };

  const moveToNext = () => {
    if (!reviewItems) return;
    
    // Find next pending item
    const nextPending = reviewItems.findIndex(
      (item, idx) => idx > currentIndex && item.status === "pending"
    );
    
    if (nextPending !== -1) {
      setCurrentIndex(nextPending);
    } else {
      // Check if all done
      const anyPending = reviewItems.some(item => item.status === "pending");
      if (!anyPending) {
        // All done!
        setCurrentIndex(reviewItems.length);
      } else {
        // Wrap around to find remaining pending
        const firstPending = reviewItems.findIndex(item => item.status === "pending");
        if (firstPending !== -1) {
          setCurrentIndex(firstPending);
        }
      }
    }
    setIsExpanded(false);
  };

  // Start review if not exists
  const handleStartReview = () => {
    startMutation.mutate();
  };

  // Loading state
  if (reviewLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  // No review started yet
  if (!todayReview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Sunrise className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Morning Deck</h1>
          <p className="text-muted-foreground mt-2 max-w-md">
            Start your daily review to maintain discipline and stay connected with your clients.
          </p>
        </div>
        <Button 
          size="lg" 
          onClick={handleStartReview}
          disabled={startMutation.isPending}
          className="gap-2"
        >
          <Sunrise className="h-5 w-5" />
          {startMutation.isPending ? "Starting..." : "Start Today's Review"}
        </Button>
      </div>
    );
  }

  // Loading items
  if (itemsLoading || !reviewItems) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
    );
  }

  // Calculate progress
  const totalItems = reviewItems.length;
  const completedItems = reviewItems.filter(item => item.status !== "pending").length;
  const reviewedItems = reviewItems.filter(item => item.status === "reviewed").length;
  const flaggedItems = reviewItems.filter(item => item.status === "flagged").length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isComplete = completedItems === totalItems;

  // Completion screen
  if (isComplete || currentIndex >= totalItems) {
    const flaggedClients = reviewItems.filter(item => item.status === "flagged");
    
    return (
      <div className="max-w-lg mx-auto space-y-6 px-4 py-8">
        <div className="text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Review Complete!</h1>
          <p className="text-muted-foreground">
            You've reviewed all {totalItems} clients today.
          </p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">{reviewedItems}</div>
                <div className="text-sm text-muted-foreground">Reviewed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{flaggedItems}</div>
                <div className="text-sm text-muted-foreground">Flagged</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {flaggedClients.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Flagged Clients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {flaggedClients.map(item => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <Flag className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{item.clientName}</p>
                    {item.quickNote && (
                      <p className="text-xs text-muted-foreground mt-1">{item.quickNote}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setCurrentIndex(0)}
        >
          Review Again
        </Button>
      </div>
    );
  }

  // Get health color
  const getHealthColor = (score: number | null) => {
    if (!score) return "health-fair";
    if (score >= 70) return "health-good";
    if (score >= 40) return "health-fair";
    return "health-poor";
  };

  // Days since last contact
  const getDaysSinceContact = (date: Date | null) => {
    if (!date) return null;
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysSinceTouch = getDaysSinceContact(currentItem?.clientLastTouchedAt ?? null);
  const bulletNotes = currentItem?.clientNotes
    ? currentItem.clientNotes.split(/\r?\n/).map(note => note.trim()).filter(Boolean).slice(0, 5)
    : [];

  return (
    <div className="max-w-lg mx-auto space-y-4 px-4 pb-24">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{completedItems} / {totalItems}</span>
          <span className="text-muted-foreground">
            {reviewedItems} reviewed, {flaggedItems} flagged
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Client Card */}
      {currentItem && (
        <div
          ref={cardRef}
          className={`swipe-card ${swipeDirection === "left" ? "swipe-left" : ""} ${swipeDirection === "right" ? "swipe-right" : ""}`}
          style={{
            transform: touchDelta ? `translateX(${touchDelta}px) rotate(${touchDelta * 0.02}deg)` : undefined,
            transition: touchDelta ? "none" : undefined,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Card className="overflow-hidden">
            {/* Card Header */}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{currentItem.clientName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`status-${currentItem.clientStatus}`}>
                      {currentItem.clientStatus}
                    </Badge>
                    <Badge variant="secondary" className={`priority-${currentItem.clientPriority}`}>
                      {currentItem.clientPriority}
                    </Badge>
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  daysSinceTouch === null || daysSinceTouch > 14 ? "bg-red-500/10 text-red-500" :
                  daysSinceTouch > 7 ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-muted text-muted-foreground"
                }`}>
                  <Clock className="h-3 w-3 inline mr-1" />
                  {daysSinceTouch === null ? "No touch yet" : `${daysSinceTouch}d ago`}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-3">
                {currentItem.clientIndustry && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{currentItem.clientIndustry}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Health:</span>
                  <div className="flex-1 health-bar">
                    <div 
                      className={`health-bar-fill ${getHealthColor(currentItem.clientHealthScore)}`}
                      style={{ width: `${currentItem.clientHealthScore ?? 50}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">{currentItem.clientHealthScore ?? 50}%</span>
                </div>
              </div>

              {bulletNotes.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {bulletNotes.map((note, index) => (
                    <li key={`${currentItem.id}-note-${index}`}>{note}</li>
                  ))}
                </ul>
              )}

              {/* Expanded View */}
              {isExpanded && (
                <Accordion type="single" collapsible className="w-full">
                  {/* Tasks */}
                  <AccordionItem value="tasks">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Tasks ({tasks?.filter(t => t.status === "pending").length || 0} pending)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {tasks && tasks.length > 0 ? (
                        <div className="space-y-2">
                          {tasks.slice(0, 5).map(task => (
                            <div key={task.id} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                              <Checkbox
                                checked={task.status === "completed"}
                                onCheckedChange={(checked) => 
                                  updateTaskMutation.mutate({ 
                                    id: task.id, 
                                    status: checked ? "completed" : "pending" 
                                  })
                                }
                              />
                              <span className={`text-sm flex-1 ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </span>
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tasks</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Notes */}
                  <AccordionItem value="notes">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Notes ({notes?.length || 0})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {notes && notes.length > 0 ? (
                        <ScrollArea className="h-40">
                          <div className="space-y-2 pr-4">
                            {notes.slice(0, 5).map(note => (
                              <div key={note.id} className="p-2 rounded bg-muted/50">
                                {note.title && (
                                  <p className="text-sm font-medium">{note.title}</p>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {note.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-muted-foreground">No notes</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* Contacts */}
                  <AccordionItem value="contacts">
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Contacts ({contacts?.length || 0})
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {contacts && contacts.length > 0 ? (
                        <div className="space-y-2">
                          {contacts.map(contact => (
                            <div key={contact.id} className="p-2 rounded bg-muted/50">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{contact.name}</p>
                                {contact.isPrimary && (
                                  <Badge variant="secondary" className="text-xs">Primary</Badge>
                                )}
                              </div>
                              {contact.role && (
                                <p className="text-xs text-muted-foreground">{contact.role}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No contacts</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Expand Details
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Buttons - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-14 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            onClick={() => setShowFlagDialog(true)}
            disabled={markItemMutation.isPending}
          >
            <Flag className="h-5 w-5 mr-2" />
            Flag
          </Button>
          <Button
            size="lg"
            className="flex-1 h-14 bg-green-600 hover:bg-green-700"
            onClick={handleReview}
            disabled={markItemMutation.isPending}
          >
            <Check className="h-5 w-5 mr-2" />
            Reviewed
          </Button>
        </div>
      </div>

      {/* Flag Dialog */}
      <Dialog open={showFlagDialog} onOpenChange={setShowFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag {currentItem?.clientName}?</DialogTitle>
            <DialogDescription>
              Add an optional note about why you're flagging this client.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional note..."
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlagDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleFlag(undefined)}
              disabled={markItemMutation.isPending}
            >
              Flag Without Note
            </Button>
            <Button onClick={() => handleFlag(flagNote || undefined)} disabled={markItemMutation.isPending}>
              Save & Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
