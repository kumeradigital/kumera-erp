import { describe, expect, it } from "vitest";
import { calculateCardFee } from "@/modules/pos/fees";

const settings = {
  model: "mixed" as const,
  percentage: 0.79,
  fixedAmount: 65,
  vatRate: 19,
  settlementDays: 1,
};

describe("comisión mixta de tarjetas", () => {
  it("calcula comisión, IVA y abono esperado", () => {
    expect(calculateCardFee(10000, "debit", settings)).toEqual({
      net: 144,
      tax: 27,
      total: 171,
      deposit: 9829,
    });
  });

  it("aplica la misma tarifa a crédito", () => {
    expect(calculateCardFee(3400, "credit", settings)).toEqual({
      net: 92,
      tax: 17,
      total: 109,
      deposit: 3291,
    });
  });

  it("no cobra comisión en efectivo ni transferencia", () => {
    expect(calculateCardFee(10000, "cash", settings).total).toBe(0);
    expect(calculateCardFee(10000, "transfer", settings).total).toBe(0);
  });
});
