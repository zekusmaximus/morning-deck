import { describe, expect, it } from "vitest";
import { normalizeClientBullets, sortClientsCaseInsensitive, getSafeClientLogData } from "./morningDeck";

describe("morning deck helpers", () => {
  it("caps client bullets to five lines and trims empties", () => {
    const input = "First\n\nSecond\nThird\nFourth\nFifth\nSixth\nSeventh";
    const result = normalizeClientBullets(input);

    expect(result).toBe("First\nSecond\nThird\nFourth\nFifth");
  });

  it("sorts clients case-insensitively", () => {
    const clients = [
      { name: "beta" },
      { name: "Alpha" },
      { name: "alpha" },
      { name: "Gamma" },
    ];

    const sorted = sortClientsCaseInsensitive(clients);

    expect(sorted.map(client => client.name.toLowerCase())).toEqual([
      "alpha",
      "alpha",
      "beta",
      "gamma",
    ]);
  });
});

describe("getSafeClientLogData", () => {
  it("should preserve safe fields", () => {
    const data = {
      name: "Test Client",
      status: "active",
      priority: "high",
      industry: "Tech",
      healthScore: 80,
    };

    expect(getSafeClientLogData(data)).toEqual(data);
  });

  it("should remove sensitive fields", () => {
    const data = {
      name: "Test Client",
      revenue: "1000000",
      notes: "Secret notes",
    };

    expect(getSafeClientLogData(data)).toEqual({
      name: "Test Client",
    });
  });

  it("should handle mixed safe and unsafe fields", () => {
    const data = {
      name: "Test Client",
      revenue: "1000000",
      status: "active",
      notes: "Secret notes",
      priority: "medium",
    };

    expect(getSafeClientLogData(data)).toEqual({
      name: "Test Client",
      status: "active",
      priority: "medium",
    });
  });

  it("should handle empty object", () => {
    expect(getSafeClientLogData({})).toEqual({});
  });
});
