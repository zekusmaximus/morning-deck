import { describe, expect, it, vi } from "vitest";
import { loadActiveRunClients, type DeckClient } from "./morning-deck-loader";

type QueryResult<T> = { data: T[] | null; error: unknown };

function createSupabaseMock({
  clientsResult,
  dailyRunResults,
}: {
  clientsResult: QueryResult<DeckClient>;
  dailyRunResults: Array<QueryResult<{
    id: string;
    client_id: string;
    ordinal_index: number;
    outcome: "reviewed" | "flagged" | null;
    quick_note: string | null;
    reviewed_at: string | null;
    contact_made?: boolean;
  }>>;
}) {
  const pendingDailyRunResults = [...dailyRunResults];

  const from = vi.fn((table: string) => {
    if (table === "clients") {
      const clientsChain = {
        eq: vi.fn((column: string) => {
          if (column === "status") {
            return Promise.resolve(clientsResult);
          }
          return clientsChain;
        }),
      };

      return {
        select: vi.fn(() => clientsChain),
      };
    }

    if (table === "daily_run_clients") {
      const nextResult = pendingDailyRunResults.shift() ?? { data: null, error: null };
      const rowsChain = {
        eq: vi.fn(() => rowsChain),
        order: vi.fn(() => Promise.resolve(nextResult)),
      };

      return {
        select: vi.fn(() => rowsChain),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  return { from };
}

describe("loadActiveRunClients", () => {
  it("returns deck rows with active client details attached", async () => {
    const activeClients: DeckClient[] = [
      {
        id: "client-1",
        name: "Acme",
        priority: "high",
        status: "active",
        today_signal: null,
        last_touched_at: null,
      },
      {
        id: "client-2",
        name: "Globex",
        priority: "medium",
        status: "active",
        today_signal: "Renewal soon",
        last_touched_at: "2026-02-17T10:00:00.000Z",
      },
    ];

    const supabase = createSupabaseMock({
      clientsResult: { data: activeClients, error: null },
      dailyRunResults: [
        {
          data: [
            {
              id: "row-1",
              client_id: "client-2",
              ordinal_index: 1,
              outcome: null,
              quick_note: null,
              reviewed_at: null,
              contact_made: false,
            },
            {
              id: "row-2",
              client_id: "client-1",
              ordinal_index: 2,
              outcome: "reviewed",
              quick_note: "Done",
              reviewed_at: "2026-02-18T13:00:00.000Z",
              contact_made: true,
            },
          ],
          error: null,
        },
      ],
    });

    const result = await loadActiveRunClients({
      supabase,
      userId: "user-1",
      dailyRunId: "run-1",
    });

    expect(result).toHaveLength(2);
    expect(result[0].client.name).toBe("Globex");
    expect(result[1].client.priority).toBe("high");
  });

  it("returns empty list when no active clients exist", async () => {
    const supabase = createSupabaseMock({
      clientsResult: { data: [], error: null },
      dailyRunResults: [],
    });

    const result = await loadActiveRunClients({
      supabase,
      userId: "user-1",
      dailyRunId: "run-1",
    });

    expect(result).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith("clients");
  });

  it("throws when active-clients query fails", async () => {
    const supabase = createSupabaseMock({
      clientsResult: { data: null, error: new Error("400 bad request from clients") },
      dailyRunResults: [],
    });

    await expect(
      loadActiveRunClients({
        supabase,
        userId: "user-1",
        dailyRunId: "run-1",
      })
    ).rejects.toThrow("400 bad request from clients");
  });

  it("throws when daily-run-clients query fails", async () => {
    const supabase = createSupabaseMock({
      clientsResult: {
        data: [
          {
            id: "client-1",
            name: "Acme",
            priority: "high",
            status: "active",
            today_signal: null,
            last_touched_at: null,
          },
        ],
        error: null,
      },
      dailyRunResults: [{ data: null, error: new Error("400 bad request from daily_run_clients") }],
    });

    await expect(
      loadActiveRunClients({
        supabase,
        userId: "user-1",
        dailyRunId: "run-1",
      })
    ).rejects.toThrow("400 bad request from daily_run_clients");
  });

  it("falls back when contact_made column is missing", async () => {
    const supabase = createSupabaseMock({
      clientsResult: {
        data: [
          {
            id: "client-1",
            name: "Acme",
            priority: "high",
            status: "active",
            today_signal: null,
            last_touched_at: null,
          },
        ],
        error: null,
      },
      dailyRunResults: [
        {
          data: null,
          error: {
            message: 'column daily_run_clients.contact_made does not exist',
          },
        },
        {
          data: [
            {
              id: "row-1",
              client_id: "client-1",
              ordinal_index: 1,
              outcome: null,
              quick_note: null,
              reviewed_at: null,
            },
          ],
          error: null,
        },
      ],
    });

    const result = await loadActiveRunClients({
      supabase,
      userId: "user-1",
      dailyRunId: "run-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0].contact_made).toBe(false);
    expect(supabase.from).toHaveBeenCalledWith("daily_run_clients");
  });

  it("filters out rows for non-active clients", async () => {
    const supabase = createSupabaseMock({
      clientsResult: {
        data: [
          {
            id: "client-1",
            name: "Acme",
            priority: "high",
            status: "active",
            today_signal: null,
            last_touched_at: null,
          },
        ],
        error: null,
      },
      dailyRunResults: [
        {
          data: [
            {
              id: "row-1",
              client_id: "client-1",
              ordinal_index: 1,
              outcome: null,
              quick_note: null,
              reviewed_at: null,
              contact_made: false,
            },
            {
              id: "row-2",
              client_id: "client-x",
              ordinal_index: 2,
              outcome: null,
              quick_note: null,
              reviewed_at: null,
              contact_made: false,
            },
          ],
          error: null,
        },
      ],
    });

    const result = await loadActiveRunClients({
      supabase,
      userId: "user-1",
      dailyRunId: "run-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0].client_id).toBe("client-1");
  });
});
