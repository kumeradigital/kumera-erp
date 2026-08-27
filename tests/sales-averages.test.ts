import { describe, expect, it } from "vitest";
import {
  averagePerWorkedDay,
  workedDays,
} from "../src/modules/pos/sales-averages";

describe("sales averages", () => {
  it("counts opening dates in Santiago, not boxes or calendar days", () => {
    expect(
      workedDays([
        { openedAt: "2026-08-20T12:00:00Z" },
        { openedAt: "2026-08-21T01:00:00Z" },
        { openedAt: "2026-08-22T12:00:00Z" },
      ]),
    ).toBe(2);
  });
  it("includes worked days with no sales of the product", () => {
    expect(averagePerWorkedDay(30, 3)).toBe(10);
    expect(averagePerWorkedDay(1.5, 2)).toBe(0.75);
  });
  it("handles no opening days without dividing by zero", () => {
    expect(workedDays([])).toBe(0);
    expect(averagePerWorkedDay(0, 0)).toBe(0);
  });
});
