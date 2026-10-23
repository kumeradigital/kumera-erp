import { describe, expect, it } from "vitest";
import { normalizeOperationCategory } from "@/modules/operations/categories";

describe("normalizeOperationCategory", () => {
  it("keeps an accounting category already accepted by operations", () => {
    expect(
      normalizeOperationCategory(
        "Servicios básicos",
        "fixed_cost",
        "Electricidad octubre",
      ),
    ).toBe("Servicios básicos");
  });

  it("maps the legacy Servicios category for pest control", () => {
    expect(
      normalizeOperationCategory("Servicios", "fixed_cost", "Plagas October"),
    ).toBe("Mantención y reparaciones");
  });

  it("uses the operation type fallback for an unknown legacy category", () => {
    expect(
      normalizeOperationCategory("Categoría antigua", "expense", "Otro gasto"),
    ).toBe("Otros");
  });
});
