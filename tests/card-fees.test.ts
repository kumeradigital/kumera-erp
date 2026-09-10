import { describe, expect, it } from "vitest";
import { calculateCardFee } from "@/modules/pos/fees";

const settings = {
  model: "mixed" as const,
  percentage: 0.79,
  debitPercentage: 1.19,
  creditPercentage: 1.99,
  fixedAmount: 65,
  vatRate: 19,
  settlementDays: 1,
};

describe("comisión mixta de tarjetas", () => {
  it("calcula comisión, IVA y abono esperado", () => {
    expect(calculateCardFee(10000, "debit", settings)).toEqual({
      net: 184,
      tax: 35,
      total: 219,
      deposit: 9781,
    });
  });

  it("aplica la tarifa propia de crédito", () => {
    expect(calculateCardFee(3400, "credit", settings)).toEqual({
      net: 133,
      tax: 25,
      total: 158,
      deposit: 3242,
    });
  });

  it("no cobra comisión en efectivo ni transferencia", () => {
    expect(calculateCardFee(10000, "cash", settings).total).toBe(0);
    expect(calculateCardFee(10000, "transfer", settings).total).toBe(0);
  });
});
