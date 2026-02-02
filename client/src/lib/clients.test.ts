import { describe, expect, it } from "vitest";
import { sortByNameCaseInsensitive } from "./clients";

describe("sortByNameCaseInsensitive", () => {
  it("sorts names case-insensitively", () => {
    const items = [
      { name: "bravo" },
      { name: "Alpha" },
      { name: "charlie" },
      { name: "alpha" },
    ];

    const sorted = sortByNameCaseInsensitive(items).map((item) => item.name);
    expect(sorted).toEqual(["Alpha", "alpha", "bravo", "charlie"]);
  });
});
