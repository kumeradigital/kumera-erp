import { createClient } from "@/server/supabase/server";
import type { Operation, OperationType } from "./types";
export async function getOperationsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const { data: m } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!m) throw new Error("Sin negocio");
  const ledger = await supabase
    .from("opening_ledgers")
    .select("status,recoverable_investment,closed_at")
    .eq("business_id", m.business_id)
    .single();
  if (ledger.error) throw ledger.error;
  let salesQuery = supabase
    .from("sales")
    .select("total,expected_deposit_amount")
    .eq("business_id", m.business_id)
    .eq("status", "completed");
  if (ledger.data.closed_at)
    salesQuery = salesQuery.gte("created_at", ledger.data.closed_at);
  const [ops, ingredients, sales] = await Promise.all([
    supabase
      .from("operational_transactions")
      .select(
        "id,transaction_date,type,description,category,payment_method,gross_amount,net_amount,tax_amount,tax_rate,ingredient_id,purchase_quantity,purchase_unit,supplier,note,ingredients(name)",
      )
      .eq("business_id", m.business_id)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("ingredients")
      .select("id,name,base_unit")
      .eq("business_id", m.business_id)
      .is("deleted_at", null)
      .order("name"),
    salesQuery,
  ]);
  for (const result of [ops, ingredients, sales])
    if (result.error) throw result.error;
  const operations: Operation[] = (ops.data || []).map((r) => {
    const ing = Array.isArray(r.ingredients)
      ? r.ingredients[0]
      : (r.ingredients as { name: string } | null);
    return {
      id: r.id,
      date: r.transaction_date,
      type: r.type as OperationType,
      description: r.description,
      category: r.category,
      gross: Number(r.gross_amount),
      net: Number(r.net_amount),
      tax: Number(r.tax_amount),
      taxRate: Number(r.tax_rate),
      paymentMethod: r.payment_method || undefined,
      ingredientId: r.ingredient_id || undefined,
      supplier: r.supplier || undefined,
      note: r.note || undefined,
      ingredientName: ing?.name,
      purchaseQuantity:
        r.purchase_quantity == null ? undefined : Number(r.purchase_quantity),
      purchaseUnit: r.purchase_unit || undefined,
    };
  });
  const salesTotal = (sales.data || []).reduce(
    (s, r) => s + Number(r.expected_deposit_amount),
    0,
  );
  const operatingIncome = operations
    .filter((o) => o.type === "other_income")
    .reduce((s, o) => s + o.gross, 0);
  const operatingExpenses = operations
    .filter((o) => ["purchase", "fixed_cost", "expense"].includes(o.type))
    .reduce((s, o) => s + o.gross, 0);
  const operatingFlow = salesTotal + operatingIncome - operatingExpenses;
  const investment = Number(ledger.data?.recoverable_investment || 0);
  return {
    operations,
    ingredients: ingredients.data || [],
    ledger: ledger.data,
    summary: {
      salesTotal,
      operatingIncome,
      operatingExpenses,
      operatingFlow,
      investment,
      recovered: Math.max(0, Math.min(investment, operatingFlow)),
      pending: Math.max(0, investment - operatingFlow),
    },
  };
}
