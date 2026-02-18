type QueryResult<T> = {
  data: T[] | null;
  error: unknown;
};

export type DeckClient = {
  id: string;
  name: string;
  priority: "high" | "medium" | "low" | null;
  status: "active" | "inactive" | "prospect";
  today_signal: string | null;
  last_touched_at: string | null;
};

export type DeckRow = {
  id: string;
  client_id: string;
  ordinal_index: number;
  outcome: "reviewed" | "flagged" | null;
  quick_note: string | null;
  reviewed_at: string | null;
  contact_made: boolean;
  client: DeckClient;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

const toError = (error: unknown, fallback: string) =>
  error instanceof Error ? error : new Error(fallback);

const getErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
    const maybeDetails = "details" in error ? String((error as { details?: unknown }).details ?? "") : "";
    const maybeHint = "hint" in error ? String((error as { hint?: unknown }).hint ?? "") : "";
    return [maybeMessage, maybeDetails, maybeHint].filter(Boolean).join(" ");
  }
  return "";
};

const isMissingColumnError = (error: unknown, column: string) =>
  new RegExp(`\\b${column}\\b`, "i").test(getErrorText(error)) &&
  /column/i.test(getErrorText(error));

export async function loadActiveRunClients({
  supabase,
  userId,
  dailyRunId,
}: {
  supabase: SupabaseLike;
  userId: string;
  dailyRunId: string;
}): Promise<DeckRow[]> {
  const { data: activeClients, error: clientsError } = (await supabase
    .from("clients")
    .select("id,name,priority,status,today_signal,last_touched_at")
    .eq("user_id", userId)
    .eq("status", "active")) as QueryResult<DeckClient>;

  if (clientsError) throw toError(clientsError, "Failed to load active clients.");

  const activeClientList = activeClients ?? [];
  if (activeClientList.length === 0) return [];

  const withContactMade = (await supabase
    .from("daily_run_clients")
    .select("id,client_id,ordinal_index,outcome,quick_note,reviewed_at,contact_made")
    .eq("daily_run_id", dailyRunId)
    .order("ordinal_index", { ascending: true })) as QueryResult<Omit<DeckRow, "client">>;

  let rows = withContactMade.data ?? [];
  if (withContactMade.error) {
    if (!isMissingColumnError(withContactMade.error, "contact_made")) {
      throw toError(withContactMade.error, "Failed to load daily run clients.");
    }

    const withoutContactMade = (await supabase
      .from("daily_run_clients")
      .select("id,client_id,ordinal_index,outcome,quick_note,reviewed_at")
      .eq("daily_run_id", dailyRunId)
      .order("ordinal_index", { ascending: true })) as QueryResult<
      Omit<DeckRow, "client" | "contact_made">
    >;

    if (withoutContactMade.error) {
      throw toError(withoutContactMade.error, "Failed to load daily run clients.");
    }

    rows = (withoutContactMade.data ?? []).map((row) => ({ ...row, contact_made: false }));
  }

  const clientsById = new Map(activeClientList.map((client) => [client.id, client] as const));
  const activeClientIds = new Set(activeClientList.map((client) => client.id));

  return rows
    .filter((row) => activeClientIds.has(row.client_id))
    .map((row) => {
      const client = clientsById.get(row.client_id);
      if (!client) return null;
      return { ...row, client };
    })
    .filter((item): item is DeckRow => item !== null);
}
