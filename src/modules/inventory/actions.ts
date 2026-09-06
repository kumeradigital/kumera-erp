"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import type { InventoryUnit } from "./types";

export async function saveInventoryAction(
  items: {
    ingredientId: string;
    quantity: number | null;
    unit: InventoryUnit;
  }[],
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };

  const normalized = items.map((item) => ({
    ingredient_id: item.ingredientId,
    quantity:
      item.quantity == null || item.quantity === undefined
        ? null
        : Number(Number(item.quantity).toFixed(3)),
    unit: item.unit,
  }));
  if (
    normalized.some(
      (item) =>
        !item.ingredient_id ||
        (item.quantity != null &&
          (!Number.isFinite(item.quantity) || item.quantity < 0)) ||
        !["g", "kg", "ml", "l", "unit"].includes(item.unit),
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
