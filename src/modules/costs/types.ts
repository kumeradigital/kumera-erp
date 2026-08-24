export type CostUnit = "g" | "kg" | "ml" | "l" | "unit";
export type YieldUnit = "unit" | "kg";
export type RecipeKind = "subrecipe" | "final";
export type FixedCostPeriod =
  "daily" | "monthly" | "quarterly" | "semiannual" | "annual";

export type IngredientPrice = {
  id: string;
  purchaseQuantity: number;
  purchaseUnit: CostUnit;
  baseQuantity: number;
  grossAmount: number;
  netAmount: number;
  taxAmount: number;
  supplier?: string;
  purchaseDate: string;
  costPerBase: number;
};

export type Ingredient = {
  id: string;
  name: string;
  category: string;
  baseUnit: "g" | "ml" | "unit";
  notes?: string;
  usableYieldPercentage?: number;
  yieldLossType?: "none" | "cleaning" | "cooking" | "bone_skin" | "combined";
  yieldStatus?: "estimated" | "confirmed";
  latestPrice?: IngredientPrice;
  prices: IngredientPrice[];
};

export type RecipeItem = {
  id: string;
  ingredientId?: string;
  subrecipeId?: string;
  quantity: number;
  unit: CostUnit;
};

export type Recipe = {
  id: string;
  name: string;
  description?: string;
  yieldQuantity: number;
  yieldUnit: YieldUnit;
  kind: RecipeKind;
  items: RecipeItem[];
};

export type RecipeCost = {
  total: number;
  perYieldUnit: number;
  complete: boolean;
  missing: string[];
};

export type CostSettings = {
  vatRate: number;
  operatingDaysMonth: number;
  expectedCashPercentage: number;
  expectedDebitPercentage: number;
  expectedCreditPercentage: number;
  expectedTransferPercentage: number;
  debitFeePercentage: number;
  creditFeePercentage: number;
  cardFeeModel: "none" | "percentage" | "mixed";
  cardFeePercentage: number;
  cardFeeFixedAmount: number;
  cardFeeVatRate: number;
  cardSettlementDays: number;
  expectedTicketAmount: number;
  targetMonthlyProfit: number;
};

export type CostProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  saleUnit: "unit" | "kg";
  recipeId?: string;
  wastePercentage: number;
  targetMarginPercentage: number;
  isSalesFamily: boolean;
  familyProductId?: string;
};

export type ProductCostAnalysis = CostProduct & {
  recipeName?: string;
  physicalCost: number;
  wasteCost: number;
  commissionCost: number;
  variableCost: number;
  netRevenue: number;
  contribution: number;
  contributionPercentage: number;
  suggestedPrice: number;
  complete: boolean;
  missing: string[];
};

export type FixedCost = {
  id: string;
  name: string;
  category: string;
  amount: number;
  period: FixedCostPeriod;
  startsOn: string;
  endsOn?: string;
  active: boolean;
};

export type Scenario = {
  id: string;
  name: string;
  operatingDays: number;
  targetProfit: number;
  quantities: Record<string, number>;
};
