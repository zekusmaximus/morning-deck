import { eq, and, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  clients, InsertClient, Client,
  contacts, InsertContact, Contact,
  notes, InsertNote, Note,
  tasks, InsertTask, Task,
  tags, InsertTag, Tag,
  clientTags, InsertClientTag,
  taskAssignments, InsertTaskAssignment,
  activityLog, InsertActivityLog,
  dailyReviews, InsertDailyReview, DailyReview,
  dailyReviewItems, InsertDailyReviewItem, DailyReviewItem,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { getNewYorkDate } from "./_core/time";
import { sortClientsCaseInsensitive } from "./_core/morningDeck";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER QUERIES
// ============================================================================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CLIENT QUERIES
// ============================================================================
export async function getClients(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(clients.userId, userId)];
  if (status) {
    conditions.push(eq(clients.status, status as "active" | "inactive" | "prospect"));
  }
  
  return db.select().from(clients)
    .where(and(...conditions))
    .orderBy(asc(sql`lower(${clients.name})`));
}

export async function getClientById(userId: number, clientId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  return result[0];
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(clients).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateClient(userId: number, clientId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clients)
    .set({ ...data, updatedAt: new Date(), lastTouchedAt: new Date() })
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

export async function deleteClient(userId: number, clientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

// ============================================================================
// CONTACT QUERIES
// ============================================================================
export async function getContacts(userId: number, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(contacts.userId, userId)];
  if (clientId) conditions.push(eq(contacts.clientId, clientId));
  
  return db.select().from(contacts).where(and(...conditions)).orderBy(desc(contacts.isPrimary), asc(contacts.name));
}

export async function createContact(data: InsertContact) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If setting as primary, unset other primaries for this client
  if (data.isPrimary) {
    await db.update(contacts)
      .set({ isPrimary: false })
      .where(and(eq(contacts.clientId, data.clientId), eq(contacts.userId, data.userId)));
  }
  
  const result = await db.insert(contacts).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateContact(userId: number, contactId: number, data: Partial<InsertContact>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If setting as primary, unset other primaries
  if (data.isPrimary) {
    const contact = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
    if (contact[0]) {
      await db.update(contacts)
        .set({ isPrimary: false })
        .where(and(eq(contacts.clientId, contact[0].clientId), eq(contacts.userId, userId)));
    }
  }
  
  await db.update(contacts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
}

export async function deleteContact(userId: number, contactId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(contacts).where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)));
}

// ============================================================================
// NOTE QUERIES
// ============================================================================
export async function getNotes(userId: number, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(notes.userId, userId)];
  if (clientId) conditions.push(eq(notes.clientId, clientId));
  
  return db.select().from(notes).where(and(...conditions)).orderBy(desc(notes.isPinned), desc(notes.createdAt));
}

export async function createNote(data: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(notes).values(data);
  
  // Update client's lastContactAt and lastTouchedAt
  await db.update(clients)
    .set({ lastContactAt: new Date(), lastTouchedAt: new Date(), updatedAt: new Date() })
    .where(eq(clients.id, data.clientId));
  
  return { id: Number(result[0].insertId), ...data };
}

export async function updateNote(userId: number, noteId: number, data: Partial<InsertNote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

export async function deleteNote(userId: number, noteId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)));
}

// ============================================================================
// TASK QUERIES
// ============================================================================
export async function getTasks(userId: number, clientId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(tasks.userId, userId)];
  if (clientId) conditions.push(eq(tasks.clientId, clientId));
  if (status) conditions.push(eq(tasks.status, status as "pending" | "in_progress" | "completed" | "cancelled"));
  
  return db.select().from(tasks).where(and(...conditions)).orderBy(asc(tasks.dueDate), desc(tasks.priority));
}

export async function getUpcomingTasks(userId: number, clientId: number, limit = 3) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.clientId, clientId),
      eq(tasks.status, "pending")
    ))
    .orderBy(asc(tasks.dueDate))
    .limit(limit);
}

export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tasks).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateTask(userId: number, taskId: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: Partial<InsertTask> & { completedAt?: Date | null } = { ...data, updatedAt: new Date() };
  
  // Set completedAt when marking as completed
  if (data.status === "completed") {
    updateData.completedAt = new Date();
  } else if (data.status) {
    updateData.completedAt = null;
  }
  
  await db.update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

  if (data.status) {
    const task = await db.select({ clientId: tasks.clientId }).from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .limit(1);
    if (task[0]?.clientId) {
      await db.update(clients)
        .set({ lastTouchedAt: new Date(), updatedAt: new Date() })
        .where(eq(clients.id, task[0].clientId));
    }
  }
}

export async function deleteTask(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
}

// ============================================================================
// TAG QUERIES
// ============================================================================
export async function getTags(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(tags).where(eq(tags.userId, userId)).orderBy(asc(tags.name));
}

export async function createTag(data: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tags).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateTag(userId: number, tagId: number, data: Partial<InsertTag>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(tags).set(data).where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
}

export async function deleteTag(userId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete client_tags associations first
  await db.delete(clientTags).where(and(eq(clientTags.tagId, tagId), eq(clientTags.userId, userId)));
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
}

// ============================================================================
// CLIENT_TAG QUERIES
// ============================================================================
export async function getClientTags(userId: number, clientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: clientTags.id,
    tagId: clientTags.tagId,
    tagName: tags.name,
    tagColor: tags.color,
  })
    .from(clientTags)
    .innerJoin(tags, eq(clientTags.tagId, tags.id))
    .where(and(eq(clientTags.clientId, clientId), eq(clientTags.userId, userId)));
}

export async function addClientTag(data: InsertClientTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(clientTags).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function removeClientTag(userId: number, clientId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clientTags).where(and(
    eq(clientTags.clientId, clientId),
    eq(clientTags.tagId, tagId),
    eq(clientTags.userId, userId)
  ));
}

// ============================================================================
// ACTIVITY LOG QUERIES
// ============================================================================
export async function getActivityLog(userId: number, clientId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(activityLog.userId, userId)];
  if (clientId) conditions.push(eq(activityLog.clientId, clientId));
  
  return db.select().from(activityLog).where(and(...conditions)).orderBy(desc(activityLog.createdAt)).limit(limit);
}

export async function logActivity(data: InsertActivityLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(activityLog).values(data);
  return { id: Number(result[0].insertId), ...data };
}

// ============================================================================
// DAILY REVIEW QUERIES
// ============================================================================
export async function getTodayReview(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const today = getNewYorkDate();
  
  const result = await db.select().from(dailyReviews)
    .where(and(
      eq(dailyReviews.userId, userId),
      eq(dailyReviews.reviewDate, today)
    ))
    .limit(1);
  
  return result[0];
}

export async function createDailyReview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const today = getNewYorkDate();
  
  // Get all active clients
  const activeClients = await db.select().from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.status, "active")))
    .orderBy(asc(sql`lower(${clients.name})`));
  const orderedClients = sortClientsCaseInsensitive(activeClients);
  
  // Create the daily review
  const reviewResult = await db.insert(dailyReviews).values({
    userId,
    reviewDate: today,
    totalClients: orderedClients.length,
    reviewedCount: 0,
    flaggedCount: 0,
    isCompleted: false,
  });
  
  const reviewId = Number(reviewResult[0].insertId);
  
  // Create review items for each client
  for (let i = 0; i < orderedClients.length; i++) {
    await db.insert(dailyReviewItems).values({
      userId,
      dailyReviewId: reviewId,
      clientId: orderedClients[i].id,
      orderIndex: i,
      status: "pending",
    });
  }
  
  return { id: reviewId, totalClients: orderedClients.length };
}

export async function getDailyReviewItems(userId: number, reviewId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    id: dailyReviewItems.id,
    clientId: dailyReviewItems.clientId,
    orderIndex: dailyReviewItems.orderIndex,
    status: dailyReviewItems.status,
    reviewedAt: dailyReviewItems.reviewedAt,
    quickNote: dailyReviewItems.quickNote,
    clientName: clients.name,
    clientStatus: clients.status,
    clientPriority: clients.priority,
    clientIndustry: clients.industry,
    clientHealthScore: clients.healthScore,
    clientLastContactAt: clients.lastContactAt,
    clientLastTouchedAt: clients.lastTouchedAt,
    clientNotes: clients.notes,
  })
    .from(dailyReviewItems)
    .innerJoin(clients, eq(dailyReviewItems.clientId, clients.id))
    .where(and(eq(dailyReviewItems.dailyReviewId, reviewId), eq(dailyReviewItems.userId, userId)))
    .orderBy(asc(dailyReviewItems.orderIndex));
}

export async function updateReviewItem(userId: number, itemId: number, status: "reviewed" | "flagged", quickNote?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Update the review item
  await db.update(dailyReviewItems)
    .set({
      status,
      reviewedAt: new Date(),
      quickNote: quickNote || null,
    })
    .where(and(eq(dailyReviewItems.id, itemId), eq(dailyReviewItems.userId, userId)));
  
  // Get the review item to find the daily review and client
  const item = await db.select().from(dailyReviewItems).where(eq(dailyReviewItems.id, itemId)).limit(1);
  if (!item[0]) return;
  
  // Update client's lastReviewedAt
  await db.update(clients)
    .set({ lastReviewedAt: new Date(), lastTouchedAt: new Date(), updatedAt: new Date() })
    .where(eq(clients.id, item[0].clientId));
  
  // Update daily review counts
  const reviewItems = await db.select().from(dailyReviewItems)
    .where(eq(dailyReviewItems.dailyReviewId, item[0].dailyReviewId));
  
  const reviewedCount = reviewItems.filter(i => i.status === "reviewed").length;
  const flaggedCount = reviewItems.filter(i => i.status === "flagged").length;
  const isCompleted = reviewItems.every(i => i.status !== "pending");
  
  await db.update(dailyReviews)
    .set({
      reviewedCount,
      flaggedCount,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    })
    .where(eq(dailyReviews.id, item[0].dailyReviewId));
  
  // Log activity
  await logActivity({
    userId,
    clientId: item[0].clientId,
    entityType: "review",
    entityId: itemId,
    action: status,
    details: quickNote ? JSON.stringify({ note: quickNote }) : null,
  });
}

export async function getReviewHistory(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(dailyReviews)
    .where(eq(dailyReviews.userId, userId))
    .orderBy(desc(dailyReviews.reviewDate))
    .limit(limit);
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================
export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) {
    return {
      totalClients: 0,
      activeClients: 0,
      prospectClients: 0,
      inactiveClients: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      highPriorityClients: 0,
      needsAttention: 0,
      todayReviewCompleted: false,
      todayReviewProgress: null,
    };
  }
  
  const allClients = await db.select().from(clients).where(eq(clients.userId, userId));
  const allTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
  const todayReview = await getTodayReview(userId);
  
  const activeClients = allClients.filter(c => c.status === "active").length;
  const prospectClients = allClients.filter(c => c.status === "prospect").length;
  const inactiveClients = allClients.filter(c => c.status === "inactive").length;
  
  const pendingTasks = allTasks.filter(t => t.status === "pending").length;
  const overdueTasks = allTasks.filter(t => {
    if (t.status !== "pending" || !t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  
  const highPriorityClients = allClients.filter(c => c.priority === "high" && c.status === "active").length;
  
  // Clients needing attention (not contacted in 7+ days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const needsAttention = allClients.filter(c => {
    if (c.status !== "active") return false;
    if (!c.lastContactAt) return true;
    return new Date(c.lastContactAt) < sevenDaysAgo;
  }).length;
  
  return {
    totalClients: allClients.length,
    activeClients,
    prospectClients,
    inactiveClients,
    pendingTasks,
    overdueTasks,
    highPriorityClients,
    needsAttention,
    todayReviewCompleted: todayReview?.isCompleted ?? false,
    todayReviewProgress: todayReview ? {
      reviewed: todayReview.reviewedCount,
      flagged: todayReview.flaggedCount,
      total: todayReview.totalClients,
    } : null,
  };
}
