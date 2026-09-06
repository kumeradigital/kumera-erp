import { createClient } from "@/server/supabase/server";
import type { InventoryItem, InventorySupplier } from "./types";

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const { data: membership, error: membershipError } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (membershipError) throw membershipError;

  const [{ data, error }, { data: supplies, error: suppliesError }] =
    await Promise.all([
      supabase
        .from("ingredients")
        .select(
          "id,name,category,inventory_quantity,inventory_supplier,inventory_updated_at",
        )
        .eq("business_id", membership.business_id)
        .is("deleted_at", null)
        .is("inventory_hidden_at", null)
        .order("name"),
      supabase
        .from("inventory_supplies")
        .select(
          "id,name,category,inventory_quantity,inventory_supplier,updated_at",
        )
        .eq("business_id", membership.business_id)
        .is("archived_at", null)
        .order("name"),
    ]);
  if (error) throw error;
  if (suppliesError) throw suppliesError;

  return [
    ...(data || []).map((row) => ({
      id: row.id,
      kind: "ingredient" as const,
      name: row.name,
      category: row.category,
      quantity:
        row.inventory_quantity == null
          ? undefined
          : Number(row.inventory_quantity),
      supplier:
        (row.inventory_supplier as InventorySupplier | null) || undefined,
      updatedAt: row.inventory_updated_at || undefined,
    })),
    ...(supplies || []).map((row) => ({
      id: row.id,
      kind: "supply" as const,
      name: row.name,
      category: row.category,
      quantity: Number(row.inventory_quantity),
      supplier:
        (row.inventory_supplier as InventorySupplier | null) || undefined,
      updatedAt: row.updated_at,
    })),
  ].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
}

export async function getInventoryProviders(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");

  const { data: membership, error: membershipError } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (membershipError) throw membershipError;

  const { data, error } = await supabase
    .from("inventory_providers")
    .select("name")
    .eq("business_id", membership.business_id)
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data || []).map((row) => row.name);
}
