"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import type { InventoryItem, InventorySupplier } from "./types";

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
        (item.supplier != null &&
          (item.supplier.trim().length < 2 || item.supplier.length > 100)),
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
    (input.supplier != null &&
      (input.supplier.trim().length < 2 || input.supplier.length > 100))
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

  if (input.supplier) {
    const { data: provider, error: providerError } = await supabase
      .from("inventory_providers")
      .select("id")
      .eq("business_id", membership.business_id)
      .ilike("name", input.supplier.trim())
      .is("archived_at", null)
      .maybeSingle();
    if (providerError || !provider) {
      return { ok: false as const, error: "Proveedor no válido" };
    }
  }

  const { data, error } = await supabase
    .from("inventory_supplies")
    .insert({
      business_id: membership.business_id,
      name,
      category,
      inventory_quantity: input.quantity,
      inventory_supplier: input.supplier,
    })
    .select("id,name,category,inventory_quantity,inventory_supplier,updated_at")
    .single();
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
  return {
    ok: true as const,
    item: {
      id: data.id,
      kind: "supply" as const,
      name: data.name,
      category: data.category,
      quantity: Number(data.inventory_quantity),
      supplier: data.inventory_supplier || undefined,
      updatedAt: data.updated_at,
    } satisfies InventoryItem,
  };
}

export async function createInventoryProviderAction(nameInput: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };

  const name = nameInput.trim();
  if (name.length < 2 || name.length > 100) {
    return { ok: false as const, error: "Ingresa un nombre válido" };
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

  const { data, error } = await supabase
    .from("inventory_providers")
    .insert({ business_id: membership.business_id, name })
    .select("name")
    .single();
  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Ese proveedor ya existe" : error.message,
    };
  }
  revalidatePath("/inventario");
  return { ok: true as const, name: data.name as string };
}

export async function archiveInventoryItemAction(input: {
  id: string;
  kind: "ingredient" | "supply";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sesión no válida" };
  if (!input.id || !["ingredient", "supply"].includes(input.kind)) {
    return { ok: false as const, error: "Artículo no válido" };
  }

  const table =
    input.kind === "ingredient" ? "ingredients" : "inventory_supplies";
  const field =
    input.kind === "ingredient" ? "inventory_hidden_at" : "archived_at";
  const { error } = await supabase
    .from(table)
    .update({ [field]: new Date().toISOString() })
    .eq("id", input.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/inventario");
  return { ok: true as const };
}
