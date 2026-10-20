import { createClient } from "@/server/supabase/server";
import type {
  FinancialCutoff,
  FinancialObligation,
  ExpenseProvision,
  Operation,
  OperationType,
} from "./types";
import { calculateTaxReserve } from "./calculations";

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

function liquidityCycle(today: string) {
  const [year, month, day] = today.split("-").map(Number);
  const start =
    day >= 5
      ? new Date(Date.UTC(year, month - 1, 5))
      : new Date(Date.UTC(year, month - 2, 5));
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 4),
  );
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function provisionCoversObligation(
  provision: ExpenseProvision,
  obligation: FinancialObligation,
) {
  if (provision.status === "cancelled" || !provision.dueDate) return false;
  const dueDateDistance = Math.abs(
    Date.parse(`${provision.dueDate}T12:00:00Z`) -
      Date.parse(`${obligation.dueDate}T12:00:00Z`),
  );
  if (dueDateDistance > 45 * 24 * 60 * 60 * 1000) return false;

  const provisionName = provision.name.toLocaleLowerCase("es");
  const obligationName = obligation.name.toLocaleLowerCase("es");
  const sameConcept = (terms: string[]) =>
    terms.some(
      (term) => provisionName.includes(term) && obligationName.includes(term),
    );

  if (sameConcept(["arriendo", "electricidad", "gas"])) return true;
  if (
    /imposiciones|cotizaciones/.test(provisionName) &&
    /imposiciones|cotizaciones/.test(obligationName)
  )
    return true;

  return ["panadero", "pastelera", "cajera"].some(
    (role) => provisionName.includes(role) && obligationName.includes(role),
  );
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

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const currentMonth = today.slice(0, 7);
  const cycle = liquidityCycle(today);
  const { error: provisionAutomationError } = await supabase.rpc(
    "ensure_monthly_expense_provisions",
    {
      p_business_id: membership.business_id,
      p_month: `${currentMonth}-01`,
      p_created_by: user.id,
    },
  );
  if (provisionAutomationError) throw provisionAutomationError;

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

  const monthStart = `${currentMonth}-01T00:00:00`;
  const sessionQueryStart =
    Date.parse(cutoffResult.data.cutoff_at) < Date.parse(monthStart)
      ? cutoffResult.data.cutoff_at
      : monthStart;

  const cutoff: FinancialCutoff = {
    cutoffAt: cutoffResult.data.cutoff_at,
    cutoffDate: cutoffResult.data.cutoff_date,
    openingBank: Number(cutoffResult.data.opening_bank_amount),
    openingCash: Number(cutoffResult.data.opening_cash_amount),
    pendingReceivables: Number(cutoffResult.data.pending_receivables),
    note: cutoffResult.data.note || undefined,
  };

  const [ops, ingredients, sessions, obligationsResult, provisionsResult] =
    await Promise.all([
      supabase
        .from("operational_transactions")
        .select(
          "id,transaction_date,economic_month,provision_id,financial_obligation_id,affects_profitability,profitability_amount,principal_amount,interest_amount,charges_amount,type,description,category,payment_method,gross_amount,net_amount,tax_amount,tax_rate,ingredient_id,purchase_quantity,purchase_unit,supplier,note,financial_status,created_at,ingredients(name)",
        )
        .eq("business_id", membership.business_id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("ingredients")
        .select("id,name,base_unit")
        .eq("business_id", membership.business_id)
        .is("deleted_at", null)
        .order("name"),
      supabase
        .from("cash_sessions")
        .select(
          "id,opened_at,closed_at,cash_session_reconciliations(actual_cash_sales,actual_debit_sales,actual_credit_sales,actual_transfer_sales,commission_net_amount,commission_tax_amount),cash_session_withdrawals(amount,category,is_business_expense,created_at)",
        )
        .eq("business_id", membership.business_id)
        .eq("status", "closed")
        .gte("closed_at", sessionQueryStart),
      supabase
        .from("financial_obligations")
        .select(
          "id,name,amount,due_date,kind,recurrence,carry_amount,status,note,principal_amount,interest_amount,charges_amount",
        )
        .eq("business_id", membership.business_id)
        .eq("status", "pending")
        .order("due_date"),
      supabase
        .from("expense_provisions")
        .select(
          "id,name,category,economic_month,expected_amount,due_date,affects_profitability,status,note,tracking_mode,unit_label,operational_transactions(gross_amount,financial_status,provision_units)",
        )
        .eq("business_id", membership.business_id)
        .order("economic_month", { ascending: false })
        .order("due_date"),
    ]);
  for (const result of [
    ops,
    ingredients,
    sessions,
    obligationsResult,
    provisionsResult,
  ])
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
      economicMonth: row.economic_month,
      provisionId: row.provision_id || undefined,
      affectsProfitability: row.affects_profitability,
      profitabilityAmount: Number(row.profitability_amount),
      financialObligationId: row.financial_obligation_id || undefined,
      principalAmount: Number(row.principal_amount),
      interestAmount: Number(row.interest_amount),
      chargesAmount: Number(row.charges_amount),
      financialStatus: row.financial_status,
      ingredientName: ingredient?.name,
      purchaseQuantity:
        row.purchase_quantity == null
          ? undefined
          : Number(row.purchase_quantity),
      purchaseUnit: row.purchase_unit || undefined,
    };
  });

  const createdAfterCutoff = new Set(
    (ops.data || [])
      .filter((row) => Date.parse(row.created_at) > Date.parse(cutoff.cutoffAt))
      .map((row) => row.id),
  );
  const verifiedAfterCutoff = operations.filter(
    (operation) =>
      createdAfterCutoff.has(operation.id) &&
      operation.financialStatus === "verified",
  );
  const isIncome = (operation: Operation) =>
    ["other_income", "owner_contribution"].includes(operation.type);
  const countsInMonthlyBooks = (operation: Operation) =>
    ["verified", "historical_verified"].includes(operation.financialStatus);
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
  let monthlySales = 0;
  let monthlyCardFees = 0;
  let monthlyCardFeeTaxCredit = 0;
  let monthlyCashWithdrawals = 0;
  let monthlyBusinessCashWithdrawals = 0;
  let cardFees = 0;
  let withdrawals = 0;
  let cycleSales = 0;
  let cycleOwnerWithdrawals = 0;
  for (const session of sessions.data || []) {
    const reconciliation = one(
      session.cash_session_reconciliations as
        Reconciliation | Reconciliation[] | null,
    );
    if (reconciliation) {
      const sessionCashSales = Number(reconciliation.actual_cash_sales || 0);
      const sessionBankSales =
        Number(reconciliation.actual_debit_sales || 0) +
        Number(reconciliation.actual_credit_sales || 0) +
        Number(reconciliation.actual_transfer_sales || 0);
      if (
        session.closed_at &&
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Santiago",
          year: "numeric",
          month: "2-digit",
        }).format(new Date(session.closed_at)) === currentMonth
      ) {
        monthlySales += sessionCashSales + sessionBankSales;
        monthlyCardFees +=
          Number(reconciliation.commission_net_amount || 0) +
          Number(reconciliation.commission_tax_amount || 0);
        monthlyCardFeeTaxCredit += Number(
          reconciliation.commission_tax_amount || 0,
        );
      }
      const closedDate = session.closed_at
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(session.closed_at))
        : "";
      if (closedDate >= cycle.start && closedDate <= cycle.end)
        cycleSales += sessionCashSales + sessionBankSales;
      if (
        session.closed_at &&
        Date.parse(session.closed_at) > Date.parse(cutoff.cutoffAt)
      ) {
        cashSales += sessionCashSales;
        bankSales += sessionBankSales;
        cardFees +=
          Number(reconciliation.commission_net_amount || 0) +
          Number(reconciliation.commission_tax_amount || 0);
      }
    }
    if (
      session.closed_at &&
      Date.parse(session.closed_at) > Date.parse(cutoff.cutoffAt)
    )
      withdrawals += (session.cash_session_withdrawals || []).reduce(
        (total, withdrawal) => total + Number(withdrawal.amount),
        0,
      );
    for (const withdrawal of session.cash_session_withdrawals || []) {
      const belongsToMonth =
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Santiago",
          year: "numeric",
          month: "2-digit",
        }).format(new Date(withdrawal.created_at)) === currentMonth;
      if (!belongsToMonth) continue;
      if (withdrawal.is_business_expense)
        monthlyBusinessCashWithdrawals += Number(withdrawal.amount);
      else monthlyCashWithdrawals += Number(withdrawal.amount);
      const withdrawalDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(withdrawal.created_at));
      if (
        !withdrawal.is_business_expense &&
        withdrawalDate >= cycle.start &&
        withdrawalDate <= cycle.end
      )
        cycleOwnerWithdrawals += Number(withdrawal.amount);
    }
  }

  const monthlyEconomicExpenses = operations
    .filter(
      (operation) =>
        operation.economicMonth.slice(0, 7) === currentMonth &&
        countsInMonthlyBooks(operation) &&
        operation.affectsProfitability &&
        !operation.provisionId &&
        ["fixed_cost", "expense"].includes(operation.type),
    )
    .reduce((total, operation) => total + operation.profitabilityAmount, 0);
  const monthlyByType = (type: OperationType) =>
    operations
      .filter(
        (operation) =>
          operation.date.slice(0, 7) === currentMonth &&
          countsInMonthlyBooks(operation) &&
          operation.affectsProfitability &&
          operation.type === type,
      )
      .reduce((total, operation) => total + operation.gross, 0);
  const monthlyOwnerWithdrawals =
    monthlyCashWithdrawals +
    operations
      .filter(
        (operation) =>
          operation.date.slice(0, 7) === currentMonth &&
          countsInMonthlyBooks(operation) &&
          operation.type === "owner_withdrawal",
      )
      .reduce((total, operation) => total + operation.gross, 0);
  const monthlyPurchaseTaxCredit = operations
    .filter(
      (operation) =>
        operation.date.slice(0, 7) === currentMonth &&
        countsInMonthlyBooks(operation) &&
        ["purchase", "fixed_cost", "expense"].includes(operation.type),
    )
    .reduce((total, operation) => total + operation.tax, 0);
  const taxReserve = calculateTaxReserve({
    grossSales: monthlySales,
    purchaseTaxCredit: monthlyPurchaseTaxCredit,
    cardFeeTaxCredit: monthlyCardFeeTaxCredit,
  });
  const operatingIncome = verifiedAfterCutoff
    .filter(isIncome)
    .reduce((total, operation) => total + operation.gross, 0);
  const expectedCash =
    cutoff.openingCash + cashSales + signedTotal(cashOperations);
  const expectedBank =
    cutoff.openingBank + bankSales - cardFees + signedTotal(bankOperations);

  const allObligations: FinancialObligation[] = (
    obligationsResult.data || []
  ).map((row) => ({
    id: row.id,
    name: row.name,
    amount: row.amount == null ? null : Number(row.amount),
    dueDate: row.due_date,
    kind: row.kind,
    recurrence: row.recurrence || undefined,
    carryAmount: Boolean(row.carry_amount),
    note: row.note || undefined,
    principalAmount: Number(row.principal_amount),
    interestAmount: Number(row.interest_amount),
    chargesAmount: Number(row.charges_amount),
  }));

  const provisions: ExpenseProvision[] = (provisionsResult.data || []).map(
    (row) => {
      const paidAmount = (row.operational_transactions || [])
        .filter((payment) => payment.financial_status === "verified")
        .reduce((total, payment) => total + Number(payment.gross_amount), 0);
      const expectedAmount = Number(row.expected_amount);
      const trackingMode = row.tracking_mode as
        "fixed_target" | "accumulating_actual";
      const trackedUnits = (row.operational_transactions || [])
        .filter((payment) => payment.financial_status === "verified")
        .reduce(
          (total, payment) => total + Number(payment.provision_units || 0),
          0,
        );
      const calculatedStatus =
        row.status === "cancelled"
          ? "cancelled"
          : trackingMode === "accumulating_actual"
            ? paidAmount > 0
              ? "partial"
              : "estimated"
            : paidAmount >= expectedAmount
              ? "reconciled"
              : paidAmount > 0
                ? "partial"
                : "estimated";
      return {
        id: row.id,
        name: row.name,
        category: row.category,
        economicMonth: row.economic_month,
        expectedAmount,
        paidAmount,
        outstandingAmount:
          trackingMode === "accumulating_actual"
            ? 0
            : Math.max(0, expectedAmount - paidAmount),
        trackingMode,
        unitLabel: row.unit_label || undefined,
        trackedUnits,
        economicAmount:
          trackingMode === "accumulating_actual"
            ? Math.max(expectedAmount, paidAmount)
            : expectedAmount,
        dueDate: row.due_date || undefined,
        affectsProfitability: row.affects_profitability,
        status: calculatedStatus,
        note: row.note || undefined,
      };
    },
  );
  const obligations = allObligations.filter(
    (obligation) =>
      !provisions.some((provision) =>
        provisionCoversObligation(provision, obligation),
      ),
  );
  const currentEconomicProvisions = provisions.filter(
    (item) =>
      item.economicMonth.slice(0, 7) === currentMonth &&
      item.affectsProfitability &&
      item.status !== "cancelled",
  );
  const provisionedExpenses = currentEconomicProvisions.reduce(
    (total, item) => total + item.economicAmount,
    0,
  );
  const cycleOperations = operations.filter(
    (operation) =>
      operation.date >= cycle.start &&
      operation.date <= cycle.end &&
      countsInMonthlyBooks(operation),
  );
  const cycleOtherIncome = cycleOperations
    .filter((operation) =>
      ["other_income", "owner_contribution"].includes(operation.type),
    )
    .reduce((total, operation) => total + operation.gross, 0);
  const cyclePaidOutflows = cycleOperations
    .filter(
      (operation) =>
        !["other_income", "owner_contribution", "owner_withdrawal"].includes(
          operation.type,
        ),
    )
    .reduce((total, operation) => total + operation.gross, 0);
  cycleOwnerWithdrawals += cycleOperations
    .filter((operation) => operation.type === "owner_withdrawal")
    .reduce((total, operation) => total + operation.gross, 0);
  const cyclePendingPayments = obligations
    .filter((item) => item.dueDate >= cycle.start && item.dueDate <= cycle.end)
    .reduce((total, item) => total + (item.amount || 0), 0);

  return {
    operations,
    ingredients: ingredients.data || [],
    ledger: ledger.data,
    cutoff,
    obligations,
    provisions,
    summary: {
      openingBalance: cutoff.openingBank + cutoff.openingCash,
      expectedBank,
      expectedCash,
      expectedTotal: expectedBank + expectedCash,
      salesTotal: monthlySales,
      netSalesAfterVat: monthlySales - taxReserve.salesTaxDebit,
      cardFees,
      monthlyCardFees,
      operatingIncome,
      operatingExpenses:
        monthlyEconomicExpenses +
        provisionedExpenses +
        monthlyBusinessCashWithdrawals,
      monthlyEconomicExpenses,
      provisionedExpenses,
      monthlyBusinessCashWithdrawals,
      monthlyPurchases: monthlyByType("purchase"),
      monthlyFixedPayments: monthlyByType("fixed_cost"),
      monthlyVariableExpenses: monthlyByType("expense"),
      withdrawals,
      monthlyOwnerWithdrawals,
      pendingObligations: obligations.reduce(
        (total, item) =>
          total +
          (item.dueDate.slice(0, 7) <= currentMonth ? item.amount || 0 : 0),
        0,
      ),
      ...taxReserve,
      availableLiquidity:
        expectedBank +
        expectedCash -
        obligations.reduce(
          (total, item) =>
            total +
            (item.dueDate.slice(0, 7) <= currentMonth ? item.amount || 0 : 0),
          0,
        ) -
        taxReserve.estimatedVatPayable,
      cashCycle: {
        ...cycle,
        sales: cycleSales,
        otherIncome: cycleOtherIncome,
        paidOutflows: cyclePaidOutflows,
        ownerWithdrawals: cycleOwnerWithdrawals,
        pendingPayments: cyclePendingPayments,
        projectedAvailable:
          expectedBank +
          expectedCash -
          cyclePendingPayments -
          taxReserve.estimatedVatPayable,
      },
    },
  };
}
