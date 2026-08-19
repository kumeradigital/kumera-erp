"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import { getCostingData } from "@/modules/costs/data";
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
  const isSalesFamily = form.get("isSalesFamily") === "on";
  const familyMembers = form
    .getAll("familyMembers")
    .map(String)
    .filter(Boolean);
  if (!name || name.length > 100 || !Number.isInteger(price) || price <= 0)
    throw new Error("Producto inválido");
  if (categoryName.length > 60) throw new Error("Categoría inválida");
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
    is_sales_family: isSalesFamily,
    image_path: imagePath,
    updated_at: new Date().toISOString(),
  };
  let result;
  if (id) {
    result = await ctx.supabase
      .from("products")
      .update({ ...values, ...(!imagePath ? { image_path: undefined } : {}) })
      .eq("id", id)
      .eq("business_id", ctx.businessId)
      .select("id")
      .single();
  } else {
    const archived = await ctx.supabase
      .from("products")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("name", name)
      .not("deleted_at", "is", null)
      .maybeSingle();
    if (archived.error) throw archived.error;

    result = archived.data
      ? await ctx.supabase
          .from("products")
          .update({
            ...values,
            ...(!imagePath ? { image_path: undefined } : {}),
            active: true,
            deleted_at: null,
          })
          .eq("id", archived.data.id)
          .eq("business_id", ctx.businessId)
          .select("id")
          .single()
      : await ctx.supabase
          .from("products")
          .insert(values)
          .select("id")
          .single();
  }
  if (result.error) throw result.error;
  const productId = result.data.id;
  const clear = await ctx.supabase
    .from("products")
    .update({ family_product_id: null })
    .eq("business_id", ctx.businessId)
    .eq("family_product_id", productId);
  if (clear.error) throw clear.error;
  if (isSalesFamily && familyMembers.length) {
    const memberUpdate = await ctx.supabase
      .from("products")
      .update({ family_product_id: productId, is_sales_family: false })
      .eq("business_id", ctx.businessId)
      .neq("id", productId)
      .in("id", familyMembers);
    if (memberUpdate.error) throw memberUpdate.error;
  }
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
export async function registerCashWithdrawalAction(
  sessionId: string,
  amount: number,
  reason: string,
) {
  const ctx = await context();
  const normalizedReason = reason.trim();
  if (!sessionId || !Number.isInteger(amount) || amount <= 0)
    throw new Error("Monto de retiro inválido");
  if (!normalizedReason) throw new Error("Debes indicar el motivo del retiro");
  const { error } = await ctx.supabase.from("cash_session_withdrawals").insert({
    business_id: ctx.businessId,
    cash_session_id: sessionId,
    amount,
    reason: normalizedReason,
    created_by: ctx.user.id,
  });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/cierres");
}
export async function registerProductionBatchAction(
  sessionId: string,
  familyProductId: string,
  componentProductId: string,
  quantity: number,
  note = "",
) {
  const ctx = await context();
  const normalizedQuantity = Number(quantity.toFixed(3));
  if (
    !sessionId ||
    !familyProductId ||
    !componentProductId ||
    !Number.isFinite(normalizedQuantity) ||
    normalizedQuantity <= 0
  )
    throw new Error("Producción inválida");
  const { data: component, error: componentError } = await ctx.supabase
    .from("products")
    .select("id,family_product_id,sale_unit")
    .eq("id", componentProductId)
    .eq("business_id", ctx.businessId)
    .eq("family_product_id", familyProductId)
    .single();
  if (componentError || !component)
    throw new Error("La variedad no pertenece a esta familia");
  const costing = await getCostingData();
  const analysis = costing.analyses.find(
    (item) => item.id === componentProductId,
  );
  const costingPending = !analysis?.complete;
  const unitCost = analysis?.complete
    ? analysis.physicalCost + analysis.wasteCost
    : 0;
  const { error } = await ctx.supabase
    .from("cash_session_production_batches")
    .insert({
      business_id: ctx.businessId,
      cash_session_id: sessionId,
      family_product_id: familyProductId,
      component_product_id: componentProductId,
      quantity: normalizedQuantity,
      unit_cost: unitCost,
      note: note.trim() || null,
      created_by: ctx.user.id,
    });
  if (error) throw error;
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return { ok: true, costingPending };
}
export async function closeCashSessionAction(
  sessionId: string,
  countedCash: number,
  details: {
    note: string;
    reason: string;
    actual: Record<PaymentMethod, number>;
    transactions: Record<PaymentMethod, number>;
    waste: {
      product_id?: string;
      product_name: string;
      quantity: number;
      sale_unit: SaleUnit;
      note?: string;
    }[];
  },
) {
  const ctx = await context();
  if (!Number.isInteger(countedCash) || countedCash < 0)
    throw new Error("Efectivo contado inválido");
  const actual = details.actual;
  const transactions = details.transactions;
  if (
    Object.values(actual).some((value) => !Number.isInteger(value) || value < 0)
  )
    throw new Error("Totales del cierre inválidos");
  if (
    details.waste.some(
      (item) => !Number.isFinite(item.quantity) || item.quantity <= 0,
    )
  )
    throw new Error("Merma inválida");
  const { error } = await ctx.supabase.rpc("close_cash_session_with_details", {
    p_session: sessionId,
    p_counted_cash: countedCash,
    p_note: details.note,
    p_actual_cash: actual.cash,
    p_actual_debit: actual.debit,
    p_actual_credit: actual.credit,
    p_actual_transfer: actual.transfer,
    p_cash_transactions: transactions.cash,
    p_debit_transactions: transactions.debit,
    p_credit_transactions: transactions.credit,
    p_transfer_transactions: transactions.transfer,
    p_reason: details.reason,
    p_waste: details.waste,
  });
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
  const normalizedItems = items.map((item) => ({
    product_id: item.product_id,
    quantity: Number(Number(item.quantity).toFixed(3)),
  }));
  const normalizedCash =
    cashReceived == null ? null : Math.round(Number(cashReceived));
  if (
    normalizedCash != null &&
    (!Number.isFinite(normalizedCash) || normalizedCash < 0)
  )
    return { ok: false as const, error: "Efectivo recibido inválido" };
  if (
    !normalizedItems.length ||
    normalizedItems.some(
      (item) =>
        !item.product_id ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0,
    )
  )
    return {
      ok: false as const,
      error: "La venta no contiene productos válidos",
    };

  const productIds = [
    ...new Set(normalizedItems.map((item) => item.product_id)),
  ];
  const { data: currentProducts, error: productsError } = await ctx.supabase
    .from("products")
    .select("id,name,price,sale_unit")
    .eq("business_id", ctx.businessId)
    .eq("active", true)
    .is("deleted_at", null)
    .in("id", productIds);
  if (productsError)
    return {
      ok: false as const,
      error: "No se pudieron verificar los precios vigentes",
    };
  if ((currentProducts || []).length !== productIds.length)
    return {
      ok: false as const,
      error: "Uno de los productos ya no está disponible. Actualiza la caja.",
    };
  const productMap = new Map(
    (currentProducts || []).map((product) => [product.id, product]),
  );
  const currentTotal = normalizedItems.reduce((sum, item) => {
    const product = productMap.get(item.product_id)!;
    return sum + Math.round(Number(product.price) * item.quantity);
  }, 0);
  if (payment === "cash" && (normalizedCash ?? 0) < currentTotal)
    return {
      ok: false as const,
      error: `El total vigente es $${currentTotal.toLocaleString("es-CL")}. Ingresa al menos ese monto en efectivo o actualiza la caja.`,
    };
  const { data, error } = await ctx.supabase.rpc("register_sale", {
    p_session: sessionId,
    p_payment: payment,
    p_cash_received: normalizedCash,
    p_items: normalizedItems,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/caja");
  revalidatePath("/ventas");
  return { ok: true as const, id: data as string };
}
