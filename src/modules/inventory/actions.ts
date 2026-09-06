"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";

export async function saveInventoryAction(
  items: {
    ingredientId: string;
    quantity: number | null;
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
    unit: "unit",
  }));
  if (
    normalized.some(
      (item) =>
        !item.ingredient_id ||
        (item.quantity != null &&
          (!Number.isFinite(item.quantity) || item.quantity < 0)) ||
        item.unit !== "unit",
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
