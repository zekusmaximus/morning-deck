import { describe, expect, it, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("Morning Deck API", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.auth.me();
      
      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
      expect(result?.name).toBe("Test User");
    });

    it("returns null when not authenticated", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.auth.me();
      
      expect(result).toBeNull();
    });
  });

  describe("dashboard.stats", () => {
    it("requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.dashboard.stats()).rejects.toThrow();
    });

    it("returns stats for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.dashboard.stats();
      
      expect(result).toBeDefined();
      expect(typeof result.activeClients).toBe("number");
      expect(typeof result.pendingTasks).toBe("number");
      expect(typeof result.highPriorityClients).toBe("number");
    });
  });

  describe("clients router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.clients.list()).rejects.toThrow();
    });

    it("list returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.clients.list();
      
      expect(Array.isArray(result)).toBe(true);
    });

    it("create requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.clients.create({
        name: "Test Client",
        status: "active",
        priority: "medium",
      })).rejects.toThrow();
    });
  });

  describe("task router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.task.list()).rejects.toThrow();
    });

    it("list returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.task.list();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("note router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.note.list()).rejects.toThrow();
    });

    it("list returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.note.list();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("tag router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.tag.list()).rejects.toThrow();
    });

    it("list returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.tag.list();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("contact router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.contact.list({ clientId: 1 })).rejects.toThrow();
    });
  });

  describe("activity router", () => {
    it("list requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.activity.list()).rejects.toThrow();
    });

    it("list returns array for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.activity.list();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("review router", () => {
    it("today requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.review.today()).rejects.toThrow();
    });

    it("start requires authentication", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.review.start()).rejects.toThrow();
    });
  });
});
