import { describe, expect, it } from "vitest";
import { normalizeClientBullets, sortClientsCaseInsensitive } from "./morningDeck";

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
