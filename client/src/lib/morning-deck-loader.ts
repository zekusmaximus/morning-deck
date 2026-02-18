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

  const activeClientIds = activeClientList.map((client) => client.id);

  const { data: rows, error: rowsError } = (await supabase
    .from("daily_run_clients")
    .select("id,client_id,ordinal_index,outcome,quick_note,reviewed_at,contact_made")
    .eq("daily_run_id", dailyRunId)
    .in("client_id", activeClientIds)
    .order("ordinal_index", { ascending: true })) as QueryResult<Omit<DeckRow, "client">>;

  if (rowsError) throw toError(rowsError, "Failed to load daily run clients.");

  const clientsById = new Map(activeClientList.map((client) => [client.id, client] as const));

  return (rows ?? [])
    .map((row) => {
      const client = clientsById.get(row.client_id);
      if (!client) return null;
      return { ...row, client };
    })
    .filter((item): item is DeckRow => item !== null);
}
