import { createClient } from "@/server/supabase/server";
import type {
  CashSession,
  DailyAvailability,
  PaymentMethod,
  Product,
  SaleSummary,
} from "./types";

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

export async function getProducts(includeInactive = false): Promise<Product[]> {
  const { businessId, supabase } = await businessContext();
  let query = supabase
    .from("products")
    .select(
      "id,name,description,price,sale_unit,image_path,active,track_daily_availability,product_categories(name)",
    )
    .eq("business_id", businessId)
    .is("deleted_at", null)
    .order("position")
    .order("name");
  if (!includeInactive) query = query.eq("active", true);
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
      };
    }),
  );
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
    .select("total")
    .eq("business_id", businessId)
    .eq("cash_session_id", sessionId)
    .eq("payment_method", "cash")
    .eq("status", "completed");
  if (error) throw error;
  return (data || []).reduce((sum, sale) => sum + Number(sale.total), 0);
}

export type CashClosure = {
  id: string;
  openedAt: string;
  closedAt: string;
  autoClosed: boolean;
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number | null;
  difference: number | null;
  note: string | null;
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
      "id,opening_cash,counted_cash,opening_note,closing_note,opened_at,closed_at,auto_closed,sales(total,payment_method,status),cash_session_adjustments(previous_counted_cash,new_counted_cash,reason,created_at)",
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
        (sum: number, sale: { total: number | string }) =>
          sum + Number(sale.total),
        0,
      );
    const expectedCash = Number(row.opening_cash) + cashSales;
    const countedCash =
      row.counted_cash == null ? null : Number(row.counted_cash);
    return {
      id: row.id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      autoClosed: row.auto_closed,
      openingCash: Number(row.opening_cash),
      cashSales,
      expectedCash,
      countedCash,
      difference: countedCash == null ? null : countedCash - expectedCash,
      note: row.closing_note,
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
  recent: {
    id: string;
    total: number;
    payment: PaymentMethod;
    createdAt: string;
  }[];
}> {
  const ctx = await businessContext();
  const { data: sales, error } = await ctx.supabase
    .from("sales")
    .select(
      "id,total,payment_method,created_at,sale_items(product_name,quantity,sale_unit)",
    )
    .eq("business_id", ctx.businessId)
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lt("created_at", range.to)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = sales || [];
  const total = rows.reduce((s, r) => s + Number(r.total), 0);
  const payments = new Map<PaymentMethod, number>();
  const products = new Map<
    string,
    { quantity: number; saleUnit: "unit" | "kg" }
  >();
  rows.forEach((r) => {
    const method = r.payment_method as PaymentMethod;
    payments.set(method, (payments.get(method) || 0) + Number(r.total));
    (r.sale_items || []).forEach(
      (item: {
        product_name: string;
        quantity: number | string;
        sale_unit: "unit" | "kg";
      }) => {
        const previous = products.get(item.product_name);
        products.set(item.product_name, {
          quantity: (previous?.quantity || 0) + Number(item.quantity),
          saleUnit: item.sale_unit,
        });
      },
    );
  });
  return {
    summary: {
      total,
      count: rows.length,
      average: rows.length ? Math.round(total / rows.length) : 0,
      byPayment: [...payments]
        .map(([method, value]) => ({ method, total: value }))
        .sort((a, b) => b.total - a.total),
      topProducts: [...products]
        .map(([name, value]) => ({ name, ...value }))
        .sort((a, b) => b.quantity - a.quantity),
    },
    recent: rows.slice(0, 10).map((r) => ({
      id: r.id,
      total: Number(r.total),
      payment: r.payment_method as PaymentMethod,
      createdAt: r.created_at,
    })),
  };
}
