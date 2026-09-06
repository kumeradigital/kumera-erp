import { createClient } from "@/server/supabase/server";
import type { InventoryItem, InventoryUnit } from "./types";

function defaultUnit(baseUnit: "g" | "ml" | "unit"): InventoryUnit {
  if (baseUnit === "g") return "kg";
  if (baseUnit === "ml") return "l";
  return "unit";
}

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
      "id,name,category,base_unit,inventory_quantity,inventory_unit,inventory_updated_at",
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
      baseUnit: row.base_unit as "g" | "ml" | "unit",
      quantity:
        row.inventory_quantity == null
          ? undefined
          : Number(row.inventory_quantity),
      unit:
        (row.inventory_unit as InventoryUnit | null) ||
        defaultUnit(row.base_unit as "g" | "ml" | "unit"),
      updatedAt: row.inventory_updated_at || undefined,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
    );
}
