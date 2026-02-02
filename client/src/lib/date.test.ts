import { describe, expect, it } from "vitest";
import { getNyDateKey } from "./date";

describe("getNyDateKey", () => {
  it("uses America/New_York day boundary", () => {
    const beforeMidnightNy = new Date("2024-01-01T04:59:59Z");
    const atMidnightNy = new Date("2024-01-01T05:00:00Z");

    expect(getNyDateKey(beforeMidnightNy)).toBe("2023-12-31");
    expect(getNyDateKey(atMidnightNy)).toBe("2024-01-01");
  });
});
