import { describe, expect, it } from "vitest";
import { hasReachedBulletCap, BULLET_CAP } from "./bullets";

describe("hasReachedBulletCap", () => {
  it("returns false under cap and true at cap", () => {
    expect(hasReachedBulletCap(BULLET_CAP - 1)).toBe(false);
    expect(hasReachedBulletCap(BULLET_CAP)).toBe(true);
  });
});
