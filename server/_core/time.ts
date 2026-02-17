const NY_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getNewYorkDate(date: Date = new Date()): Date {
  const parts = NY_PARTS_FORMATTER.formatToParts(date);
  const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return new Date(Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day)
  ));
}
