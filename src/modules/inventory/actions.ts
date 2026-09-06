"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import { inventorySuppliers, type InventorySupplier } from "./types";

export async function saveInventoryAction(
  items: {
    ingredientId: string;
    kind: "ingredient" | "supply";
    quantity: number | null;
    supplier: InventorySupplier | null;
  }[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };

  const normalized = items.map((item) => ({
    ingredient_id: item.ingredientId,
    item_type: item.kind,
    quantity:
      item.quantity == null || item.quantity === undefined
        ? null
        : Number(Number(item.quantity).toFixed(3)),
    unit: "unit",
    supplier: item.supplier,
  }));
  if (
    normalized.some(
      (item) =>
        !item.ingredient_id ||
        !["ingredient", "supply"].includes(item.item_type) ||
        (item.quantity != null &&
          (!Number.isFinite(item.quantity) || item.quantity < 0)) ||
        item.unit !== "unit" ||
        (item.supplier != null && !inventorySuppliers.includes(item.supplier)),
    )
  ) {
    return { ok: false as const, error: "Hay cantidades inválidas" };
  }

  const { error } = await supabase.rpc("update_ingredient_inventory", {
    p_items: normalized,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inventario");
  return { ok: true as const };
}

export async function createInventorySupplyAction(input: {
  name: string;
  category: string;
  quantity: number;
  supplier: InventorySupplier | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };

  const name = input.name.trim();
  const category = input.category.trim();
  if (
    name.length < 2 ||
    name.length > 120 ||
    !category ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 0 ||
    (input.supplier != null && !inventorySuppliers.includes(input.supplier))
  ) {
    return { ok: false as const, error: "Revisa los datos del insumo" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (membershipError) {
    return { ok: false as const, error: membershipError.message };
  }

  const { error } = await supabase.from("inventory_supplies").insert({
    business_id: membership.business_id,
    name,
    category,
    inventory_quantity: input.quantity,
    inventory_supplier: input.supplier,
  });
  if (error) {
    return {
      ok: false as const,
      error:
        error.code === "23505"
          ? "Ya existe un insumo con ese nombre"
          : error.message,
    };
  }

  revalidatePath("/inventario");
  return { ok: true as const };
}
