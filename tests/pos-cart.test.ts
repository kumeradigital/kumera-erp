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

  it("redondea medio peso igual que PostgreSQL usando gramos enteros", () => {
    expect(2850 * 0.29).toBeLessThan(826.5);
    expect(calculateLineTotal({ price: 2850, quantity: 0.29 })).toBe(827);
    expect(calculateCartTotal([{ price: 2850, quantity: 0.29 }])).toBe(827);
  });
});
