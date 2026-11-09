import { createClient } from "@/server/supabase/server";
import { getCostingData } from "@/modules/costs/data";
import type {
  FinancialCutoff,
  FinancialObligation,
  ExpenseProvision,
  Operation,
  OperationType,
  MonthlyFinancialSummary,
} from "./types";
import { calculateTaxReserve } from "./calculations";
import { normalizeOperationCategory } from "./categories";

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

function previousMonthKey(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 2, 1)).toISOString().slice(0, 7);
}

function monthName(month: string) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${month}-15T12:00:00Z`));
}

function nextMonthPaymentDate(economicMonth: string, day: number) {
  const [year, month] = economicMonth.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
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
  const previousMonth = previousMonthKey(currentMonth);
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

  const monthStart = "2026-10-01T00:00:00";
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
          "id,opened_at,closed_at,cash_session_reconciliations(actual_cash_sales,actual_debit_sales,actual_credit_sales,actual_transfer_sales,commission_net_amount,commission_tax_amount),cash_session_withdrawals(amount,reason,category,is_business_expense,created_at)",
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

  const historicalSessionIds = (sessions.data || []).map(
    (session) => session.id,
  );
  const [historicalSalesResult, historicalCosting] = await Promise.all([
    historicalSessionIds.length
      ? supabase
          .from("sales")
          .select(
            "cash_session_id,sale_items(product_id,quantity,line_total,products(product_categories(name)))",
          )
          .eq("business_id", membership.business_id)
          .eq("status", "completed")
          .in("cash_session_id", historicalSessionIds)
      : Promise.resolve({ data: [], error: null }),
    getCostingData({ includeArchivedProducts: true }),
  ]);
  if (historicalSalesResult.error) throw historicalSalesResult.error;

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
  let previousMonthSales = 0;
  let monthlyCardFees = 0;
  let monthlyCardFeeTaxCredit = 0;
  let previousMonthCardFeeTaxCredit = 0;
  let monthlyCashWithdrawals = 0;
  let monthlyBusinessCashWithdrawals = 0;
  let cardFees = 0;
  let withdrawals = 0;
  let cycleSales = 0;
  let cycleOwnerWithdrawals = 0;
  let currentMonthClosedDays = 0;
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
        currentMonthClosedDays += 1;
        monthlySales += sessionCashSales + sessionBankSales;
        monthlyCardFees +=
          Number(reconciliation.commission_net_amount || 0) +
          Number(reconciliation.commission_tax_amount || 0);
        monthlyCardFeeTaxCredit += Number(
          reconciliation.commission_tax_amount || 0,
        );
      }
      if (
        session.closed_at &&
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Santiago",
          year: "numeric",
          month: "2-digit",
        }).format(new Date(session.closed_at)) === previousMonth
      ) {
        previousMonthSales += sessionCashSales + sessionBankSales;
        previousMonthCardFeeTaxCredit += Number(
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
  const previousMonthPurchaseTaxCredit = operations
    .filter(
      (operation) =>
        operation.date.slice(0, 7) === previousMonth &&
        countsInMonthlyBooks(operation) &&
        ["purchase", "fixed_cost", "expense"].includes(operation.type),
    )
    .reduce((total, operation) => total + operation.tax, 0);
  const taxReserve = calculateTaxReserve({
    grossSales: monthlySales,
    purchaseTaxCredit: monthlyPurchaseTaxCredit,
    cardFeeTaxCredit: monthlyCardFeeTaxCredit,
  });
  const previousMonthTax = calculateTaxReserve({
    grossSales: previousMonthSales,
    purchaseTaxCredit: previousMonthPurchaseTaxCredit,
    cardFeeTaxCredit: previousMonthCardFeeTaxCredit,
  });
  const operatingIncome = verifiedAfterCutoff
    .filter(isIncome)
    .reduce((total, operation) => total + operation.gross, 0);
  const expectedCash =
    cutoff.openingCash + cashSales + signedTotal(cashOperations);
  const expectedBank =
    cutoff.openingBank + bankSales - cardFees + signedTotal(bankOperations);

  let obligationRows = obligationsResult.data || [];
  const currentLoanExists = obligationRows.some(
    (row) =>
      row.kind === "loan_payment" &&
      row.due_date.slice(0, 7) === currentMonth &&
      row.status !== "cancelled",
  );
  if (currentMonth === "2026-11" && !currentLoanExists) {
    const { data: createdLoan, error: createdLoanError } = await supabase
      .from("financial_obligations")
      .insert({
        business_id: membership.business_id,
        name: "Cuota crédito noviembre",
        amount: 264000,
        due_date: "2026-11-10",
        kind: "loan_payment",
        recurrence: "monthly",
        carry_amount: true,
        status: "pending",
        note: "Cuota mensual recurrente. Registrar el pago aunque el desglose entre capital, intereses y cargos todavía esté pendiente.",
        principal_amount: 0,
        interest_amount: 0,
        charges_amount: 0,
        created_by: user.id,
      })
      .select(
        "id,name,amount,due_date,kind,recurrence,carry_amount,status,note,principal_amount,interest_amount,charges_amount",
      )
      .single();
    if (createdLoanError) throw createdLoanError;
    obligationRows = [...obligationRows, createdLoan];
  }

  const previousMonthLabel = monthName(previousMonth);
  const previousVatExists = obligationRows.some(
    (row) =>
      row.name.toLocaleLowerCase("es").includes("iva") &&
      row.name.toLocaleLowerCase("es").includes(previousMonthLabel),
  );
  if (previousMonthTax.estimatedVatPayable > 0 && !previousVatExists) {
    const { data: createdVat, error: createdVatError } = await supabase
      .from("financial_obligations")
      .insert({
        business_id: membership.business_id,
        name: `IVA ${previousMonthLabel} (estimado)`,
        amount: null,
        due_date: `${currentMonth}-20`,
        kind: "payable",
        recurrence: null,
        carry_amount: false,
        status: "pending",
        note: "Generado automáticamente al comenzar el mes. Confirmar el monto con la propuesta F29 del SII antes de pagar.",
        created_by: user.id,
      })
      .select(
        "id,name,amount,due_date,kind,recurrence,carry_amount,status,note,principal_amount,interest_amount,charges_amount",
      )
      .single();
    if (createdVatError) throw createdVatError;
    obligationRows = [...obligationRows, createdVat];
  }
  const allObligations: FinancialObligation[] = obligationRows
    .filter((row) => row.status === "pending")
    .map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount == null ? null : Number(row.amount),
      erpEstimatedAmount:
        /iva|f29|formulario 29/i.test(row.name) &&
        row.due_date.slice(0, 7) === currentMonth
          ? previousMonthTax.estimatedVatPayable
          : undefined,
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
      const rawNote = row.note || "";
      const estimateMarker = rawNote.match(/\[ERP_ESTIMATE:(\d+)\]/);
      const paidAmount = (row.operational_transactions || [])
        .filter((payment) => payment.financial_status === "verified")
        .reduce((total, payment) => total + Number(payment.gross_amount), 0);
      const expectedAmount = Number(row.expected_amount);
      const provisionIdentity = `${row.category} ${row.name}`.toLocaleLowerCase(
        "es",
      );
      const trackingMode = (
        /electric|luz/.test(provisionIdentity)
          ? "actual_bill"
          : row.tracking_mode
      ) as "fixed_target" | "accumulating_actual" | "actual_bill";
      const trackedUnits = (row.operational_transactions || [])
        .filter((payment) => payment.financial_status === "verified")
        .reduce(
          (total, payment) => total + Number(payment.provision_units || 0),
          0,
        );
      const calculatedStatus =
        row.status === "cancelled"
          ? "cancelled"
          : row.status === "reconciled"
            ? "reconciled"
            : trackingMode === "accumulating_actual"
              ? paidAmount > 0
                ? "partial"
                : "estimated"
              : paidAmount >= expectedAmount
                ? "reconciled"
                : paidAmount > 0
                  ? "partial"
                  : "estimated";
      const normalizedDueDate = /remuner|sueldo/.test(provisionIdentity)
        ? nextMonthPaymentDate(row.economic_month, 5)
        : /cotiza|previsional|imposiciones/.test(provisionIdentity)
          ? nextMonthPaymentDate(row.economic_month, 10)
          : row.due_date || undefined;
      return {
        id: row.id,
        name: row.name,
        category: normalizeOperationCategory(
          row.category,
          "fixed_cost",
          row.name,
        ),
        economicMonth: row.economic_month,
        expectedAmount,
        erpEstimatedAmount: estimateMarker
          ? Number(estimateMarker[1])
          : undefined,
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
            ? calculatedStatus === "reconciled"
              ? paidAmount
              : Math.max(expectedAmount, paidAmount)
            : expectedAmount,
        dueDate: normalizedDueDate,
        affectsProfitability: row.affects_profitability,
        status: calculatedStatus,
        note:
          rawNote.replace(/\s*\[ERP_ESTIMATE:\d+\]\s*/g, " ").trim() ||
          undefined,
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
  const provisionsDueThisMonth = provisions.filter(
    (item) =>
      item.trackingMode === "fixed_target" &&
      item.status !== "cancelled" &&
      item.outstandingAmount > 0 &&
      item.dueDate != null &&
      item.dueDate.slice(0, 7) <= currentMonth,
  );
  const pendingProvisions = provisionsDueThisMonth.reduce(
    (total, item) => total + item.outstandingAmount,
    0,
  );
  const obligationAmountDueThisMonth = (item: FinancialObligation) =>
    item.dueDate.slice(0, 7) <= currentMonth
      ? (item.amount ?? item.erpEstimatedAmount ?? 0)
      : 0;
  const pendingVatObligations = obligations
    .filter((item) => /iva|impuesto|f29|formulario 29/i.test(item.name))
    .reduce((total, item) => total + obligationAmountDueThisMonth(item), 0);
  const pendingOtherObligations = obligations
    .filter((item) => !/iva|impuesto|f29|formulario 29/i.test(item.name))
    .reduce((total, item) => total + obligationAmountDueThisMonth(item), 0);
  const pendingObligations = pendingVatObligations + pendingOtherObligations;

  const monthBySession = new Map<string, string>();
  const reconciledByMonth = new Map<
    string,
    {
      grossSales: number;
      closedDays: number;
      commissionNet: number;
      commissionTax: number;
    }
  >();
  for (const session of sessions.data || []) {
    if (!session.closed_at) continue;
    const month = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
    }).format(new Date(session.closed_at));
    monthBySession.set(session.id, month);
    const reconciliation = one(
      session.cash_session_reconciliations as
        Reconciliation | Reconciliation[] | null,
    );
    if (!reconciliation) continue;
    const accumulated = reconciledByMonth.get(month) || {
      grossSales: 0,
      closedDays: 0,
      commissionNet: 0,
      commissionTax: 0,
    };
    accumulated.grossSales +=
      Number(reconciliation.actual_cash_sales || 0) +
      Number(reconciliation.actual_debit_sales || 0) +
      Number(reconciliation.actual_credit_sales || 0) +
      Number(reconciliation.actual_transfer_sales || 0);
    accumulated.closedDays += 1;
    accumulated.commissionNet += Number(
      reconciliation.commission_net_amount || 0,
    );
    accumulated.commissionTax += Number(
      reconciliation.commission_tax_amount || 0,
    );
    reconciledByMonth.set(month, accumulated);
  }

  const analysisMap = new Map(
    historicalCosting.analyses.map((analysis) => [analysis.id, analysis]),
  );
  const cashBusinessWithdrawalsByMonth = new Map<string, number>();
  const cashOwnerWithdrawalsByMonth = new Map<string, number>();
  const cashWithdrawalCategoriesByMonth = new Map<
    string,
    Map<string, number>
  >();
  const cashWithdrawalDetailsByMonth = new Map<
    string,
    Map<string, Map<string, number>>
  >();
  for (const session of sessions.data || []) {
    for (const withdrawal of session.cash_session_withdrawals || []) {
      const month = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(withdrawal.created_at));
      const amount = Number(withdrawal.amount);
      const target = withdrawal.is_business_expense
        ? cashBusinessWithdrawalsByMonth
        : cashOwnerWithdrawalsByMonth;
      target.set(month, (target.get(month) || 0) + amount);
      const categories =
        cashWithdrawalCategoriesByMonth.get(month) || new Map<string, number>();
      const category = withdrawal.is_business_expense
        ? withdrawal.category || "Gastos desde caja"
        : "Retiros personales";
      categories.set(category, (categories.get(category) || 0) + amount);
      cashWithdrawalCategoriesByMonth.set(month, categories);
      const monthDetails =
        cashWithdrawalDetailsByMonth.get(month) ||
        new Map<string, Map<string, number>>();
      const categoryDetails =
        monthDetails.get(category) || new Map<string, number>();
      const description = withdrawal.reason || "Retiro registrado en caja";
      categoryDetails.set(
        description,
        (categoryDetails.get(description) || 0) + amount,
      );
      monthDetails.set(category, categoryDetails);
      cashWithdrawalDetailsByMonth.set(month, monthDetails);
    }
  }
  const detailedByMonth = new Map<
    string,
    {
      detailedSales: number;
      costedSales: number;
      directProductCost: number;
      categories: Map<string, number>;
    }
  >();
  for (const sale of historicalSalesResult.data || []) {
    const month = monthBySession.get(sale.cash_session_id);
    if (!month) continue;
    const detail = detailedByMonth.get(month) || {
      detailedSales: 0,
      costedSales: 0,
      directProductCost: 0,
      categories: new Map<string, number>(),
    };
    for (const item of sale.sale_items || []) {
      const lineTotal = Number(item.line_total);
      detail.detailedSales += lineTotal;
      const product = one(item.products);
      const category =
        one(product?.product_categories || null)?.name || "Sin categoría";
      detail.categories.set(
        category,
        (detail.categories.get(category) || 0) + lineTotal,
      );
      const analysis = analysisMap.get(item.product_id);
      if (!analysis?.complete) continue;
      detail.costedSales += lineTotal;
      detail.directProductCost +=
        (analysis.physicalCost + analysis.wasteCost) * Number(item.quantity);
    }
    detailedByMonth.set(month, detail);
  }

  const monthlyHistory: MonthlyFinancialSummary[] = [
    ...reconciledByMonth.keys(),
  ]
    .filter((month) => month < currentMonth)
    .sort((a, b) => b.localeCompare(a))
    .map((month) => {
      const reconciled = reconciledByMonth.get(month)!;
      const detail = detailedByMonth.get(month) || {
        detailedSales: 0,
        costedSales: 0,
        directProductCost: 0,
        categories: new Map<string, number>(),
      };
      const estimatedProductCost = detail.costedSales
        ? Math.round(
            reconciled.grossSales *
              (detail.directProductCost / detail.costedSales),
          )
        : 0;
      const netSales = Math.round(
        reconciled.grossSales / (1 + historicalCosting.settings.vatRate / 100),
      );
      const estimatedContribution = Math.round(
        netSales - estimatedProductCost - reconciled.commissionNet,
      );
      const wasteReserve = Math.round(
        reconciled.grossSales *
          (historicalCosting.settings.operationalWastePercentage / 100),
      );
      const recognizedOperatingExpenses =
        operations
          .filter(
            (operation) =>
              operation.economicMonth.slice(0, 7) === month &&
              countsInMonthlyBooks(operation) &&
              operation.affectsProfitability &&
              !operation.provisionId &&
              ["fixed_cost", "expense"].includes(operation.type),
          )
          .reduce(
            (total, operation) => total + operation.profitabilityAmount,
            0,
          ) +
        provisions
          .filter(
            (item) =>
              item.economicMonth.slice(0, 7) === month &&
              item.affectsProfitability &&
              item.status !== "cancelled",
          )
          .reduce((total, item) => total + item.economicAmount, 0) +
        (cashBusinessWithdrawalsByMonth.get(month) || 0);
      const otherIncome = operations
        .filter(
          (operation) =>
            operation.economicMonth.slice(0, 7) === month &&
            countsInMonthlyBooks(operation) &&
            operation.type === "other_income",
        )
        .reduce((total, operation) => total + operation.gross, 0);
      const operatingResult = Math.round(
        estimatedContribution -
          wasteReserve -
          recognizedOperatingExpenses +
          otherIncome,
      );
      const paidOperations = operations.filter(
        (operation) =>
          operation.date.slice(0, 7) === month &&
          countsInMonthlyBooks(operation),
      );
      const purchasesPaid = paidOperations
        .filter((operation) => operation.type === "purchase")
        .reduce((total, operation) => total + operation.gross, 0);
      const businessExpensesPaid =
        paidOperations
          .filter((operation) =>
            ["fixed_cost", "expense"].includes(operation.type),
          )
          .reduce((total, operation) => total + operation.gross, 0) +
        (cashBusinessWithdrawalsByMonth.get(month) || 0);
      const ownerWithdrawals =
        paidOperations
          .filter((operation) => operation.type === "owner_withdrawal")
          .reduce((total, operation) => total + operation.gross, 0) +
        (cashOwnerWithdrawalsByMonth.get(month) || 0);
      const purchaseTaxCredit = paidOperations
        .filter((operation) =>
          ["purchase", "fixed_cost", "expense"].includes(operation.type),
        )
        .reduce((total, operation) => total + operation.tax, 0);
      const vat = calculateTaxReserve({
        grossSales: reconciled.grossSales,
        purchaseTaxCredit,
        cardFeeTaxCredit: reconciled.commissionTax,
      });
      const confirmedVat = obligationRows.find(
        (row) =>
          /iva|f29|formulario 29/i.test(row.name) &&
          row.name.toLocaleLowerCase("es").includes(monthName(month)) &&
          row.amount != null,
      );
      const spendingCategories = new Map<string, number>();
      const spendingDetails = new Map<string, Map<string, number>>();
      for (const operation of paidOperations) {
        if (["other_income", "owner_contribution"].includes(operation.type))
          continue;
        spendingCategories.set(
          operation.category,
          (spendingCategories.get(operation.category) || 0) + operation.gross,
        );
        const categoryDetails =
          spendingDetails.get(operation.category) || new Map<string, number>();
        categoryDetails.set(
          operation.description,
          (categoryDetails.get(operation.description) || 0) + operation.gross,
        );
        spendingDetails.set(operation.category, categoryDetails);
      }
      for (const [category, total] of cashWithdrawalCategoriesByMonth.get(
        month,
      ) || []) {
        spendingCategories.set(
          category,
          (spendingCategories.get(category) || 0) + total,
        );
        const categoryDetails =
          spendingDetails.get(category) || new Map<string, number>();
        for (const [description, detailTotal] of cashWithdrawalDetailsByMonth
          .get(month)
          ?.get(category) || [])
          categoryDetails.set(
            description,
            (categoryDetails.get(description) || 0) + detailTotal,
          );
        spendingDetails.set(category, categoryDetails);
      }
      const salesCategories = new Map(detail.categories);
      const unallocatedSales = Math.max(
        0,
        reconciled.grossSales - detail.detailedSales,
      );
      if (unallocatedSales > 0)
        salesCategories.set(
          "Cierres sin detalle de productos",
          unallocatedSales,
        );
      return {
        month,
        closedDays: reconciled.closedDays,
        grossSales: Math.round(reconciled.grossSales),
        netSales,
        commissions: Math.round(reconciled.commissionNet),
        commissionTaxCredit: Math.round(reconciled.commissionTax),
        estimatedProductCost,
        estimatedContribution,
        wasteReserve,
        recognizedOperatingExpenses: Math.round(recognizedOperatingExpenses),
        otherIncome: Math.round(otherIncome),
        operatingResult,
        operatingMarginPercentage: netSales
          ? (operatingResult / netSales) * 100
          : 0,
        purchasesPaid: Math.round(purchasesPaid),
        businessExpensesPaid: Math.round(businessExpensesPaid),
        ownerWithdrawals: Math.round(ownerWithdrawals),
        estimatedVatPayable:
          confirmedVat?.amount == null
            ? vat.estimatedVatPayable
            : Number(confirmedVat.amount),
        erpEstimatedVatPayable: vat.estimatedVatPayable,
        vatAmountSource: confirmedVat?.amount == null ? "erp" : "sii",
        costCoveragePercentage: reconciled.grossSales
          ? Math.min(100, (detail.costedSales / reconciled.grossSales) * 100)
          : 0,
        salesDetailCoveragePercentage: reconciled.grossSales
          ? Math.min(100, (detail.detailedSales / reconciled.grossSales) * 100)
          : 0,
        salesByCategory: [...salesCategories]
          .map(([category, total]) => ({ category, total: Math.round(total) }))
          .sort((a, b) => b.total - a.total),
        spendingByCategory: [...spendingCategories]
          .map(([category, total]) => ({
            category,
            total: Math.round(total),
            details: [...(spendingDetails.get(category) || [])]
              .map(([description, detailTotal]) => ({
                description,
                total: Math.round(detailTotal),
              }))
              .sort((a, b) => b.total - a.total),
          }))
          .sort((a, b) => b.total - a.total),
      };
    });
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
    .reduce(
      (total, item) => total + (item.amount ?? item.erpEstimatedAmount ?? 0),
      0,
    );
  const cyclePendingProvisions = pendingProvisions;

  return {
    operations,
    ingredients: ingredients.data || [],
    ledger: ledger.data,
    cutoff,
    obligations,
    provisions,
    monthlyHistory,
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
      pendingObligations,
      pendingVatObligations,
      pendingOtherObligations,
      pendingProvisions,
      currentMonthClosedDays,
      ...taxReserve,
      availableLiquidity:
        expectedBank + expectedCash - pendingObligations - pendingProvisions,
      cashCycle: {
        ...cycle,
        sales: cycleSales,
        otherIncome: cycleOtherIncome,
        paidOutflows: cyclePaidOutflows,
        ownerWithdrawals: cycleOwnerWithdrawals,
        pendingPayments: cyclePendingPayments + cyclePendingProvisions,
        projectedAvailable:
          expectedBank +
          expectedCash -
          cyclePendingPayments -
          cyclePendingProvisions,
      },
    },
  };
}
