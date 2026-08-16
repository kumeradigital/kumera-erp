import { describe, expect, it } from "vitest";
import { calculateCartTotal, calculateLineTotal } from "@/modules/pos/cart";

describe("totales de caja en pesos enteros", () => {
  it("elimina errores binarios de productos vendidos por peso", () => {
    const weighted = { price: 2800, quantity: 0.5822142857142857 };
    expect(weighted.price * weighted.quantity).toBeCloseTo(1630.2);
    expect(calculateLineTotal(weighted)).toBe(1630);
    expect(calculateCartTotal([weighted])).toBe(1630);
  });

  it("redondea cada línea como la función SQL antes de sumarlas", () => {
    expect(
      calculateCartTotal([
        { price: 2800, quantity: 0.5822142857142857 },
        { price: 3400, quantity: 1 },
      ]),
    ).toBe(5030);
  });
});
