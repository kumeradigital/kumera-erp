import type {
  CostProduct,
  CostSettings,
  CostUnit,
  FixedCost,
  Ingredient,
  ProductCostAnalysis,
  Recipe,
  RecipeCost,
} from "./types";
import { effectiveCardFeePercentage } from "@/modules/pos/fees";

export function toBaseQuantity(
  quantity: number,
  unit: CostUnit,
  baseUnit: "g" | "ml" | "unit",
) {
  if (baseUnit === "g" && unit === "kg") return quantity * 1000;
  if (baseUnit === "ml" && unit === "l") return quantity * 1000;
  if (unit === baseUnit) return quantity;
  throw new Error(`No se puede convertir ${unit} a ${baseUnit}`);
}

export function calculateRecipeCosts(
  ingredients: Ingredient[],
  recipes: Recipe[],
) {
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
  const recipeMap = new Map(recipes.map((item) => [item.id, item]));
  const cache = new Map<string, RecipeCost>();

  function calculate(recipeId: string, trail: string[] = []): RecipeCost {
    if (cache.has(recipeId)) return cache.get(recipeId)!;
    const recipe = recipeMap.get(recipeId);
    if (!recipe)
      return {
        total: 0,
        perYieldUnit: 0,
        complete: false,
        missing: ["Receta inexistente"],
      };
    if (trail.includes(recipeId))
      return {
        total: 0,
        perYieldUnit: 0,
        complete: false,
        missing: [`Ciclo en ${recipe.name}`],
      };

    let total = 0;
    const missing: string[] = [];
    for (const item of recipe.items) {
      if (item.ingredientId) {
        const ingredient = ingredientMap.get(item.ingredientId);
        if (!ingredient) {
          missing.push("Ingrediente eliminado");
          continue;
        }
        if (!ingredient.latestPrice) {
          missing.push(`${ingredient.name} sin precio`);
          continue;
        }
        try {
          const baseQuantity = toBaseQuantity(
            item.quantity,
            item.unit,
            ingredient.baseUnit,
          );
          total +=
            (baseQuantity * ingredient.latestPrice.costPerBase * 100) /
            (ingredient.usableYieldPercentage || 100);
        } catch {
          missing.push(`${ingredient.name}: unidad incompatible`);
        }
      } else if (item.subrecipeId) {
        const child = recipeMap.get(item.subrecipeId);
        const childCost = calculate(item.subrecipeId, [...trail, recipeId]);
        if (!child) {
          missing.push("Subreceta eliminada");
          continue;
        }
        const expectedUnit = child.yieldUnit;
        if (item.unit !== expectedUnit) {
          missing.push(`${child.name}: debe usarse en ${expectedUnit}`);
          continue;
        }
        total += childCost.perYieldUnit * item.quantity;
        missing.push(...childCost.missing);
      }
    }
    if (!recipe.items.length) missing.push(`${recipe.name} sin componentes`);
    const result = {
      total,
      perYieldUnit: total / recipe.yieldQuantity,
      complete: missing.length === 0,
      missing: [...new Set(missing)],
    };
    cache.set(recipeId, result);
    return result;
  }

  for (const recipe of recipes) calculate(recipe.id);
  return cache;
}

export function weightedCommissionPercentage(settings: CostSettings) {
  const cardShare =
    (settings.expectedDebitPercentage + settings.expectedCreditPercentage) /
    100;
  return (
    cardShare *
    effectiveCardFeePercentage(
      {
        model: settings.cardFeeModel,
        percentage: settings.cardFeePercentage,
        fixedAmount: settings.cardFeeFixedAmount,
        vatRate: settings.cardFeeVatRate,
        settlementDays: settings.cardSettlementDays,
      },
      settings.expectedTicketAmount,
    )
  );
}

export function analyzeProducts(
  products: CostProduct[],
  recipes: Recipe[],
  recipeCosts: Map<string, RecipeCost>,
  settings: CostSettings,
): ProductCostAnalysis[] {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const feePercentage = weightedCommissionPercentage(settings);
  return products.map((product) => {
    const recipe = product.recipeId
      ? recipeMap.get(product.recipeId)
      : undefined;
    const recipeCost = product.recipeId
      ? recipeCosts.get(product.recipeId)
      : undefined;
    const missing: string[] = [];
    if (!recipe || !recipeCost) missing.push("Producto sin receta vinculada");
    if (recipe && recipe.yieldUnit !== product.saleUnit)
      missing.push(
        `La receta rinde en ${recipe.yieldUnit} y el producto se vende en ${product.saleUnit}`,
      );
    if (recipeCost) missing.push(...recipeCost.missing);
    const physicalCost = recipeCost?.perYieldUnit || 0;
    const wasteCost = physicalCost * (product.wastePercentage / 100);
    const commissionCost = product.price * (feePercentage / 100);
    const variableCost = physicalCost + wasteCost + commissionCost;
    const netRevenue = product.price / (1 + settings.vatRate / 100);
    const contribution = netRevenue - variableCost;
    const contributionPercentage = netRevenue
      ? (contribution / netRevenue) * 100
      : 0;
    const target = product.targetMarginPercentage / 100;
    const denominator =
      (1 - target) / (1 + settings.vatRate / 100) - feePercentage / 100;
    const rawSuggested =
      denominator > 0 ? (physicalCost + wasteCost) / denominator : 0;
    return {
      ...product,
      recipeName: recipe?.name,
      physicalCost,
      wasteCost,
      commissionCost,
      variableCost,
      netRevenue,
      contribution,
      contributionPercentage,
      suggestedPrice: rawSuggested ? Math.ceil(rawSuggested / 100) * 100 : 0,
      complete: missing.length === 0,
      missing: [...new Set(missing)],
    };
  });
}

export function monthlyFixedCost(costs: FixedCost[], operatingDays: number) {
  return costs
    .filter((cost) => cost.active)
    .reduce((total, cost) => {
      const factor = {
        daily: operatingDays,
        monthly: 1,
        quarterly: 1 / 3,
        semiannual: 1 / 6,
        annual: 1 / 12,
      }[cost.period];
      return total + cost.amount * factor;
    }, 0);
}
