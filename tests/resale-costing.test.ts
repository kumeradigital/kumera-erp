import { describe, expect, it } from "vitest";
import { analyzeProducts } from "@/modules/costs/calculations";
import type { CostSettings } from "@/modules/costs/types";

const settings: CostSettings = {
  vatRate: 19,
  operatingDaysMonth: 26,
  expectedCashPercentage: 0,
  expectedDebitPercentage: 100,
  expectedCreditPercentage: 0,
  expectedTransferPercentage: 0,
  debitFeePercentage: 2,
  creditFeePercentage: 0,
  cardFeeModel: "percentage",
  cardFeePercentage: 2,
  cardFeeFixedAmount: 0,
  cardFeeVatRate: 19,
  cardSettlementDays: 1,
  expectedTicketAmount: 5000,
  targetMonthlyProfit: 0,
  operationalWastePercentage: 0,
};

describe("costeo de productos de reventa", () => {
  it("calcula el costo neto unitario sin exigir una receta ficticia", () => {
    const [result] = analyzeProducts(
      [
        {
          id: "ice-cream",
          name: "Helado",
          category: "Congelados",
          price: 2000,
          saleUnit: "unit",
          wastePercentage: 0,
          targetMarginPercentage: 50,
          isSalesFamily: false,
          productType: "resale",
          resalePurchaseGrossAmount: 11900,
          resaleUnitsPerPurchase: 10,
          resaleTaxRate: 19,
        },
      ],
      [],
      new Map(),
      settings,
    );
    expect(result.physicalCost).toBeCloseTo(1000);
    expect(result.complete).toBe(true);
    expect(result.suggestedPrice).toBeGreaterThan(2000);
  });

  it("marca incompleto un producto sin formato de compra", () => {
    const [result] = analyzeProducts(
      [
        {
          id: "empty",
          name: "Reventa",
          category: "Otros",
          price: 1000,
          saleUnit: "unit",
          wastePercentage: 0,
          targetMarginPercentage: 50,
          isSalesFamily: false,
          productType: "resale",
        },
      ],
      [],
      new Map(),
      settings,
    );
    expect(result.complete).toBe(false);
    expect(result.missing[0]).toContain("costo");
  });
});
