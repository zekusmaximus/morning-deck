import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ============================================================================
// USERS TABLE
// ============================================================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// CLIENTS TABLE
// ============================================================================
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive", "prospect"]).default("active").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  industry: varchar("industry", { length: 100 }),
  revenue: decimal("revenue", { precision: 15, scale: 2 }),
  healthScore: int("healthScore").default(50), // 0-100 relationship health score
  lastContactAt: timestamp("lastContactAt"),
  lastReviewedAt: timestamp("lastReviewedAt"),
  lastTouchedAt: timestamp("lastTouchedAt"),
  notes: text("notes"), // Quick notes field
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// CONTACTS TABLE
// ============================================================================
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ============================================================================
// NOTES TABLE
// ============================================================================
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  isPinned: boolean("isPinned").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

// ============================================================================
// TASKS TABLE
// ============================================================================
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["high", "medium", "low"]).default("medium").notNull(),
  dueDate: date("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ============================================================================
// TAGS TABLE
// ============================================================================
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  color: varchar("color", { length: 7 }).default("#6366f1").notNull(), // Hex color
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// ============================================================================
// CLIENT_TAGS TABLE (Many-to-Many)
// ============================================================================
export const clientTags = mysqlTable("client_tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClientTag = typeof clientTags.$inferSelect;
export type InsertClientTag = typeof clientTags.$inferInsert;

// ============================================================================
// TASK_ASSIGNMENTS TABLE
// ============================================================================
export const taskAssignments = mysqlTable("task_assignments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  taskId: int("taskId").notNull(),
  assignedToUserId: int("assignedToUserId").notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type InsertTaskAssignment = typeof taskAssignments.$inferInsert;

// ============================================================================
// ACTIVITY_LOG TABLE
// ============================================================================
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  entityType: mysqlEnum("entityType", ["client", "contact", "note", "task", "tag", "review"]).notNull(),
  entityId: int("entityId"),
  action: mysqlEnum("action", ["created", "updated", "deleted", "reviewed", "flagged", "completed"]).notNull(),
  details: text("details"), // JSON string with additional details
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

// ============================================================================
// DAILY_REVIEWS TABLE - Track daily review sessions
// ============================================================================
export const dailyReviews = mysqlTable("daily_reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  reviewDate: date("reviewDate").notNull(),
  totalClients: int("totalClients").notNull(),
  reviewedCount: int("reviewedCount").default(0).notNull(),
  flaggedCount: int("flaggedCount").default(0).notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type DailyReview = typeof dailyReviews.$inferSelect;
export type InsertDailyReview = typeof dailyReviews.$inferInsert;

// ============================================================================
// DAILY_REVIEW_ITEMS TABLE - Track individual client reviews
// ============================================================================
export const dailyReviewItems = mysqlTable("daily_review_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dailyReviewId: int("dailyReviewId").notNull(),
  clientId: int("clientId").notNull(),
  orderIndex: int("orderIndex").notNull(),
  status: mysqlEnum("status", ["pending", "reviewed", "flagged"]).default("pending").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  quickNote: text("quickNote"),
});

export type DailyReviewItem = typeof dailyReviewItems.$inferSelect;
export type InsertDailyReviewItem = typeof dailyReviewItems.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  contacts: many(contacts),
  notes: many(notes),
  tasks: many(tasks),
  tags: many(tags),
  activityLogs: many(activityLog),
  dailyReviews: many(dailyReviews),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  contacts: many(contacts),
  notes: many(notes),
  tasks: many(tasks),
  clientTags: many(clientTags),
  activityLogs: many(activityLog),
  dailyReviewItems: many(dailyReviewItems),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
  client: one(clients, { fields: [notes.clientId], references: [clients.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  client: one(clients, { fields: [tasks.clientId], references: [clients.id] }),
  assignments: many(taskAssignments),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  clientTags: many(clientTags),
}));

export const clientTagsRelations = relations(clientTags, ({ one }) => ({
  user: one(users, { fields: [clientTags.userId], references: [users.id] }),
  client: one(clients, { fields: [clientTags.clientId], references: [clients.id] }),
  tag: one(tags, { fields: [clientTags.tagId], references: [tags.id] }),
}));

export const taskAssignmentsRelations = relations(taskAssignments, ({ one }) => ({
  user: one(users, { fields: [taskAssignments.userId], references: [users.id] }),
  task: one(tasks, { fields: [taskAssignments.taskId], references: [tasks.id] }),
  assignedTo: one(users, { fields: [taskAssignments.assignedToUserId], references: [users.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, { fields: [activityLog.userId], references: [users.id] }),
  client: one(clients, { fields: [activityLog.clientId], references: [clients.id] }),
}));

export const dailyReviewsRelations = relations(dailyReviews, ({ one, many }) => ({
  user: one(users, { fields: [dailyReviews.userId], references: [users.id] }),
  items: many(dailyReviewItems),
}));

export const dailyReviewItemsRelations = relations(dailyReviewItems, ({ one }) => ({
  user: one(users, { fields: [dailyReviewItems.userId], references: [users.id] }),
  dailyReview: one(dailyReviews, { fields: [dailyReviewItems.dailyReviewId], references: [dailyReviews.id] }),
  client: one(clients, { fields: [dailyReviewItems.clientId], references: [clients.id] }),
}));
