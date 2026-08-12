"use server";

import { revalidatePath } from "next/cache";
import { calculateTax, type TaxMode } from "@/shared/money";
import { createClient } from "@/server/supabase/server";
import { openingEntrySchema } from "./validation";
import type { EntryType } from "./types";

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
  if (error || !membership) throw new Error("No tienes un negocio asignado");
  const { data: ledger, error: ledgerError } = await supabase
    .from("opening_ledgers")
    .select("id")
    .eq("business_id", membership.business_id)
    .single();
  if (ledgerError) throw ledgerError;
  return {
    supabase,
    user,
    businessId: membership.business_id,
    ledgerId: ledger.id,
  };
}

export async function saveEntryAction(formData: FormData) {
  const ctx = await context();
  const id = String(formData.get("id") || "") || undefined;
  const type = String(formData.get("type")) as EntryType;
  const taxMode = String(formData.get("taxMode")) as TaxMode;
  const parsed = openingEntrySchema.safeParse({
    date: String(formData.get("date")),
    description: String(formData.get("description")),
    type,
    taxMode,
    amount: Number(formData.get("amount")),
    estimated: formData.get("estimated") === "true",
    note: String(formData.get("note") || ""),
  });
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Movimiento inválido");

  const categoryName = String(formData.get("category") || "").trim();
  let categoryId: string | null = null;
  if (categoryName) {
    const existing = await ctx.supabase
      .from("categories")
      .select("id")
      .eq("business_id", ctx.businessId)
      .eq("name", categoryName)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) categoryId = existing.data.id;
    else {
      const created = await ctx.supabase
        .from("categories")
        .insert({
          business_id: ctx.businessId,
          name: categoryName,
          position: 999,
        })
        .select("id")
        .single();
      if (created.error) throw created.error;
      categoryId = created.data.id;
    }
  }

  const mode = ["initial_capital", "income", "refund"].includes(type)
    ? "exempt"
    : taxMode;
  const tax = calculateTax(
    parsed.data.amount,
    mode,
    mode === "exempt" ? 0 : 19,
  );
  let before: unknown = null;
  if (id) {
    const current = await ctx.supabase
      .from("opening_entries")
      .select("*")
      .eq("id", id)
      .eq("business_id", ctx.businessId)
      .single();
    if (current.error) throw current.error;
    before = current.data;
  }
  const values = {
    ledger_id: ctx.ledgerId,
    business_id: ctx.businessId,
    entry_date: parsed.data.date,
    description: parsed.data.description,
    category_id: categoryId,
    type,
    tax_mode: mode,
    tax_rate: mode === "exempt" ? 0 : 19,
    net_amount: tax.net,
    tax_amount: tax.tax,
    total_amount: tax.total,
    note: parsed.data.note || null,
    estimated: parsed.data.estimated,
    updated_by: ctx.user.id,
    ...(!id ? { created_by: ctx.user.id } : {}),
  };
  const result = id
    ? await ctx.supabase
        .from("opening_entries")
        .update(values)
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("opening_entries")
        .insert(values)
        .select("id")
        .single();
  if (result.error) throw result.error;
  const audit = await ctx.supabase.from("entry_change_log").insert({
    business_id: ctx.businessId,
    entry_id: result.data.id,
    actor_id: ctx.user.id,
    before,
    after: values,
    action: id ? "updated" : "created",
  });
  if (audit.error) throw audit.error;

  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024)
      throw new Error("El comprobante supera 10 MB");
    const path = `${ctx.businessId}/${result.data.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await ctx.supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    const attachment = await ctx.supabase.from("attachments").insert({
      business_id: ctx.businessId,
      entry_id: result.data.id,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || "application/octet-stream",
      size: file.size,
      created_by: ctx.user.id,
    });
    if (attachment.error) throw attachment.error;
  }
  revalidatePath("/");
  return { ok: true, id: result.data.id };
}

export async function closeOpeningLedgerAction(
  ledgerId: string,
  recoverableInvestment: number,
  note = "",
) {
  const ctx = await context();
  if (!Number.isInteger(recoverableInvestment) || recoverableInvestment < 0)
    throw new Error("Inversión por recuperar inválida");
  const { error } = await ctx.supabase.rpc("close_opening_ledger", {
    p_ledger: ledgerId,
    p_recoverable: recoverableInvestment,
    p_note: note,
  });
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/operacion");
}

export async function duplicateEntryAction(id: string) {
  const ctx = await context();
  const { data: source, error } = await ctx.supabase
    .from("opening_entries")
    .select("*")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .single();
  if (error) throw error;
  const {
    id: _id,
    created_at: _created,
    updated_at: _updated,
    void_reason: _void,
    ...copy
  } = source;
  void _id;
  void _created;
  void _updated;
  void _void;
  const created = await ctx.supabase
    .from("opening_entries")
    .insert({
      ...copy,
      description: `${source.description} (copia)`,
      status: "active",
      created_by: ctx.user.id,
      updated_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  await ctx.supabase.from("entry_change_log").insert({
    business_id: ctx.businessId,
    entry_id: created.data.id,
    actor_id: ctx.user.id,
    after: copy,
    action: "duplicated",
  });
  revalidatePath("/");
  return { ok: true };
}

export async function voidEntryAction(id: string, restore = false) {
  const ctx = await context();
  const current = await ctx.supabase
    .from("opening_entries")
    .select("*")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .single();
  if (current.error) throw current.error;
  const values = {
    status: restore ? "active" : "void",
    void_reason: restore ? null : "Anulado por el administrador",
    updated_by: ctx.user.id,
    updated_at: new Date().toISOString(),
  };
  const updated = await ctx.supabase
    .from("opening_entries")
    .update(values)
    .eq("id", id)
    .eq("business_id", ctx.businessId);
  if (updated.error) throw updated.error;
  await ctx.supabase.from("entry_change_log").insert({
    business_id: ctx.businessId,
    entry_id: id,
    actor_id: ctx.user.id,
    before: current.data,
    after: values,
    action: restore ? "restored" : "voided",
  });
  revalidatePath("/");
  return { ok: true };
}
