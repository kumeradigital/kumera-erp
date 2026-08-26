"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import { OPERATION_CATEGORIES } from "./categories";
export async function saveOperationAction(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const type = String(form.get("type"));
  const gross = Math.round(Number(form.get("amount")));
  const taxMode = String(form.get("taxMode"));
  const taxRate = taxMode === "exempt" ? 0 : 19;
  const category = String(form.get("category") || "").trim();
  if (!gross || gross < 1) throw new Error("Monto inválido");
  if (
    !OPERATION_CATEGORIES.includes(
      category as (typeof OPERATION_CATEGORIES)[number],
    )
  )
    throw new Error("Categoría inválida");
  const ingredientId = String(form.get("ingredientId") || "") || null;
  const quantity = ingredientId ? Number(form.get("purchaseQuantity")) : null;
  const unit = ingredientId ? String(form.get("purchaseUnit")) : null;
  const { error } = await supabase.rpc("record_operational_transaction", {
    p_date: String(form.get("date")),
    p_type: type,
    p_description: String(form.get("description")).trim(),
    p_category: category,
    p_payment_method: String(form.get("paymentMethod") || "") || null,
    p_gross_amount: gross,
    p_tax_rate: taxRate,
    p_ingredient_id: ingredientId,
    p_purchase_quantity: quantity,
    p_purchase_unit: unit,
    p_supplier: String(form.get("supplier") || "") || null,
    p_note: String(form.get("note") || "") || null,
  });
  if (error) throw error;
  revalidatePath("/operacion");
  revalidatePath("/costos");
}

export async function updateOperationAction(form: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const category = String(form.get("category") || "").trim();
  const gross = Math.round(Number(form.get("amount")));
  if (!gross || gross < 1) throw new Error("Monto inválido");
  if (
    !OPERATION_CATEGORIES.includes(
      category as (typeof OPERATION_CATEGORIES)[number],
    )
  )
    throw new Error("Categoría inválida");
  const type = String(form.get("type"));
  const description = String(form.get("description")).trim();
  const paymentMethod = String(form.get("paymentMethod") || "") || null;
  const taxRate = String(form.get("taxMode")) === "exempt" ? 0 : 19;
  const validTypes = [
    "purchase",
    "fixed_cost",
    "expense",
    "other_income",
    "owner_contribution",
    "owner_withdrawal",
  ];
  const validPayments = ["cash", "debit", "credit", "transfer"];
  if (!validTypes.includes(type)) throw new Error("Tipo inválido");
  if (!description) throw new Error("Descripción obligatoria");
  if (paymentMethod && !validPayments.includes(paymentMethod))
    throw new Error("Medio de pago inválido");
  const net = taxRate === 0 ? gross : Math.round(gross / 1.19);
  const { data: existing, error: readError } = await supabase
    .from("operational_transactions")
    .select("ingredient_id")
    .eq("id", String(form.get("id")))
    .single();
  if (readError || !existing) throw new Error("Movimiento no encontrado");
  if (existing.ingredient_id)
    throw new Error(
      "Esta compra actualizó una materia prima y debe corregirse desde Costos.",
    );
  const { error } = await supabase
    .from("operational_transactions")
    .update({
      transaction_date: String(form.get("date")),
      type,
      description,
      category,
      payment_method: paymentMethod,
      gross_amount: gross,
      net_amount: net,
      tax_amount: gross - net,
      tax_rate: taxRate,
      supplier: String(form.get("supplier") || "").trim() || null,
      note: String(form.get("note") || "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(form.get("id")));
  if (error) throw error;
  revalidatePath("/operacion");
  revalidatePath("/costos");
}
