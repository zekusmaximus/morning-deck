import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { normalizeClientBullets } from "./_core/morningDeck";
import { z } from "zod";
import * as db from "./db";

// ============================================================================
// CLIENT ROUTER
// ============================================================================
const clientRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getClients(ctx.user.id, input?.status);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getClientById(ctx.user.id, input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      status: z.enum(["active", "inactive", "prospect"]).default("active"),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
      industry: z.string().optional(),
      revenue: z.string().optional(),
      healthScore: z.number().min(0).max(100).default(50),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await db.createClient({
        userId: ctx.user.id,
        name: input.name,
        status: input.status,
        priority: input.priority,
        industry: input.industry || null,
        revenue: input.revenue || null,
        healthScore: input.healthScore,
        notes: normalizeClientBullets(input.notes ?? null),
      });
      
      await db.logActivity({
        userId: ctx.user.id,
        clientId: client.id,
        entityType: "client",
        entityId: client.id,
        action: "created",
        details: JSON.stringify({ name: input.name }),
      });
      
      return client;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      status: z.enum(["active", "inactive", "prospect"]).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      industry: z.string().nullable().optional(),
      revenue: z.string().nullable().optional(),
      healthScore: z.number().min(0).max(100).optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateClient(ctx.user.id, id, {
        ...data,
        notes: normalizeClientBullets(data.notes),
      });
      
      await db.logActivity({
        userId: ctx.user.id,
        clientId: id,
        entityType: "client",
        entityId: id,
        action: "updated",
        details: JSON.stringify(data),
      });
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteClient(ctx.user.id, input.id);
      
      await db.logActivity({
        userId: ctx.user.id,
        clientId: input.id,
        entityType: "client",
        entityId: input.id,
        action: "deleted",
      });
      
      return { success: true };
    }),

  getTags: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getClientTags(ctx.user.id, input.clientId);
    }),

  addTag: protectedProcedure
    .input(z.object({ clientId: z.number(), tagId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return db.addClientTag({
        userId: ctx.user.id,
        clientId: input.clientId,
        tagId: input.tagId,
      });
    }),

  removeTag: protectedProcedure
    .input(z.object({ clientId: z.number(), tagId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeClientTag(ctx.user.id, input.clientId, input.tagId);
      return { success: true };
    }),
});

// ============================================================================
// CONTACT ROUTER
// ============================================================================
const contactRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getContacts(ctx.user.id, input?.clientId);
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string().min(1),
      role: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      isPrimary: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const contact = await db.createContact({
        userId: ctx.user.id,
        clientId: input.clientId,
        name: input.name,
        role: input.role || null,
        email: input.email || null,
        phone: input.phone || null,
        isPrimary: input.isPrimary,
        notes: input.notes || null,
      });
      
      await db.logActivity({
        userId: ctx.user.id,
        clientId: input.clientId,
        entityType: "contact",
        entityId: contact.id,
        action: "created",
        details: JSON.stringify({ name: input.name }),
      });
      
      return contact;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      role: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
      phone: z.string().nullable().optional(),
      isPrimary: z.boolean().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateContact(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteContact(ctx.user.id, input.id);
      return { success: true };
    }),
});

// ============================================================================
// NOTE ROUTER
// ============================================================================
const noteRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return db.getNotes(ctx.user.id, input?.clientId);
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      title: z.string().optional(),
      content: z.string().min(1),
      isPinned: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await db.createNote({
        userId: ctx.user.id,
        clientId: input.clientId,
        title: input.title || null,
        content: input.content,
        isPinned: input.isPinned,
      });
      
      await db.logActivity({
        userId: ctx.user.id,
        clientId: input.clientId,
        entityType: "note",
        entityId: note.id,
        action: "created",
      });
      
      return note;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().nullable().optional(),
      content: z.string().min(1).optional(),
      isPinned: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateNote(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteNote(ctx.user.id, input.id);
      return { success: true };
    }),
});

// ============================================================================
// TASK ROUTER
// ============================================================================
const taskRouter = router({
  list: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getTasks(ctx.user.id, input?.clientId, input?.status);
    }),

  upcoming: protectedProcedure
    .input(z.object({ clientId: z.number(), limit: z.number().default(3) }))
    .query(async ({ ctx, input }) => {
      return db.getUpcomingTasks(ctx.user.id, input.clientId, input.limit);
    }),

  create: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
      priority: z.enum(["high", "medium", "low"]).default("medium"),
      dueDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await db.createTask({
        userId: ctx.user.id,
        clientId: input.clientId || null,
        title: input.title,
        description: input.description || null,
        status: input.status,
        priority: input.priority,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
      });
      
      if (input.clientId) {
        await db.logActivity({
          userId: ctx.user.id,
          clientId: input.clientId,
          entityType: "task",
          entityId: task.id,
          action: "created",
          details: JSON.stringify({ title: input.title }),
        });
      }
      
      return task;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).optional(),
      description: z.string().nullable().optional(),
      status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
      priority: z.enum(["high", "medium", "low"]).optional(),
      dueDate: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, dueDate, ...rest } = input;
      const data = {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
      };
      await db.updateTask(ctx.user.id, id, data);
      
      if (input.status === "completed") {
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "task",
          entityId: id,
          action: "completed",
        });
      }
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteTask(ctx.user.id, input.id);
      return { success: true };
    }),
});

// ============================================================================
// TAG ROUTER
// ============================================================================
const tagRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.getTags(ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#6366f1"),
    }))
    .mutation(async ({ ctx, input }) => {
      return db.createTag({
        userId: ctx.user.id,
        name: input.name,
        color: input.color,
      });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateTag(ctx.user.id, id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteTag(ctx.user.id, input.id);
      return { success: true };
    }),
});

// ============================================================================
// ACTIVITY ROUTER
// ============================================================================
const activityRouter = router({
  list: protectedProcedure
    .input(z.object({
      clientId: z.number().optional(),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getActivityLog(ctx.user.id, input?.clientId, input?.limit);
    }),
});

// ============================================================================
// DAILY REVIEW ROUTER
// ============================================================================
const reviewRouter = router({
  today: protectedProcedure.query(async ({ ctx }) => {
    return db.getTodayReview(ctx.user.id);
  }),

  start: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if review already exists
    const existing = await db.getTodayReview(ctx.user.id);
    if (existing) {
      return { id: existing.id, totalClients: existing.totalClients, existing: true };
    }
    
    const review = await db.createDailyReview(ctx.user.id);
    return { ...review, existing: false };
  }),

  items: protectedProcedure
    .input(z.object({ reviewId: z.number() }))
    .query(async ({ ctx, input }) => {
      return db.getDailyReviewItems(ctx.user.id, input.reviewId);
    }),

  markItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      status: z.enum(["reviewed", "flagged"]),
      quickNote: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateReviewItem(ctx.user.id, input.itemId, input.status, input.quickNote);
      return { success: true };
    }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return db.getReviewHistory(ctx.user.id, input?.limit);
    }),
});

// ============================================================================
// DASHBOARD ROUTER
// ============================================================================
const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    return db.getDashboardStats(ctx.user.id);
  }),
});

// ============================================================================
// MAIN ROUTER
// ============================================================================
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  clients: clientRouter,
  contact: contactRouter,
  note: noteRouter,
  task: taskRouter,
  tag: tagRouter,
  activity: activityRouter,
  review: reviewRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
