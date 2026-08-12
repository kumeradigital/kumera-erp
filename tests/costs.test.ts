import { describe, expect, it } from "vitest";
import {
  analyzeProducts,
  calculateRecipeCosts,
  monthlyFixedCost,
} from "@/modules/costs/calculations";
import type { CostSettings, Ingredient, Recipe } from "@/modules/costs/types";

function ingredient(id: string, name: string, costPerBase: number): Ingredient {
  return {
    id,
    name,
    category: "Prueba",
    baseUnit: "unit",
    prices: [],
    latestPrice: {
      id: `${id}-price`,
      purchaseQuantity: 1,
      purchaseUnit: "unit",
      baseQuantity: 1,
      grossAmount: Math.round(costPerBase),
      netAmount: Math.round(costPerBase),
      taxAmount: 0,
      purchaseDate: "2026-07-01",
      costPerBase,
    },
  };
}

const settings: CostSettings = {
  vatRate: 19,
  operatingDaysMonth: 26,
  expectedCashPercentage: 20,
  expectedDebitPercentage: 80,
  expectedCreditPercentage: 0,
  expectedTransferPercentage: 0,
  debitFeePercentage: 2.0825,
  creditFeePercentage: 2.35,
  targetMonthlyProfit: 0,
};

describe("motor de costos", () => {
  it("reproduce el costo y margen aproximado de la empanada de pino", () => {
    const ingredients = [
      ingredient("mass-input", "Ingredientes masa", 3329),
      ingredient("pino-input", "Ingredientes pino", 6820),
      ingredient("bag", "Bolsa", 16),
      ingredient("tray", "Bandeja", 38),
    ];
    const recipes: Recipe[] = [
      {
        id: "mass",
        name: "Masa",
        yieldQuantity: 15,
        yieldUnit: "unit",
        kind: "subrecipe",
        items: [
          {
            id: "mass-item",
            ingredientId: "mass-input",
            quantity: 1,
            unit: "unit",
          },
        ],
      },
      {
        id: "pino",
        name: "Pino",
        yieldQuantity: 10,
        yieldUnit: "unit",
        kind: "subrecipe",
        items: [
          {
            id: "pino-item",
            ingredientId: "pino-input",
            quantity: 1,
            unit: "unit",
          },
        ],
      },
      {
        id: "empanada",
        name: "Empanada de pino",
        yieldQuantity: 1,
        yieldUnit: "unit",
        kind: "final",
        items: [
          { id: "a", subrecipeId: "mass", quantity: 1, unit: "unit" },
          { id: "b", subrecipeId: "pino", quantity: 1, unit: "unit" },
          { id: "c", ingredientId: "bag", quantity: 1, unit: "unit" },
          { id: "d", ingredientId: "tray", quantity: 1, unit: "unit" },
        ],
      },
    ];
    const costs = calculateRecipeCosts(ingredients, recipes);
    expect(Math.round(costs.get("empanada")!.perYieldUnit)).toBe(958);
    const [analysis] = analyzeProducts(
      [
        {
          id: "product",
          name: "Empanada de pino",
          price: 3200,
          saleUnit: "unit",
          recipeId: "empanada",
          wastePercentage: 5,
          targetMarginPercentage: 60,
        },
      ],
      recipes,
      costs,
      settings,
    );
    expect(Math.round(analysis.variableCost)).toBe(1059);
    expect(Math.round(analysis.contribution)).toBe(1630);
    expect(analysis.contributionPercentage).toBeCloseTo(60.6, 1);
  });

  it("prorratea costos fijos según periodicidad", () => {
    expect(
      monthlyFixedCost(
        [
          {
            id: "rent",
            name: "Arriendo",
            category: "Local",
            amount: 600000,
            period: "monthly",
            startsOn: "2026-01-01",
            active: true,
          },
          {
            id: "patent",
            name: "Patente",
            category: "Otros",
            amount: 120000,
            period: "annual",
            startsOn: "2026-01-01",
            active: true,
          },
        ],
        26,
      ),
    ).toBe(610000);
  });
});
