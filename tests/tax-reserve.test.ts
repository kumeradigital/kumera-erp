import { describe, expect, it } from "vitest";
import {
  calculateTaxReserve,
  grossVat,
} from "@/modules/operations/calculations";

describe("tax reserve", () => {
  it("extracts VAT included in gross taxable sales", () => {
    expect(grossVat(119_000)).toBe(19_000);
  });

  it("subtracts recoverable purchase and card-fee VAT", () => {
    expect(
      calculateTaxReserve({
        grossSales: 8_534_727,
        purchaseTaxCredit: 662_036,
        cardFeeTaxCredit: 0,
      }),
    ).toEqual({
      salesTaxDebit: 1_362_688,
      recoverableTaxCredit: 662_036,
      estimatedVatPayable: 700_652,
    });
  });

  it("never presents a negative reserve", () => {
    expect(
      calculateTaxReserve({
        grossSales: 100_000,
        purchaseTaxCredit: 50_000,
        cardFeeTaxCredit: 5_000,
      }).estimatedVatPayable,
    ).toBe(0);
  });
});
