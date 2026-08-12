"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
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
  if (!gross || gross < 1) throw new Error("Monto inválido");
  const ingredientId = String(form.get("ingredientId") || "") || null;
  const quantity = ingredientId ? Number(form.get("purchaseQuantity")) : null;
  const unit = ingredientId ? String(form.get("purchaseUnit")) : null;
  const { error } = await supabase.rpc("record_operational_transaction", {
    p_date: String(form.get("date")),
    p_type: type,
    p_description: String(form.get("description")).trim(),
    p_category: String(form.get("category") || "Otros"),
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
