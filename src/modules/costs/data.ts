import { createClient } from "@/server/supabase/server";
import {
  analyzeProducts,
  calculateRecipeCosts,
  monthlyFixedCost,
} from "./calculations";
import type {
  CostProduct,
  CostSettings,
  FixedCost,
  Ingredient,
  IngredientPrice,
  Recipe,
  Scenario,
} from "./types";

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const { data: membership, error } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (error) throw error;
  return { supabase, businessId: membership.business_id };
}

export async function getCostingData() {
  const { supabase, businessId } = await context();
  const [
    ingredientResult,
    priceResult,
    recipeResult,
    itemResult,
    productResult,
    settingsResult,
    fixedResult,
    scenarioResult,
    scenarioItemResult,
  ] = await Promise.all([
    supabase
      .from("ingredients")
      .select(
        "id,name,category,base_unit,notes,usable_yield_percentage,yield_loss_type,yield_status",
      )
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("ingredient_prices")
      .select(
        "id,ingredient_id,purchase_quantity,purchase_unit,base_quantity,gross_amount,net_amount,tax_amount,supplier,purchase_date,created_at",
      )
      .eq("business_id", businessId)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("recipes")
      .select("id,name,description,yield_quantity,yield_unit,recipe_kind")
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("recipe_items")
      .select("id,recipe_id,ingredient_id,subrecipe_id,quantity,unit")
      .eq("business_id", businessId)
      .order("position"),
    supabase
      .from("products")
      .select(
        "id,name,price,sale_unit,cost_recipe_id,waste_percentage,target_margin_percentage",
      )
      .eq("business_id", businessId)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("cost_settings")
      .select("*")
      .eq("business_id", businessId)
      .single(),
    supabase
      .from("fixed_costs")
      .select("id,name,category,amount,period,starts_on,ends_on,active")
      .eq("business_id", businessId)
      .order("name"),
    supabase
      .from("sales_scenarios")
      .select("id,name,operating_days,target_profit")
      .eq("business_id", businessId)
      .order("created_at"),
    supabase
      .from("sales_scenario_items")
      .select("scenario_id,product_id,quantity_per_day")
      .eq("business_id", businessId),
  ]);

  for (const result of [
    ingredientResult,
    priceResult,
    recipeResult,
    itemResult,
    productResult,
    settingsResult,
    fixedResult,
    scenarioResult,
    scenarioItemResult,
  ]) {
    if (result.error) throw result.error;
  }

  const pricesByIngredient = new Map<string, IngredientPrice[]>();
  for (const row of priceResult.data || []) {
    const price: IngredientPrice = {
      id: row.id,
      purchaseQuantity: Number(row.purchase_quantity),
      purchaseUnit: row.purchase_unit,
      baseQuantity: Number(row.base_quantity),
      grossAmount: Number(row.gross_amount),
      netAmount: Number(row.net_amount),
      taxAmount: Number(row.tax_amount),
      supplier: row.supplier || undefined,
      purchaseDate: row.purchase_date,
      costPerBase: Number(row.net_amount) / Number(row.base_quantity),
    };
    const list = pricesByIngredient.get(row.ingredient_id) || [];
    list.push(price);
    pricesByIngredient.set(row.ingredient_id, list);
  }

  const ingredients: Ingredient[] = (ingredientResult.data || []).map((row) => {
    const prices = pricesByIngredient.get(row.id) || [];
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      baseUnit: row.base_unit,
      notes: row.notes || undefined,
      usableYieldPercentage: Number(row.usable_yield_percentage),
      yieldLossType: row.yield_loss_type,
      yieldStatus: row.yield_status,
      latestPrice: prices[0],
      prices,
    };
  });

  const itemsByRecipe = new Map<string, Recipe["items"]>();
  for (const row of itemResult.data || []) {
    const list = itemsByRecipe.get(row.recipe_id) || [];
    list.push({
      id: row.id,
      ingredientId: row.ingredient_id || undefined,
      subrecipeId: row.subrecipe_id || undefined,
      quantity: Number(row.quantity),
      unit: row.unit,
    });
    itemsByRecipe.set(row.recipe_id, list);
  }
  const recipes: Recipe[] = (recipeResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    yieldQuantity: Number(row.yield_quantity),
    yieldUnit: row.yield_unit,
    kind: row.recipe_kind,
    items: itemsByRecipe.get(row.id) || [],
  }));

  const products: CostProduct[] = (productResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    saleUnit: row.sale_unit,
    recipeId: row.cost_recipe_id || undefined,
    wastePercentage: Number(row.waste_percentage),
    targetMarginPercentage: Number(row.target_margin_percentage),
  }));

  const rawSettings = settingsResult.data!;
  const settings: CostSettings = {
    vatRate: Number(rawSettings.vat_rate),
    operatingDaysMonth: rawSettings.operating_days_month,
    expectedCashPercentage: Number(rawSettings.expected_cash_percentage),
    expectedDebitPercentage: Number(rawSettings.expected_debit_percentage),
    expectedCreditPercentage: Number(rawSettings.expected_credit_percentage),
    expectedTransferPercentage: Number(
      rawSettings.expected_transfer_percentage,
    ),
    debitFeePercentage: Number(rawSettings.debit_fee_percentage),
    creditFeePercentage: Number(rawSettings.credit_fee_percentage),
    cardFeeModel: rawSettings.card_fee_model,
    cardFeePercentage: Number(rawSettings.card_fee_percentage),
    cardFeeFixedAmount: Number(rawSettings.card_fee_fixed_amount),
    cardFeeVatRate: Number(rawSettings.card_fee_vat_rate),
    cardSettlementDays: rawSettings.card_settlement_days,
    expectedTicketAmount: Number(rawSettings.expected_ticket_amount),
    targetMonthlyProfit: Number(rawSettings.target_monthly_profit),
  };

  const fixedCosts: FixedCost[] = (fixedResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    amount: Number(row.amount),
    period: row.period,
    startsOn: row.starts_on,
    endsOn: row.ends_on || undefined,
    active: row.active,
  }));
  const quantityMap = new Map<string, Record<string, number>>();
  for (const row of scenarioItemResult.data || []) {
    const quantities = quantityMap.get(row.scenario_id) || {};
    quantities[row.product_id] = Number(row.quantity_per_day);
    quantityMap.set(row.scenario_id, quantities);
  }
  const scenarios: Scenario[] = (scenarioResult.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    operatingDays: row.operating_days,
    targetProfit: Number(row.target_profit),
    quantities: quantityMap.get(row.id) || {},
  }));

  const recipeCosts = calculateRecipeCosts(ingredients, recipes);
  const analyses = analyzeProducts(products, recipes, recipeCosts, settings);
  return {
    ingredients,
    recipes,
    recipeCosts: Object.fromEntries(recipeCosts),
    analyses,
    settings,
    fixedCosts,
    monthlyFixedCosts: monthlyFixedCost(
      fixedCosts,
      settings.operatingDaysMonth,
    ),
    scenarios,
  };
}
