import { describe, expect, it } from "vitest";
import { countOperatingDaysInMonth } from "../src/modules/costs/operating-schedule";

describe("calendario de funcionamiento", () => {
  it("usa la cantidad real de días del mes cuando abre todos los días", () => {
    const schedule = {
      mode: "weekly" as const,
      weekdays: [1, 2, 3, 4, 5, 6, 7],
    };
    expect(countOperatingDaysInMonth(schedule, new Date(2026, 1, 10))).toBe(28);
    expect(countOperatingDaysInMonth(schedule, new Date(2028, 1, 10))).toBe(29);
    expect(countOperatingDaysInMonth(schedule, new Date(2026, 3, 10))).toBe(30);
    expect(countOperatingDaysInMonth(schedule, new Date(2026, 0, 10))).toBe(31);
  });

  it("cuenta sólo los días de la semana seleccionados", () => {
    const schedule = {
      mode: "weekly" as const,
      weekdays: [1, 2, 3, 4, 5],
    };
    expect(countOperatingDaysInMonth(schedule, new Date(2026, 10, 10))).toBe(
      21,
    );
  });
});
