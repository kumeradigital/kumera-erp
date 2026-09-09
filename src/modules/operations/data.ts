import { createClient } from "@/server/supabase/server";
import type {
  FinancialCutoff,
  FinancialObligation,
  Operation,
  OperationType,
} from "./types";

type Reconciliation = {
  actual_cash_sales: number | string;
  actual_debit_sales: number | string;
  actual_credit_sales: number | string;
  actual_transfer_sales: number | string;
  commission_net_amount: number | string;
  commission_tax_amount: number | string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

export async function getOperationsData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");

  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!membership) throw new Error("Sin negocio");

  const [ledger, cutoffResult] = await Promise.all([
    supabase
      .from("opening_ledgers")
      .select("status,recoverable_investment,closed_at")
      .eq("business_id", membership.business_id)
      .single(),
    supabase
      .from("financial_cutoffs")
      .select(
        "cutoff_at,cutoff_date,opening_bank_amount,opening_cash_amount,pending_receivables,note",
      )
      .eq("business_id", membership.business_id)
      .order("cutoff_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (ledger.error) throw ledger.error;
  if (cutoffResult.error) throw cutoffResult.error;
  if (!cutoffResult.data)
    throw new Error("Falta crear el corte financiero inicial");

  const cutoff: FinancialCutoff = {
    cutoffAt: cutoffResult.data.cutoff_at,
    cutoffDate: cutoffResult.data.cutoff_date,
    openingBank: Number(cutoffResult.data.opening_bank_amount),
    openingCash: Number(cutoffResult.data.opening_cash_amount),
    pendingReceivables: Number(cutoffResult.data.pending_receivables),
    note: cutoffResult.data.note || undefined,
  };

  const [ops, ingredients, sessions, obligationsResult] = await Promise.all([
    supabase
      .from("operational_transactions")
      .select(
        "id,transaction_date,type,description,category,payment_method,gross_amount,net_amount,tax_amount,tax_rate,ingredient_id,purchase_quantity,purchase_unit,supplier,note,financial_status,ingredients(name)",
      )
      .eq("business_id", membership.business_id)
      .order("transaction_date", { ascending: false }),
    supabase
      .from("ingredients")
      .select("id,name,base_unit")
      .eq("business_id", membership.business_id)
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("cash_sessions")
      .select(
        "id,opened_at,cash_session_reconciliations(actual_cash_sales,actual_debit_sales,actual_credit_sales,actual_transfer_sales,commission_net_amount,commission_tax_amount),cash_session_withdrawals(amount,created_at)",
      )
      .eq("business_id", membership.business_id)
      .eq("status", "closed")
      .gte("opened_at", cutoff.cutoffAt),
    supabase
      .from("financial_obligations")
      .select("id,name,amount,due_date,kind,recurrence,status,note")
      .eq("business_id", membership.business_id)
      .eq("status", "pending")
      .order("due_date"),
  ]);
  for (const result of [ops, ingredients, sessions, obligationsResult])
    if (result.error) throw result.error;

  const operations: Operation[] = (ops.data || []).map((row) => {
    const ingredient = one(
      row.ingredients as { name: string } | { name: string }[] | null,
    );
    return {
      id: row.id,
      date: row.transaction_date,
      type: row.type as OperationType,
      description: row.description,
      category: row.category,
      gross: Number(row.gross_amount),
      net: Number(row.net_amount),
      tax: Number(row.tax_amount),
      taxRate: Number(row.tax_rate),
      paymentMethod: row.payment_method || undefined,
      ingredientId: row.ingredient_id || undefined,
      supplier: row.supplier || undefined,
      note: row.note || undefined,
      financialStatus: row.financial_status,
      ingredientName: ingredient?.name,
      purchaseQuantity:
        row.purchase_quantity == null
          ? undefined
          : Number(row.purchase_quantity),
      purchaseUnit: row.purchase_unit || undefined,
    };
  });

  const verifiedAfterCutoff = operations.filter(
    (operation) =>
      operation.date > cutoff.cutoffDate &&
      operation.financialStatus === "verified",
  );
  const isIncome = (operation: Operation) =>
    ["other_income", "owner_contribution"].includes(operation.type);
  const cashOperations = verifiedAfterCutoff.filter(
    (operation) => operation.paymentMethod === "cash",
  );
  const bankOperations = verifiedAfterCutoff.filter(
    (operation) => operation.paymentMethod !== "cash",
  );
  const signedTotal = (items: Operation[]) =>
    items.reduce(
      (total, operation) =>
        total + (isIncome(operation) ? operation.gross : -operation.gross),
      0,
    );

  let cashSales = 0;
  let bankSales = 0;
  let cardFees = 0;
  let withdrawals = 0;
  for (const session of sessions.data || []) {
    const reconciliation = one(
      session.cash_session_reconciliations as
        Reconciliation | Reconciliation[] | null,
    );
    if (reconciliation) {
      cashSales += Number(reconciliation.actual_cash_sales || 0);
      bankSales +=
        Number(reconciliation.actual_debit_sales || 0) +
        Number(reconciliation.actual_credit_sales || 0) +
        Number(reconciliation.actual_transfer_sales || 0);
      cardFees +=
        Number(reconciliation.commission_net_amount || 0) +
        Number(reconciliation.commission_tax_amount || 0);
    }
    withdrawals += (session.cash_session_withdrawals || []).reduce(
      (total, withdrawal) => total + Number(withdrawal.amount),
      0,
    );
  }

  const operatingExpenses = verifiedAfterCutoff
    .filter((operation) => !isIncome(operation))
    .reduce((total, operation) => total + operation.gross, 0);
  const operatingIncome = verifiedAfterCutoff
    .filter(isIncome)
    .reduce((total, operation) => total + operation.gross, 0);
  const expectedCash =
    cutoff.openingCash + cashSales + signedTotal(cashOperations) - withdrawals;
  const expectedBank =
    cutoff.openingBank + bankSales - cardFees + signedTotal(bankOperations);

  const obligations: FinancialObligation[] = (obligationsResult.data || []).map(
    (row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount),
      dueDate: row.due_date,
      kind: row.kind,
      recurrence: row.recurrence || undefined,
      note: row.note || undefined,
    }),
  );

  return {
    operations,
    ingredients: ingredients.data || [],
    ledger: ledger.data,
    cutoff,
    obligations,
    summary: {
      openingBalance: cutoff.openingBank + cutoff.openingCash,
      expectedBank,
      expectedCash,
      expectedTotal: expectedBank + expectedCash,
      salesTotal: cashSales + bankSales,
      cardFees,
      operatingIncome,
      operatingExpenses,
      withdrawals,
      pendingObligations: obligations.reduce(
        (total, item) => total + item.amount,
        0,
      ),
    },
  };
}
