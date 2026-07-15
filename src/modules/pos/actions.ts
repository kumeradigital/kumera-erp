"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import type { PaymentMethod, SaleUnit } from "./types";

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
export async function openCashSessionAction(openingCash: number, note = "") {
  const ctx = await context();
  if (!Number.isInteger(openingCash) || openingCash < 0)
    throw new Error("Monto inicial inválido");
  const { error } = await ctx.supabase.from("cash_sessions").insert({
    business_id: ctx.businessId,
    opened_by: ctx.user.id,
    opening_cash: openingCash,
    opening_note: note || null,
  });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
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
  const reconciliationNote = note.trim()
    ? `Regularización posterior: ${note.trim()}`
    : "Efectivo real informado posteriormente";
  const { data, error } = await ctx.supabase
    .from("cash_sessions")
    .update({
      counted_cash: countedCash,
      closing_note: reconciliationNote,
      reconciled_at: new Date().toISOString(),
      reconciled_by: ctx.user.id,
    })
    .eq("id", sessionId)
    .eq("business_id", ctx.businessId)
    .eq("status", "closed")
    .eq("auto_closed", true)
    .is("counted_cash", null)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Este cierre ya fue regularizado");
  revalidatePath("/caja");
  revalidatePath("/ventas");
}
export async function registerSaleAction(
  sessionId: string,
  payment: PaymentMethod,
  cashReceived: number | null,
  items: { product_id: string; quantity: number }[],
) {
  const ctx = await context();
  const { data, error } = await ctx.supabase.rpc("register_sale", {
    p_session: sessionId,
    p_payment: payment,
    p_cash_received: cashReceived,
    p_items: items,
  });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return { id: data as string };
}
