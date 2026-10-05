"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import { OPERATION_CATEGORIES } from "./categories";

export async function saveFinancialReconciliationAction(form: FormData) {
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
  const bank = Math.round(Number(form.get("bank")));
  const cash = Math.round(Number(form.get("cash")));
  const reason = String(form.get("reason") || "").trim();
  if (![bank, cash].every((value) => Number.isInteger(value) && value >= 0))
    throw new Error("Los saldos deben ser números positivos");
  if (reason.length < 3) throw new Error("Explica brevemente la conciliación");
  const expectedBank = Math.round(Number(form.get("expectedBank")) || 0);
  const expectedCash = Math.round(Number(form.get("expectedCash")) || 0);
  const now = new Date();
  const cutoffDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const { data: previous } = await supabase
    .from("financial_cutoffs")
    .select("pending_receivables")
    .eq("business_id", membership.business_id)
    .order("cutoff_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const note = [
    `Conciliación manual. Antes el ERP esperaba banco ${expectedBank} y efectivo ${expectedCash}.`,
    `Saldos reales informados: banco ${bank} y efectivo ${cash}.`,
    reason,
  ].join(" ");
  const { error } = await supabase.from("financial_cutoffs").insert({
    business_id: membership.business_id,
    cutoff_at: now.toISOString(),
    cutoff_date: cutoffDate,
    opening_bank_amount: bank,
    opening_cash_amount: cash,
    pending_receivables: Number(previous?.pending_receivables || 0),
    note,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/operacion");
}

export async function saveObligationAction(form: FormData) {
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
  const name = String(form.get("name") || "").trim();
  const rawAmount = String(form.get("amount") || "").trim();
  const amount = rawAmount ? Math.round(Number(rawAmount)) : null;
  const dueDate = String(form.get("dueDate") || "");
  const kind = String(form.get("kind") || "payable");
  const recurring = form.get("recurring") === "on";
  if (!name) throw new Error("Nombre obligatorio");
  if (amount !== null && (!Number.isFinite(amount) || amount < 1))
    throw new Error("Monto inválido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error("Fecha inválida");
  if (!["payable", "loan_payment"].includes(kind))
    throw new Error("Tipo de compromiso inválido");
  const { error } = await supabase.from("financial_obligations").insert({
    business_id: membership.business_id,
    name,
    amount,
    due_date: dueDate,
    kind,
    recurrence: recurring ? "monthly" : null,
    carry_amount: recurring && form.get("carryAmount") === "on",
    status: "pending",
    note: String(form.get("note") || "").trim() || null,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath("/operacion");
}

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
  const financialStatus = String(form.get("financialStatus") || "verified");
  if (!["verified", "pending"].includes(financialStatus))
    throw new Error("Estado financiero inválido");
  const { data: transactionId, error } = await supabase.rpc(
    "record_operational_transaction",
    {
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
    },
  );
  if (error) throw error;
  const { error: statusError } = await supabase
    .from("operational_transactions")
    .update({ financial_status: financialStatus })
    .eq("id", transactionId);
  if (statusError) throw statusError;
  const obligationId = String(form.get("obligationId") || "");
  if (obligationId && financialStatus === "verified") {
    const { data: paidObligation, error: obligationError } = await supabase
      .from("financial_obligations")
      .update({
        status: "paid",
        amount: gross,
        updated_at: new Date().toISOString(),
      })
      .eq("id", obligationId)
      .eq("status", "pending")
      .select("id,business_id,name,due_date,kind,recurrence,carry_amount,note")
      .single();
    if (obligationError || !paidObligation)
      throw new Error(
        "El movimiento se guardó, pero no se pudo cerrar el compromiso. Revisa antes de volver a ingresarlo.",
      );
    if (paidObligation.recurrence === "monthly") {
      const nextDueDate = addOneMonth(paidObligation.due_date);
      const { data: existingNext, error: nextReadError } = await supabase
        .from("financial_obligations")
        .select("id")
        .eq("business_id", paidObligation.business_id)
        .eq("name", paidObligation.name)
        .eq("due_date", nextDueDate)
        .maybeSingle();
      if (nextReadError) throw nextReadError;
      if (!existingNext) {
        const { error: nextError } = await supabase
          .from("financial_obligations")
          .insert({
            business_id: paidObligation.business_id,
            name: advanceMonthInName(paidObligation.name),
            amount: paidObligation.carry_amount ? gross : null,
            due_date: nextDueDate,
            kind: paidObligation.kind,
            recurrence: "monthly",
            carry_amount: paidObligation.carry_amount,
            status: "pending",
            note: paidObligation.note,
            created_by: user.id,
          });
        if (nextError) throw nextError;
      }
    }
  }
  revalidatePath("/operacion");
  revalidatePath("/costos");
}

function addOneMonth(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function advanceMonthInName(value: string) {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const normalized = value.toLocaleLowerCase("es");
  const index = months.findIndex((month) => normalized.includes(month));
  if (index < 0) return value;
  const current = months[index];
  const next = months[(index + 1) % months.length];
  return value.replace(new RegExp(current, "i"), next);
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
  const financialStatus = String(form.get("financialStatus") || "verified");
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
  const validStatuses = [
    "verified",
    "pending",
    "historical",
    "historical_verified",
  ];
  if (!validTypes.includes(type)) throw new Error("Tipo inválido");
  if (!description) throw new Error("Descripción obligatoria");
  if (paymentMethod && !validPayments.includes(paymentMethod))
    throw new Error("Medio de pago inválido");
  if (!validStatuses.includes(financialStatus))
    throw new Error("Estado financiero inválido");
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
      financial_status: financialStatus,
      supplier: String(form.get("supplier") || "").trim() || null,
      note: String(form.get("note") || "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", String(form.get("id")));
  if (error) throw error;
  revalidatePath("/operacion");
  revalidatePath("/costos");
}
