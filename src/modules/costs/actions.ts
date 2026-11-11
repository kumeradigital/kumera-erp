"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";
import { toBaseQuantity } from "./calculations";
import type { CostUnit, FixedCostPeriod, RecipeKind } from "./types";

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
  if (error) throw error;
  return { supabase, user, businessId: membership.business_id };
}

function text(form: FormData, key: string) {
  return String(form.get(key) || "").trim();
}

function positive(form: FormData, key: string) {
  const value = Number(form.get(key));
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${key}: valor inválido`);
  return value;
}

async function loadResaleSource(
  ctx: Awaited<ReturnType<typeof context>>,
  sourceId: string,
) {
  const source = await ctx.supabase
    .from("ingredients")
    .select("id,name,base_unit,source_type")
    .eq("id", sourceId)
    .eq("business_id", ctx.businessId)
    .eq("source_type", "resale")
    .is("deleted_at", null)
    .single();
  if (source.error || !source.data)
    throw new Error("Selecciona una compra para reventa válida");
  if (source.data.base_unit !== "unit")
    throw new Error("La compra para reventa debe medirse en unidades");
  const price = await ctx.supabase
    .from("ingredient_prices")
    .select("gross_amount,purchase_quantity,tax_rate")
    .eq("business_id", ctx.businessId)
    .eq("ingredient_id", sourceId)
    .order("purchase_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (price.error) throw price.error;
  if (!price.data)
    throw new Error(`Registra primero el precio de ${source.data.name}`);
  return price.data;
}

export async function saveIngredientAction(form: FormData) {
  const ctx = await context();
  const id = text(form, "id") || undefined;
  const name = text(form, "name");
  const category = text(form, "category");
  const baseUnit = text(form, "baseUnit") as "g" | "ml" | "unit";
  const notes = text(form, "notes");
  const sourceType = text(form, "sourceType") || "raw";
  const usableYieldPercentage = Number(
    form.get("usableYieldPercentage") || 100,
  );
  const yieldLossType = text(form, "yieldLossType") || "none";
  const yieldStatus = text(form, "yieldStatus") || "confirmed";
  if (!name || name.length > 100) throw new Error("Nombre inválido");
  if (!category || category.length > 60)
    throw new Error("Crea o selecciona una categoría válida");
  if (!(["g", "ml", "unit"] as const).includes(baseUnit))
    throw new Error("Unidad base inválida");
  if (!"raw supply resale".split(" ").includes(sourceType))
    throw new Error("Tipo de fuente de costo inválido");
  if (sourceType === "resale" && baseUnit !== "unit")
    throw new Error("Una compra para reventa debe medirse en unidades");
  if (
    !Number.isFinite(usableYieldPercentage) ||
    usableYieldPercentage <= 0 ||
    usableYieldPercentage > 100
  )
    throw new Error("El rendimiento debe estar entre 0 y 100%");
  if (
    !"none cleaning cooking bone_skin combined"
      .split(" ")
      .includes(yieldLossType)
  )
    throw new Error("Tipo de pérdida inválido");
  if (!"estimated confirmed".split(" ").includes(yieldStatus))
    throw new Error("Estado del rendimiento inválido");
  const values = {
    business_id: ctx.businessId,
    name,
    category,
    base_unit: baseUnit,
    notes: notes || null,
    source_type: sourceType,
    usable_yield_percentage: usableYieldPercentage,
    yield_loss_type: yieldLossType,
    yield_status: yieldStatus,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await ctx.supabase
        .from("ingredients")
        .update(values)
        .eq("id", id)
        .eq("business_id", ctx.businessId)
        .is("deleted_at", null)
    : await ctx.supabase.from("ingredients").insert(values);
  if (result.error) throw result.error;
  revalidatePath("/costos");
}

export async function deleteIngredientAction(id: string) {
  const ctx = await context();
  const { data: ingredient, error: ingredientError } = await ctx.supabase
    .from("ingredients")
    .select("id,name")
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .is("deleted_at", null)
    .single();
  if (ingredientError) throw ingredientError;

  const { count, error: usageError } = await ctx.supabase
    .from("recipe_items")
    .select("id", { count: "exact", head: true })
    .eq("business_id", ctx.businessId)
    .eq("ingredient_id", id);
  if (usageError) throw usageError;
  if ((count || 0) > 0) {
    throw new Error(
      `${ingredient.name} está incluida en una o más recetas. Retírala de esas recetas antes de eliminarla.`,
    );
  }

  const { count: productUsage, error: productUsageError } = await ctx.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", ctx.businessId)
    .eq("resale_source_id", id)
    .is("deleted_at", null);
  if (productUsageError) throw productUsageError;
  if ((productUsage || 0) > 0) {
    throw new Error(
      `${ingredient.name} está vinculada a uno o más productos para vender. Cambia primero su fuente de costo.`,
    );
  }

  const { error } = await ctx.supabase
    .from("ingredients")
    .update({
      active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .is("deleted_at", null);
  if (error) throw error;
  revalidatePath("/costos");
}

export async function addIngredientPriceAction(form: FormData) {
  const ctx = await context();
  const ingredientId = text(form, "ingredientId");
  const purchaseQuantity = positive(form, "purchaseQuantity");
  const purchaseUnit = text(form, "purchaseUnit") as CostUnit;
  const enteredAmount = Math.round(
    Number(form.get("purchaseAmount") || form.get("grossAmount") || 0),
  );
  if (!Number.isFinite(enteredAmount) || enteredAmount <= 0)
    throw new Error("Monto de compra inválido");
  const taxMode = text(form, "taxMode") || "included";
  const taxRate = Number(form.get("taxRate") || 19);
  const supplier = text(form, "supplier");
  const purchaseDate = text(form, "purchaseDate");
  const { data: ingredient, error: ingredientError } = await ctx.supabase
    .from("ingredients")
    .select("base_unit")
    .eq("id", ingredientId)
    .eq("business_id", ctx.businessId)
    .is("deleted_at", null)
    .single();
  if (ingredientError) throw ingredientError;
  let baseQuantity: number;
  try {
    baseQuantity = toBaseQuantity(
      purchaseQuantity,
      purchaseUnit,
      ingredient.base_unit,
    );
  } catch {
    throw new Error("La unidad de compra no es compatible con el ingrediente");
  }
  if (!"included net exempt".split(" ").includes(taxMode))
    throw new Error("Tratamiento de IVA inválido");
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100)
    throw new Error("IVA inválido");
  const netAmount =
    taxMode === "net"
      ? enteredAmount
      : taxMode === "exempt"
        ? enteredAmount
        : Math.round(enteredAmount / (1 + taxRate / 100));
  const grossAmount =
    taxMode === "net"
      ? Math.round(enteredAmount * (1 + taxRate / 100))
      : enteredAmount;
  const taxAmount = grossAmount - netAmount;
  const { error } = await ctx.supabase.from("ingredient_prices").insert({
    business_id: ctx.businessId,
    ingredient_id: ingredientId,
    purchase_quantity: purchaseQuantity,
    purchase_unit: purchaseUnit,
    base_quantity: baseQuantity,
    gross_amount: grossAmount,
    net_amount: netAmount,
    tax_amount: taxAmount,
    tax_rate: taxMode === "exempt" ? 0 : taxRate,
    supplier: supplier || null,
    purchase_date: purchaseDate,
    created_by: ctx.user.id,
  });
  if (error) throw error;
  revalidatePath("/costos");
}

export async function saveRecipeAction(form: FormData) {
  const ctx = await context();
  const id = text(form, "id") || undefined;
  const name = text(form, "name");
  const description = text(form, "description");
  const yieldQuantity = positive(form, "yieldQuantity");
  const yieldUnit = text(form, "yieldUnit");
  const recipeKind = text(form, "recipeKind") as RecipeKind;
  if (!name || name.length > 120) throw new Error("Nombre inválido");
  if (!(["unit", "kg"] as const).includes(yieldUnit as "unit" | "kg"))
    throw new Error("Rendimiento inválido");
  if (!(["subrecipe", "final"] as const).includes(recipeKind))
    throw new Error("Tipo de receta inválido");
  const values = {
    business_id: ctx.businessId,
    name,
    description: description || null,
    yield_quantity: yieldQuantity,
    yield_unit: yieldUnit,
    recipe_kind: recipeKind,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await ctx.supabase
        .from("recipes")
        .update(values)
        .eq("id", id)
        .eq("business_id", ctx.businessId)
    : await ctx.supabase.from("recipes").insert(values);
  if (result.error) throw result.error;
  revalidatePath("/costos");
}

export async function deleteRecipeAction(id: string) {
  const ctx = await context();
  const { error } = await ctx.supabase.rpc("delete_recipe", {
    p_recipe: id,
  });
  if (error) throw error;
  revalidatePath("/costos");
}

export async function addRecipeItemAction(form: FormData) {
  const ctx = await context();
  const recipeId = text(form, "recipeId");
  const componentType = text(form, "componentType");
  const componentId = text(form, "componentId");
  const quantity = positive(form, "quantity");
  const unit = text(form, "unit") as CostUnit;
  if (!(["ingredient", "recipe"] as const).includes(componentType as never))
    throw new Error("Componente inválido");
  if (componentType === "recipe" && componentId === recipeId)
    throw new Error("Una receta no puede contenerse a sí misma");
  const { data: targetRecipe, error: targetError } = await ctx.supabase
    .from("recipes")
    .select("id")
    .eq("id", recipeId)
    .eq("business_id", ctx.businessId)
    .is("deleted_at", null)
    .single();
  if (targetError || !targetRecipe) throw new Error("Receta no válida");
  if (componentType === "recipe") {
    const { data: componentRecipe, error: componentError } = await ctx.supabase
      .from("recipes")
      .select("recipe_kind")
      .eq("id", componentId)
      .eq("business_id", ctx.businessId)
      .is("deleted_at", null)
      .single();
    if (componentError || componentRecipe?.recipe_kind !== "subrecipe")
      throw new Error("Sólo una subreceta puede agregarse como componente");
  } else {
    const { data: ingredient, error: ingredientError } = await ctx.supabase
      .from("ingredients")
      .select("id")
      .eq("id", componentId)
      .eq("business_id", ctx.businessId)
      .is("deleted_at", null)
      .single();
    if (ingredientError || !ingredient)
      throw new Error("Materia prima no válida");
  }
  const { data: existingItems, error: existingError } = await ctx.supabase
    .from("recipe_items")
    .select("ingredient_id,subrecipe_id")
    .eq("recipe_id", recipeId)
    .eq("business_id", ctx.businessId);
  if (existingError) throw existingError;
  const alreadyExists = existingItems?.some((item) =>
    componentType === "ingredient"
      ? item.ingredient_id === componentId
      : item.subrecipe_id === componentId,
  );
  if (alreadyExists) {
    throw new Error(
      "Este componente ya está en la receta. Edita su cantidad desde el detalle.",
    );
  }
  const { error } = await ctx.supabase.from("recipe_items").insert({
    business_id: ctx.businessId,
    recipe_id: recipeId,
    ingredient_id: componentType === "ingredient" ? componentId : null,
    subrecipe_id: componentType === "recipe" ? componentId : null,
    quantity,
    unit,
    position: 999,
  });
  if (error) throw error;
  revalidatePath("/costos");
}

export async function deleteRecipeItemAction(id: string) {
  const ctx = await context();
  const { error } = await ctx.supabase
    .from("recipe_items")
    .delete()
    .eq("id", id)
    .eq("business_id", ctx.businessId);
  if (error) throw error;
  revalidatePath("/costos");
}

export async function updateRecipeItemAction(form: FormData) {
  const ctx = await context();
  const id = text(form, "id");
  const quantity = positive(form, "quantity");
  const unit = text(form, "unit") as CostUnit;
  if (!("g kg ml l unit".split(" ") as CostUnit[]).includes(unit))
    throw new Error("Unidad inválida");
  const { data, error } = await ctx.supabase
    .from("recipe_items")
    .update({ quantity, unit })
    .eq("id", id)
    .eq("business_id", ctx.businessId)
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo actualizar el componente");
  revalidatePath("/costos");
}

export async function configureProductCostAction(form: FormData) {
  const ctx = await context();
  const productId = text(form, "productId");
  const recipeId = text(form, "recipeId") || null;
  const productType = text(form, "productType") || "manufactured";
  const resaleSourceId = text(form, "resaleSourceId") || null;
  const wastePercentage = Number(form.get("wastePercentage") || 0);
  const targetMarginPercentage = Number(
    form.get("targetMarginPercentage") || 60,
  );
  if (wastePercentage < 0 || wastePercentage >= 100)
    throw new Error("Merma inválida");
  if (targetMarginPercentage < 0 || targetMarginPercentage >= 95)
    throw new Error("Margen objetivo inválido");
  if (!["resale", "manufactured", "mixed"].includes(productType))
    throw new Error("Tipo de producto inválido");
  const sourcePrice =
    productType === "resale" && resaleSourceId
      ? await loadResaleSource(ctx, resaleSourceId)
      : null;
  if (productType === "resale" && !resaleSourceId)
    throw new Error("Selecciona la compra que origina el costo del producto");
  if (recipeId) {
    const { data: recipe, error: recipeError } = await ctx.supabase
      .from("recipes")
      .select("recipe_kind")
      .eq("id", recipeId)
      .eq("business_id", ctx.businessId)
      .is("deleted_at", null)
      .single();
    if (recipeError || recipe?.recipe_kind !== "final")
      throw new Error("Debes seleccionar una receta final");
  }
  const { error } = await ctx.supabase
    .from("products")
    .update({
      cost_recipe_id: recipeId,
      waste_percentage: wastePercentage,
      target_margin_percentage: targetMarginPercentage,
      product_type: productType,
      resale_source_id: productType === "resale" ? resaleSourceId : null,
      resale_purchase_gross_amount:
        productType === "resale" ? Number(sourcePrice?.gross_amount) : null,
      resale_units_per_purchase:
        productType === "resale"
          ? Number(sourcePrice?.purchase_quantity)
          : null,
      resale_tax_rate:
        productType === "resale" ? Number(sourcePrice?.tax_rate) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId)
    .eq("business_id", ctx.businessId);
  if (error) throw error;
  revalidatePath("/costos");
}

export async function createCostedProductAction(form: FormData) {
  const ctx = await context();
  const name = text(form, "name");
  const categoryName = text(form, "category");
  const description = text(form, "description");
  const price = Math.round(Number(form.get("price")));
  const saleUnit = text(form, "saleUnit") as "unit" | "kg";
  const productType = text(form, "productType") as
    "resale" | "manufactured" | "mixed";
  const recipeId = text(form, "recipeId") || null;
  const resaleSourceId = text(form, "resaleSourceId") || null;
  const targetMargin = Number(form.get("targetMarginPercentage") || 60);
  const pedidosYaRaw = text(form, "pedidosYaPrice");
  const pedidosYaPrice = pedidosYaRaw ? Math.round(Number(pedidosYaRaw)) : null;
  const trackDailyAvailability =
    saleUnit === "unit" && form.get("trackDailyAvailability") === "on";
  if (!name || name.length > 100)
    throw new Error("Nombre de producto inválido");
  if (!categoryName || categoryName.length > 60)
    throw new Error("Categoría inválida");
  if (!Number.isInteger(price) || price <= 0)
    throw new Error("El precio de venta debe ser mayor que cero");
  if (
    pedidosYaPrice != null &&
    (!Number.isInteger(pedidosYaPrice) || pedidosYaPrice <= 0)
  )
    throw new Error("Precio de PedidosYa inválido");
  if (!(["unit", "kg"] as const).includes(saleUnit))
    throw new Error("Forma de venta inválida");
  if (!(["resale", "manufactured", "mixed"] as const).includes(productType))
    throw new Error("Tipo de producto inválido");
  if (targetMargin < 0 || targetMargin >= 95)
    throw new Error("Margen objetivo inválido");
  const sourcePrice =
    productType === "resale" && resaleSourceId
      ? await loadResaleSource(ctx, resaleSourceId)
      : null;
  if (productType === "resale" && !resaleSourceId)
    throw new Error("Selecciona una compra para reventa");
  if (productType !== "resale" && !recipeId)
    throw new Error("Selecciona la receta final del producto");
  if (recipeId) {
    const recipe = await ctx.supabase
      .from("recipes")
      .select("id,recipe_kind,yield_unit")
      .eq("id", recipeId)
      .eq("business_id", ctx.businessId)
      .is("deleted_at", null)
      .single();
    if (recipe.error || recipe.data.recipe_kind !== "final")
      throw new Error("Selecciona una receta final válida");
    if (recipe.data.yield_unit !== saleUnit)
      throw new Error(
        "La unidad de la receta no coincide con la forma de venta",
      );
  }
  const duplicate = await ctx.supabase
    .from("products")
    .select("id")
    .eq("business_id", ctx.businessId)
    .eq("name", name)
    .is("deleted_at", null)
    .maybeSingle();
  if (duplicate.error) throw duplicate.error;
  if (duplicate.data) throw new Error("Ya existe un producto con ese nombre");
  const existingCategory = await ctx.supabase
    .from("product_categories")
    .select("id")
    .eq("business_id", ctx.businessId)
    .eq("name", categoryName)
    .maybeSingle();
  if (existingCategory.error) throw existingCategory.error;
  let categoryId = existingCategory.data?.id;
  if (!categoryId) {
    const createdCategory = await ctx.supabase
      .from("product_categories")
      .insert({
        business_id: ctx.businessId,
        name: categoryName,
        position: 999,
      })
      .select("id")
      .single();
    if (createdCategory.error) throw createdCategory.error;
    categoryId = createdCategory.data.id;
  }
  let imagePath: string | null = null;
  const image = form.get("image");
  if (image instanceof File && image.size > 0) {
    if (image.size > 5 * 1024 * 1024)
      throw new Error("La imagen supera el máximo de 5 MB");
    imagePath = `${ctx.businessId}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await ctx.supabase.storage
      .from("product-images")
      .upload(imagePath, image, {
        contentType: image.type,
        cacheControl: "31536000",
      });
    if (uploaded.error) throw uploaded.error;
  }
  const created = await ctx.supabase.from("products").insert({
    business_id: ctx.businessId,
    category_id: categoryId,
    name,
    description: description || null,
    price,
    pedidosya_price: pedidosYaPrice,
    image_path: imagePath,
    sale_unit: saleUnit,
    track_daily_availability: trackDailyAvailability,
    product_type: productType,
    resale_source_id: productType === "resale" ? resaleSourceId : null,
    cost_recipe_id: productType === "resale" ? null : recipeId,
    target_margin_percentage: targetMargin,
    waste_percentage: Number(form.get("wastePercentage") || 0),
    resale_purchase_gross_amount:
      productType === "resale" ? Number(sourcePrice?.gross_amount) : null,
    resale_units_per_purchase:
      productType === "resale" ? Number(sourcePrice?.purchase_quantity) : null,
    resale_tax_rate:
      productType === "resale" ? Number(sourcePrice?.tax_rate) : null,
    updated_at: new Date().toISOString(),
  });
  if (created.error) throw created.error;
  revalidatePath("/costos");
  revalidatePath("/productos");
  revalidatePath("/caja");
}

export async function saveFixedCostAction(form: FormData) {
  const ctx = await context();
  const id = text(form, "id") || undefined;
  const name = text(form, "name");
  const category = text(form, "category") || "Otros";
  const amount = Math.round(positive(form, "amount"));
  const period = text(form, "period") as FixedCostPeriod;
  const startsOn = text(form, "startsOn");
  const endsOn = text(form, "endsOn");
  if (!name) throw new Error("Nombre obligatorio");
  if (
    !(
      [
        "daily",
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
      ] as FixedCostPeriod[]
    ).includes(period)
  )
    throw new Error("Periodicidad inválida");
  const values = {
    business_id: ctx.businessId,
    name,
    category,
    amount,
    period,
    starts_on: startsOn,
    ends_on: endsOn || null,
    affects_profitability: form.get("affectsProfitability") === "on",
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await ctx.supabase
        .from("fixed_costs")
        .update(values)
        .eq("id", id)
        .eq("business_id", ctx.businessId)
    : await ctx.supabase.from("fixed_costs").insert(values);
  const { error } = result;
  if (error) throw error;
  revalidatePath("/costos");
  revalidatePath("/operacion");
}

export async function toggleFixedCostAction(id: string, active: boolean) {
  const ctx = await context();
  const { error } = await ctx.supabase
    .from("fixed_costs")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("business_id", ctx.businessId);
  if (error) throw error;
  revalidatePath("/costos");
  revalidatePath("/operacion");
}

export async function saveCostSettingsAction(form: FormData) {
  const ctx = await context();
  const operatingDaysMode = text(form, "operatingDaysMode");
  if (
    !(["manual", "weekly"] as const).includes(
      operatingDaysMode as "manual" | "weekly",
    )
  )
    throw new Error("Selecciona cómo calcular los días abiertos");
  const operatingWeekdays = form
    .getAll("operatingWeekdays")
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);
  if (operatingDaysMode === "weekly" && !operatingWeekdays.length)
    throw new Error("Selecciona al menos un día de funcionamiento");
  const manualDays = Number(form.get("operatingDaysMonth"));
  if (
    operatingDaysMode === "manual" &&
    (!Number.isInteger(manualDays) || manualDays < 1 || manualDays > 31)
  )
    throw new Error("Los días abiertos deben estar entre 1 y 31");
  const values = {
    vat_rate: Number(form.get("vatRate")),
    operating_days_month: manualDays,
    expected_cash_percentage: Number(form.get("expectedCashPercentage")),
    expected_debit_percentage: Number(form.get("expectedDebitPercentage")),
    expected_credit_percentage: Number(form.get("expectedCreditPercentage")),
    expected_transfer_percentage: Number(
      form.get("expectedTransferPercentage"),
    ),
    expected_ticket_amount: Number(form.get("expectedTicketAmount")),
    target_monthly_profit: Number(form.get("targetMonthlyProfit") || 0),
    operational_waste_percentage: Number(
      form.get("operationalWastePercentage") || 0,
    ),
    updated_at: new Date().toISOString(),
  };
  const mix =
    values.expected_cash_percentage +
    values.expected_debit_percentage +
    values.expected_credit_percentage +
    values.expected_transfer_percentage;
  if (Math.abs(mix - 100) > 0.001)
    throw new Error("La mezcla de medios de pago debe sumar 100%");
  if (values.expected_ticket_amount <= 0)
    throw new Error("El ticket promedio esperado debe ser mayor que cero");
  if (
    values.operational_waste_percentage < 0 ||
    values.operational_waste_percentage > 20
  )
    throw new Error("La reserva de merma debe estar entre 0% y 20%");
  const { error } = await ctx.supabase
    .from("cost_settings")
    .update(values)
    .eq("business_id", ctx.businessId);
  if (error) throw error;
  const locationResult = await ctx.supabase
    .from("business_locations")
    .update({
      operating_days_mode: operatingDaysMode,
      operating_weekdays:
        operatingDaysMode === "weekly"
          ? operatingWeekdays
          : [1, 2, 3, 4, 5, 6, 7],
      opening_time:
        operatingDaysMode === "weekly"
          ? text(form, "openingTime") || null
          : null,
      closing_time:
        operatingDaysMode === "weekly"
          ? text(form, "closingTime") || null
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", ctx.businessId)
    .eq("is_primary", true);
  if (locationResult.error) throw locationResult.error;
  revalidatePath("/costos");
  revalidatePath("/operacion");
}

export async function saveScenarioAction(input: {
  id?: string;
  name: string;
  operatingDays: number;
  targetProfit: number;
  quantities: Record<string, number>;
}) {
  const ctx = await context();
  if (!input.name.trim()) throw new Error("Nombre obligatorio");
  const scenario = input.id
    ? await ctx.supabase
        .from("sales_scenarios")
        .update({
          name: input.name.trim(),
          operating_days: input.operatingDays,
          target_profit: input.targetProfit,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.id)
        .eq("business_id", ctx.businessId)
        .select("id")
        .single()
    : await ctx.supabase
        .from("sales_scenarios")
        .insert({
          business_id: ctx.businessId,
          name: input.name.trim(),
          operating_days: input.operatingDays,
          target_profit: input.targetProfit,
        })
        .select("id")
        .single();
  if (scenario.error) throw scenario.error;
  const scenarioId = scenario.data.id;
  const deletion = await ctx.supabase
    .from("sales_scenario_items")
    .delete()
    .eq("scenario_id", scenarioId)
    .eq("business_id", ctx.businessId);
  if (deletion.error) throw deletion.error;
  const items = Object.entries(input.quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({
      business_id: ctx.businessId,
      scenario_id: scenarioId,
      product_id: productId,
      quantity_per_day: quantity,
    }));
  if (items.length) {
    const insertion = await ctx.supabase
      .from("sales_scenario_items")
      .insert(items);
    if (insertion.error) throw insertion.error;
  }
  revalidatePath("/costos");
}
