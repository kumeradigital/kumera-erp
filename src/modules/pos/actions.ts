"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import type {
  AvailabilityMovementType,
  PaymentMethod,
  SaleUnit,
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
  return { supabase, user, businessId: membership.business_id };
}
export async function saveProductAction(form: FormData) {
  const ctx = await context();
  const id = String(form.get("id") || "") || undefined;
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const categoryName =
    String(form.get("category") || "General").trim() || "General";
  const price = Number(form.get("price"));
  const saleUnit = String(form.get("saleUnit") || "unit") as SaleUnit;
  const trackDailyAvailability =
    saleUnit === "unit" && form.get("trackDailyAvailability") === "on";
  if (!name || name.length > 100 || !Number.isInteger(price) || price <= 0)
    throw new Error("Producto inválido");
  if (!(["unit", "kg"] as SaleUnit[]).includes(saleUnit))
    throw new Error("Forma de venta inválida");
  const { data: existingCategory, error: categoryError } = await ctx.supabase
    .from("product_categories")
    .select("id")
    .eq("business_id", ctx.businessId)
    .eq("name", categoryName)
    .maybeSingle();
  if (categoryError) throw categoryError;
  let category = existingCategory;
  if (!category) {
    const created = await ctx.supabase
      .from("product_categories")
      .insert({
        business_id: ctx.businessId,
        name: categoryName,
        position: 999,
      })
      .select("id")
      .single();
    if (created.error) throw created.error;
    category = created.data;
  }
  let imagePath: string | undefined;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > 5 * 1024 * 1024) throw new Error("La imagen supera 5 MB");
    imagePath = `${ctx.businessId}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await ctx.supabase.storage
      .from("product-images")
      .upload(imagePath, image, { contentType: image.type });
    if (upload.error) throw upload.error;
  }
  const values = {
    business_id: ctx.businessId,
    category_id: category.id,
    name,
    description: description || null,
    price,
    sale_unit: saleUnit,
    track_daily_availability: trackDailyAvailability,
    image_path: imagePath,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await ctx.supabase
        .from("products")
        .update({ ...values, ...(!imagePath ? { image_path: undefined } : {}) })
        .eq("id", id)
        .eq("business_id", ctx.businessId)
    : await ctx.supabase.from("products").insert(values);
  if (result.error) throw result.error;
  revalidatePath("/productos");
  revalidatePath("/caja");
  return { ok: true };
}
export async function toggleProductAction(id: string, active: boolean) {
  const ctx = await context();
  const { error } = await ctx.supabase
    .from("products")
    .update({ active })
    .eq("id", id)
    .eq("business_id", ctx.businessId);
  if (error) throw error;
  revalidatePath("/productos");
  revalidatePath("/caja");
}
export async function deleteProductAction(id: string) {
  const ctx = await context();
  const { error } = await ctx.supabase
    .from("products")
    .update({
      active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .is("deleted_at", null);
  if (error) throw error;
  revalidatePath("/productos");
  revalidatePath("/caja");
}
export async function openCashSessionAction(
  openingCash: number,
  note = "",
  quantities: { product_id: string; quantity: number }[] = [],
) {
  const ctx = await context();
  if (!Number.isInteger(openingCash) || openingCash < 0)
    throw new Error("Monto inicial inválido");
  if (
    quantities.some(
      (item) =>
        !item.product_id ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 0,
    )
  )
    throw new Error("Disponibilidad inicial inválida");
  const { error } = await ctx.supabase.rpc(
    "open_cash_session_with_availability",
    {
      p_opening_cash: openingCash,
      p_note: note,
      p_quantities: quantities,
    },
  );
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
}
export async function adjustAvailabilityAction(
  sessionId: string,
  productId: string,
  kind: AvailabilityMovementType,
  delta: number,
  reason = "",
) {
  const ctx = await context();
  if (
    !sessionId ||
    !productId ||
    !["production", "waste", "consumption", "correction"].includes(kind) ||
    !Number.isInteger(delta) ||
    delta === 0
  )
    throw new Error("Ajuste de disponibilidad inválido");
  const { error } = await ctx.supabase.rpc("adjust_product_availability", {
    p_session: sessionId,
    p_product: productId,
    p_kind: kind,
    p_delta: delta,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath("/caja");
}
export async function closeCashSessionAction(
  sessionId: string,
  countedCash: number,
  note = "",
) {
  const ctx = await context();
  if (!Number.isInteger(countedCash) || countedCash < 0)
    throw new Error("Efectivo contado inválido");
  const { error } = await ctx.supabase
    .from("cash_sessions")
    .update({
      status: "closed",
      counted_cash: countedCash,
      closing_note: note || null,
      closed_by: ctx.user.id,
      closed_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("business_id", ctx.businessId)
    .eq("status", "open");
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
}
export async function reconcileCashSessionAction(
  sessionId: string,
  countedCash: number,
  note = "",
) {
  const ctx = await context();
  if (!Number.isInteger(countedCash) || countedCash < 0)
    throw new Error("Efectivo contado inválido");
  const reason = note.trim() || "Efectivo real informado posteriormente";
  const { error } = await ctx.supabase.rpc("correct_cash_session", {
    p_session: sessionId,
    p_counted_cash: countedCash,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
  revalidatePath("/cierres");
}
export async function registerSaleAction(
  sessionId: string,
  payment: PaymentMethod,
  cashReceived: number | null,
  items: { product_id: string; quantity: number }[],
) {
  const ctx = await context();
  const normalizedCash =
    cashReceived == null ? null : Math.round(Number(cashReceived));
  if (
    normalizedCash != null &&
    (!Number.isFinite(normalizedCash) || normalizedCash < 0)
  )
    throw new Error("Efectivo recibido inválido");
  const { data, error } = await ctx.supabase.rpc("register_sale", {
    p_session: sessionId,
    p_payment: payment,
    p_cash_received: normalizedCash,
    p_items: items,
  });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return { id: data as string };
}
