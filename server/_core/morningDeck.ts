export const MAX_CLIENT_BULLETS = 5;

export function normalizeClientBullets(notes?: string | null): string | null | undefined {
  if (notes === undefined) return undefined;
  if (notes === null) return null;

  const lines = notes
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MAX_CLIENT_BULLETS);

  return lines.length > 0 ? lines.join("\n") : null;
}

export function splitClientBullets(notes?: string | null): string[] {
  if (!notes) return [];
  return notes
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, MAX_CLIENT_BULLETS);
}

export function sortClientsCaseInsensitive<T extends { name: string }>(clients: T[]): T[] {
  return [...clients].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}
