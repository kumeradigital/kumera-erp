import { createClient } from "@/server/supabase/server";
import type { EntryType, OpeningEntry } from "./types";
import type { TaxMode } from "@/shared/money";

type DbEntry = {
  id: string;
  entry_date: string;
  description: string;
  type: EntryType;
  tax_mode: TaxMode;
  tax_rate: number;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  note: string | null;
  estimated: boolean;
  status: "active" | "void";
  updated_at: string;
  categories: { name: string } | null;
  attachments: { file_name: string }[] | null;
};

export async function getOpeningData(userId: string) {
  const supabase = await createClient();
  const { data: membership, error: membershipError } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;
  const [
    { data: business, error: businessError },
    { data: ledger, error: ledgerError },
    { data: categoryRows, error: categoryError },
    { data: rows, error: entriesError },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id,name")
      .eq("id", membership.business_id)
      .single(),
    supabase
      .from("opening_ledgers")
      .select("id")
      .eq("business_id", membership.business_id)
      .single(),
    supabase
      .from("categories")
      .select("name")
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("position"),
    supabase
      .from("opening_entries")
      .select(
        "id,entry_date,description,type,tax_mode,tax_rate,net_amount,tax_amount,total_amount,note,estimated,status,updated_at,categories(name),attachments(file_name)",
      )
      .eq("business_id", membership.business_id)
      .order("entry_date", { ascending: false }),
  ]);
  const error = businessError || ledgerError || categoryError || entriesError;
  if (error) throw error;
  return {
    businessName: business.name,
    ledgerId: ledger.id,
    categories: (categoryRows || []).map((c) => c.name),
    entries: ((rows as unknown as DbEntry[]) || []).map(mapEntry),
  };
}

export function mapEntry(row: DbEntry): OpeningEntry {
  return {
    id: row.id,
    date: row.entry_date,
    description: row.description,
    category: row.categories?.name || "",
    type: row.type,
    taxMode: row.tax_mode,
    taxRate: row.tax_rate,
    net: Number(row.net_amount),
    tax: Number(row.tax_amount),
    total: Number(row.total_amount),
    note: row.note || undefined,
    estimated: row.estimated,
    receipt: row.attachments?.[0]?.file_name,
    status: row.status,
    updatedAt: row.updated_at,
  };
}
