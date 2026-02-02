type HasName = { name: string };

export const sortByNameCaseInsensitive = <T extends HasName>(items: T[]) =>
  [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
