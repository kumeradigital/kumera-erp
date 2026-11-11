import { describe, expect, it } from "vitest";
import {
  analyzeProducts,
  calculateRecipeCosts,
  monthlyFixedCost,
} from "@/modules/costs/calculations";
import type { CostSettings, Ingredient, Recipe } from "@/modules/costs/types";

function ingredient(
  id: string,
  name: string,
  costPerBase: number,
  sourceType: Ingredient["sourceType"] = "raw",
): Ingredient {
  return {
    id,
    name,
    category: "Prueba",
    baseUnit: "unit",
    sourceType,
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
  debitFeePercentage: 1.19,
  creditFeePercentage: 1.99,
  cardFeeModel: "percentage",
  cardFeePercentage: 1.19,
  cardFeeFixedAmount: 0,
  cardFeeVatRate: 19,
  cardSettlementDays: 0,
  expectedTicketAmount: 6000,
  targetMonthlyProfit: 0,
  operationalWastePercentage: 2,
};

describe("motor de costos", () => {
  it("combina materias primas, compras de reventa e insumos en una receta", () => {
    const ingredients = [
      ingredient("ice-cream", "Helado de chocolate", 850, "resale"),
      ingredient("cone", "Cono", 120, "resale"),
      ingredient("cup", "Vasito", 45, "supply"),
      ingredient("spoon", "Cucharita", 15, "supply"),
    ];
    const recipes: Recipe[] = [
      {
        id: "simple-cone",
        name: "Cono simple de chocolate",
        yieldQuantity: 1,
        yieldUnit: "unit",
        kind: "final",
        items: [
          {
            id: "ice-cream-item",
            ingredientId: "ice-cream",
            quantity: 1,
            unit: "unit",
          },
          {
            id: "cone-item",
            ingredientId: "cone",
            quantity: 1,
            unit: "unit",
          },
          {
            id: "cup-item",
            ingredientId: "cup",
            quantity: 1,
            unit: "unit",
          },
          {
            id: "spoon-item",
            ingredientId: "spoon",
            quantity: 1,
            unit: "unit",
          },
        ],
      },
    ];

    const cost = calculateRecipeCosts(ingredients, recipes).get("simple-cone");

    expect(cost?.complete).toBe(true);
    expect(cost?.perYieldUnit).toBe(1030);
  });

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
    expect(Math.round(analysis.variableCost)).toBe(1036);
    expect(Math.round(analysis.contribution)).toBe(1653);
    expect(analysis.contributionPercentage).toBeCloseTo(61.5, 1);
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
        "2026-10-09",
      ),
    ).toBe(610000);
  });

  it("respeta las fechas de vigencia de los costos fijos", () => {
    expect(
      monthlyFixedCost(
        [
          {
            id: "current",
            name: "Vigente",
            category: "Prueba",
            amount: 100000,
            period: "monthly",
            startsOn: "2026-10-01",
            endsOn: "2026-10-31",
            active: true,
            affectsProfitability: true,
          },
          {
            id: "future",
            name: "Futuro",
            category: "Prueba",
            amount: 200000,
            period: "monthly",
            startsOn: "2026-11-01",
            active: true,
            affectsProfitability: true,
          },
          {
            id: "ended",
            name: "Terminado",
            category: "Prueba",
            amount: 300000,
            period: "monthly",
            startsOn: "2026-08-01",
            endsOn: "2026-09-30",
            active: true,
            affectsProfitability: true,
          },
        ],
        26,
        "2026-10-09",
      ),
    ).toBe(100000);
  });
});
