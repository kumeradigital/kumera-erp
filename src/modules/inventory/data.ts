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

  const { data, error } = await supabase
    .from("ingredients")
    .select(
      "id,name,category,inventory_quantity,inventory_supplier,inventory_updated_at",
    )
    .eq("business_id", membership.business_id)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;

  return (data || [])
    .map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      quantity:
        row.inventory_quantity == null
          ? undefined
          : Number(row.inventory_quantity),
      supplier:
        (row.inventory_supplier as InventorySupplier | null) || undefined,
      updatedAt: row.inventory_updated_at || undefined,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
}
