import { createClient } from "@/server/supabase/server";
import type {
  CashSession,
  CashWithdrawal,
  DailyAvailability,
  PaymentMethod,
  Product,
  ProductionBatch,
  ProductionFamily,
  RecentSale,
  SalePaymentMethod,
  SaleSummary,
  SalesSessionPeriod,
  SessionClosingSummary,
} from "./types";
import type { CardFeeSettings } from "./fees";

async function businessContext() {
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

function oneRelation<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : value || undefined;
}

export async function getProducts(includeInactive = false): Promise<Product[]> {
  const { businessId, supabase } = await businessContext();
  let query = supabase
    .from("products")
    .select(
      "id,name,description,price,sale_unit,image_path,active,track_daily_availability,is_sales_family,family_product_id,product_categories(name)",
    )
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("position")
    .order("name");
  if (!includeInactive)
    query = query.eq("active", true).is("family_product_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all(
    (data || []).map(async (row) => {
      let imageUrl: string | undefined;
      if (row.image_path) {
        const signed = await supabase.storage
          .from("product-images")
          .createSignedUrl(row.image_path, 3600);
        imageUrl = signed.data?.signedUrl;
      }
      const category = Array.isArray(row.product_categories)
        ? row.product_categories[0]?.name
        : (row.product_categories as { name: string } | null)?.name;
      return {
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        price: Number(row.price),
        saleUnit: row.sale_unit,
        category: category || "Sin categoría",
        imageUrl,
        active: row.active,
        trackDailyAvailability: row.track_daily_availability,
        isSalesFamily: row.is_sales_family,
        familyProductId: row.family_product_id || undefined,
      };
    }),
  );
}

export async function getProductionFamilies(): Promise<ProductionFamily[]> {
  const products = await getProducts(true);
  return products
    .filter((product) => product.isSalesFamily && product.active)
    .map((product) => ({
      product,
      members: products.filter(
        (candidate) => candidate.familyProductId === product.id,
      ),
    }))
    .filter((family) => family.members.length > 0);
}

export async function getProductionBatches(
  sessionId: string,
): Promise<ProductionBatch[]> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_session_production_batches")
    .select(
      "id,family_product_id,component_product_id,quantity,unit_cost,note,created_at,products!cash_session_production_batches_component_product_id_fkey(name)",
    )
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => {
    const component = oneRelation(row.products);
    return {
      id: row.id,
      familyProductId: row.family_product_id,
      componentProductId: row.component_product_id,
      componentName: component?.name || "Producto",
      quantity: Number(row.quantity),
      unitCost: Number(row.unit_cost),
      note: row.note || undefined,
      createdAt: row.created_at,
    };
  });
}

export async function getDailyAvailability(
  sessionId: string,
): Promise<DailyAvailability[]> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_session_product_availability")
    .select(
      "product_id,opening_quantity,available_quantity,produced_quantity,sold_quantity,adjusted_quantity,products(name)",
    )
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .order("created_at");
  if (error) throw error;
  return (data || []).map((row) => {
    const product = Array.isArray(row.products)
      ? row.products[0]
      : (row.products as { name: string } | null);
    return {
      productId: row.product_id,
      productName: product?.name || "Producto",
      openingQuantity: Number(row.opening_quantity),
      availableQuantity: Number(row.available_quantity),
      producedQuantity: Number(row.produced_quantity),
      soldQuantity: Number(row.sold_quantity),
      adjustedQuantity: Number(row.adjusted_quantity),
    };
  });
}

export async function getOpenCashSession(): Promise<CashSession | null> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      "id,status,opening_cash,counted_cash,opened_at,closed_at,auto_closed",
    )
    .eq("business_id", businessId)
    .eq("status", "open")
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        status: data.status,
        openingCash: Number(data.opening_cash),
        countedCash:
          data.counted_cash == null ? undefined : Number(data.counted_cash),
        openedAt: data.opened_at,
        closedAt: data.closed_at || undefined,
        autoClosed: data.auto_closed,
      }
    : null;
}

export async function getCardFeeSettings(): Promise<CardFeeSettings> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cost_settings")
    .select(
      "card_fee_model,card_fee_percentage,card_fee_fixed_amount,card_fee_vat_rate,card_settlement_days",
    )
    .eq("business_id", businessId)
    .single();
  if (error) throw error;
  return {
    model: data.card_fee_model as CardFeeSettings["model"],
    percentage: Number(data.card_fee_percentage),
    fixedAmount: Number(data.card_fee_fixed_amount),
    vatRate: Number(data.card_fee_vat_rate),
    settlementDays: data.card_settlement_days,
  };
}

export async function getLatestCashSession(): Promise<CashSession | null> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      "id,status,opening_cash,counted_cash,opened_at,closed_at,auto_closed",
    )
    .eq("business_id", businessId)
    .order("opened_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        status: data.status,
        openingCash: Number(data.opening_cash),
        countedCash:
          data.counted_cash == null ? undefined : Number(data.counted_cash),
        openedAt: data.opened_at,
        closedAt: data.closed_at || undefined,
        autoClosed: data.auto_closed,
      }
    : null;
}

export type SalesRange = {
  from: string;
  to: string;
};

export async function getCashSalesTotal(sessionId: string): Promise<number> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("sales")
    .select("total,cash_rounding_amount")
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .eq("payment_method", "cash")
    .eq("status", "completed");
  if (error) throw error;
  return (data || []).reduce(
    (sum, sale) =>
      sum + Number(sale.total) + Number(sale.cash_rounding_amount || 0),
    0,
  );
}

export async function getRecentSessionSales(
  sessionId: string,
  limit = 3,
): Promise<RecentSale[]> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id,sale_number,total,cash_rounding_amount,payment_method,created_at",
    )
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((sale) => ({
    id: sale.id,
    saleNumber: Number(sale.sale_number),
    total:
      Number(sale.total) +
      (sale.payment_method === "cash"
        ? Number(sale.cash_rounding_amount || 0)
        : 0),
    payment: sale.payment_method as SalePaymentMethod,
    createdAt: sale.created_at,
  }));
}

export async function getCashWithdrawals(
  sessionId: string,
): Promise<CashWithdrawal[]> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_session_withdrawals")
    .select("id,amount,reason,created_at")
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((item) => ({
    id: item.id,
    amount: Number(item.amount),
    reason: item.reason,
    createdAt: item.created_at,
  }));
}

export async function getSessionClosingSummary(
  sessionId: string,
): Promise<SessionClosingSummary> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "total,cash_rounding_amount,payment_method,sale_items(product_id,product_name,quantity,sale_unit,line_total)",
    )
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .eq("status", "completed");
  if (error) throw error;
  const byPayment: SessionClosingSummary["byPayment"] = {
    cash: 0,
    debit: 0,
    credit: 0,
    transfer: 0,
  };
  const transactionsByPayment: SessionClosingSummary["transactionsByPayment"] =
    {
      cash: 0,
      debit: 0,
      credit: 0,
      transfer: 0,
    };
  const products = new Map<string, SessionClosingSummary["products"][number]>();
  for (const sale of data || []) {
    const method = sale.payment_method as SalePaymentMethod;
    if (method !== "unclassified") {
      byPayment[method] +=
        Number(sale.total) +
        (method === "cash" ? Number(sale.cash_rounding_amount || 0) : 0);
      transactionsByPayment[method] += 1;
    }
    for (const item of sale.sale_items || []) {
      const current = products.get(item.product_name);
      products.set(item.product_name, {
        productId: item.product_id || undefined,
        name: item.product_name,
        quantity: (current?.quantity || 0) + Number(item.quantity),
        saleUnit: item.sale_unit,
        total: (current?.total || 0) + Number(item.line_total),
      });
    }
  }
  return {
    byPayment,
    transactionsByPayment,
    recordedTotal: (data || []).reduce(
      (sum, sale) => sum + Number(sale.total),
      0,
    ),
    recordedTransactions: (data || []).length,
    products: [...products.values()].sort((a, b) => b.total - a.total),
  };
}

export type CashClosure = {
  id: string;
  openedAt: string;
  closedAt: string;
  autoClosed: boolean;
  openingCash: number;
  cashSales: number;
  withdrawals: CashWithdrawal[];
  withdrawalTotal: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  note: string | null;
  reconciliation: {
    byPayment: Record<PaymentMethod, number>;
    reason: string;
  } | null;
  waste: {
    name: string;
    quantity: number;
    saleUnit: "unit" | "kg";
    note: string | null;
  }[];
  adjustments: {
    previous: number | null;
    next: number;
    reason: string;
    createdAt: string;
  }[];
};

export async function getCashClosureHistory(): Promise<CashClosure[]> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      "id,opening_cash,counted_cash,opening_note,closing_note,opened_at,closed_at,auto_closed,sales(total,cash_rounding_amount,payment_method,status),cash_session_withdrawals(id,amount,reason,created_at),cash_session_adjustments(previous_counted_cash,new_counted_cash,reason,created_at),cash_session_reconciliations(actual_cash_sales,actual_debit_sales,actual_credit_sales,actual_transfer_sales,reason),cash_session_product_waste(product_name,quantity,sale_unit,note)",
    )
    .eq("business_id", businessId)
    .eq("status", "closed")
    .order("opened_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map((row) => {
    const cashSales = (row.sales || [])
      .filter(
        (sale: { payment_method: string; status: string }) =>
          sale.payment_method === "cash" && sale.status === "completed",
      )
      .reduce(
        (
          sum: number,
          sale: {
            total: number | string;
            cash_rounding_amount: number | string;
          },
        ) => sum + Number(sale.total) + Number(sale.cash_rounding_amount || 0),
        0,
      );
    const reconciliation = oneRelation(row.cash_session_reconciliations);
    const reconciledCash = reconciliation
      ? Number(reconciliation.actual_cash_sales)
      : cashSales;
    const withdrawals = (row.cash_session_withdrawals || [])
      .map(
        (item: {
          id: string;
          amount: number | string;
          reason: string;
          created_at: string;
        }) => ({
          id: item.id,
          amount: Number(item.amount),
          reason: item.reason,
          createdAt: item.created_at,
        }),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const withdrawalTotal = withdrawals.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const expectedCash =
      Number(row.opening_cash) + reconciledCash - withdrawalTotal;
    const countedCash =
      row.counted_cash == null ? null : Number(row.counted_cash);
    return {
      id: row.id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      autoClosed: row.auto_closed,
      openingCash: Number(row.opening_cash),
      cashSales: reconciledCash,
      withdrawals,
      withdrawalTotal,
      expectedCash,
      countedCash,
      difference: countedCash == null ? null : countedCash - expectedCash,
      note: row.closing_note,
      reconciliation: reconciliation
        ? {
            byPayment: {
              cash: Number(reconciliation.actual_cash_sales),
              debit: Number(reconciliation.actual_debit_sales),
              credit: Number(reconciliation.actual_credit_sales),
              transfer: Number(reconciliation.actual_transfer_sales),
            },
            reason: reconciliation.reason,
          }
        : null,
      waste: (row.cash_session_product_waste || []).map(
        (item: {
          product_name: string;
          quantity: number | string;
          sale_unit: "unit" | "kg";
          note: string | null;
        }) => ({
          name: item.product_name,
          quantity: Number(item.quantity),
          saleUnit: item.sale_unit,
          note: item.note,
        }),
      ),
      adjustments: (row.cash_session_adjustments || [])
        .map(
          (adjustment: {
            previous_counted_cash: number | string | null;
            new_counted_cash: number | string;
            reason: string;
            created_at: string;
          }) => ({
            previous:
              adjustment.previous_counted_cash == null
                ? null
                : Number(adjustment.previous_counted_cash),
            next: Number(adjustment.new_counted_cash),
            reason: adjustment.reason,
            createdAt: adjustment.created_at,
          }),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
}

export async function getSalesSummary(range: SalesRange): Promise<{
  summary: SaleSummary;
  sessions: SalesSessionPeriod[];
  recent: {
    id: string;
    total: number;
    payment: SalePaymentMethod;
    createdAt: string;
  }[];
}> {
  const ctx = await businessContext();
  const { data: sales, error } = await ctx.supabase
    .from("sales")
    .select(
      "id,cash_session_id,total,payment_method,commission_net_amount,commission_tax_amount,expected_deposit_amount,created_at,sale_items(product_name,quantity,sale_unit,line_total,products(product_categories(name)))",
    )
    .eq("business_id", ctx.businessId)
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lt("created_at", range.to)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = sales || [];
  const recordedTotal = rows.reduce((s, r) => s + Number(r.total), 0);
  const { data: reconciledSessions, error: reconciliationError } =
    await ctx.supabase
      .from("cash_sessions")
      .select(
        "id,status,opening_cash,opened_at,closed_at,auto_closed,cash_session_reconciliations(actual_cash_sales,actual_debit_sales,actual_credit_sales,actual_transfer_sales,actual_cash_transactions,actual_debit_transactions,actual_credit_transactions,actual_transfer_transactions,commission_net_amount,commission_tax_amount)",
      )
      .eq("business_id", ctx.businessId)
      .gte("opened_at", range.from)
      .lt("opened_at", range.to)
      .order("opened_at", { ascending: false });
  if (reconciliationError) throw reconciliationError;
  const reconciliations = new Map(
    (reconciledSessions || []).flatMap((session) => {
      const value = oneRelation(session.cash_session_reconciliations);
      return value ? [[session.id, value] as const] : [];
    }),
  );
  let total = recordedTotal;
  for (const [sessionId, value] of reconciliations) {
    const recorded = rows
      .filter((row) => row.cash_session_id === sessionId)
      .reduce((sum, row) => sum + Number(row.total), 0);
    total +=
      Number(value.actual_cash_sales) +
      Number(value.actual_debit_sales) +
      Number(value.actual_credit_sales) +
      Number(value.actual_transfer_sales) -
      recorded;
  }
  let commissionNet = rows.reduce(
    (s, r) => s + Number(r.commission_net_amount),
    0,
  );
  let commissionTax = rows.reduce(
    (s, r) => s + Number(r.commission_tax_amount),
    0,
  );
  let transactionCount = rows.length;
  for (const [sessionId, value] of reconciliations) {
    const sessionRows = rows.filter((row) => row.cash_session_id === sessionId);
    commissionNet +=
      Number(value.commission_net_amount) -
      sessionRows.reduce(
        (sum, row) => sum + Number(row.commission_net_amount),
        0,
      );
    commissionTax +=
      Number(value.commission_tax_amount) -
      sessionRows.reduce(
        (sum, row) => sum + Number(row.commission_tax_amount),
        0,
      );
    transactionCount +=
      Number(value.actual_cash_transactions) +
      Number(value.actual_debit_transactions) +
      Number(value.actual_credit_transactions) +
      Number(value.actual_transfer_transactions) -
      sessionRows.length;
  }
  const netReceivable = total - commissionNet - commissionTax;
  const payments = new Map<PaymentMethod, number>();
  const hourlySales = new Map<number, { total: number; count: number }>();
  const products = new Map<
    string,
    {
      category: string;
      quantity: number;
      saleUnit: "unit" | "kg";
      total: number;
    }
  >();
  rows.forEach((r) => {
    const method = r.payment_method as SalePaymentMethod;
    if (method !== "unclassified")
      payments.set(method, (payments.get(method) || 0) + Number(r.total));
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Santiago",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date(r.created_at)),
    );
    const hourly = hourlySales.get(hour) || { total: 0, count: 0 };
    hourlySales.set(hour, {
      total: hourly.total + Number(r.total),
      count: hourly.count + 1,
    });
    (r.sale_items || []).forEach(
      (item: {
        product_name: string;
        quantity: number | string;
        sale_unit: "unit" | "kg";
        line_total: number | string;
        products:
          | { product_categories: { name: string } | { name: string }[] | null }
          | {
              product_categories: { name: string } | { name: string }[] | null;
            }[]
          | null;
      }) => {
        const product = oneRelation(item.products);
        const categoryRelation = oneRelation(product?.product_categories);
        const category = categoryRelation?.name || "Sin categoría";
        const previous = products.get(item.product_name);
        products.set(item.product_name, {
          category,
          quantity: (previous?.quantity || 0) + Number(item.quantity),
          saleUnit: item.sale_unit,
          total: (previous?.total || 0) + Number(item.line_total),
        });
      },
    );
  });
  const categories = new Map<
    string,
    {
      unitQuantity: number;
      kgQuantity: number;
      total: number;
      products: Set<string>;
    }
  >();
  products.forEach((product, name) => {
    const previous = categories.get(product.category) || {
      unitQuantity: 0,
      kgQuantity: 0,
      total: 0,
      products: new Set<string>(),
    };
    if (product.saleUnit === "kg") previous.kgQuantity += product.quantity;
    else previous.unitQuantity += product.quantity;
    previous.total += product.total;
    previous.products.add(name);
    categories.set(product.category, previous);
  });
  for (const [sessionId, value] of reconciliations) {
    const recorded = new Map<PaymentMethod, number>();
    rows
      .filter((row) => row.cash_session_id === sessionId)
      .forEach((row) => {
        const method = row.payment_method as SalePaymentMethod;
        if (method !== "unclassified")
          recorded.set(method, (recorded.get(method) || 0) + Number(row.total));
      });
    const actual: Record<PaymentMethod, number> = {
      cash: Number(value.actual_cash_sales),
      debit: Number(value.actual_debit_sales),
      credit: Number(value.actual_credit_sales),
      transfer: Number(value.actual_transfer_sales),
    };
    (Object.keys(actual) as PaymentMethod[]).forEach((method) =>
      payments.set(
        method,
        (payments.get(method) || 0) +
          actual[method] -
          (recorded.get(method) || 0),
      ),
    );
  }
  return {
    sessions: (reconciledSessions || []).map((session) => ({
      id: session.id,
      status: session.status as "open" | "closed",
      openedAt: session.opened_at,
      closedAt: session.closed_at || undefined,
      openingCash: Number(session.opening_cash),
      autoClosed: Boolean(session.auto_closed),
    })),
    summary: {
      total,
      recordedTotal,
      unallocatedDifference: total - recordedTotal,
      commissionNet,
      commissionTax,
      commissionTotal: commissionNet + commissionTax,
      netReceivable,
      count: transactionCount,
      average: transactionCount ? Math.round(total / transactionCount) : 0,
      hourlySales: [...hourlySales]
        .map(([hour, value]) => ({
          hour,
          ...value,
          average: value.count ? Math.round(value.total / value.count) : 0,
        }))
        .sort((a, b) => a.hour - b.hour),
      byPayment: [...payments]
        .map(([method, value]) => ({ method, total: value }))
        .sort((a, b) => b.total - a.total),
      topProducts: [...products]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.quantity - a.quantity),
      byCategory: [...categories]
        .map(([category, value]) => ({
          category,
          unitQuantity: value.unitQuantity,
          kgQuantity: value.kgQuantity,
          total: value.total,
          productCount: value.products.size,
        }))
        .sort((a, b) => b.total - a.total),
    },
    recent: rows.slice(0, 10).map((r) => ({
      id: r.id,
      total: Number(r.total),
      payment: r.payment_method as SalePaymentMethod,
      createdAt: r.created_at,
    })),
  };
}
