import { createClient } from "@/server/supabase/server";
import type { CashSession, PaymentMethod, Product, SaleSummary } from "./types";

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
      "id,name,description,price,sale_unit,image_path,active,product_categories(name)",
    )
    .eq("business_id", businessId)
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
      };
    }),
  );
}

export async function getOpenCashSession(): Promise<CashSession | null> {
  const { businessId, supabase } = await businessContext();
  const { data, error } = await supabase
    .from("cash_sessions")
    .select("id,status,opening_cash,counted_cash,opened_at,closed_at")
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
