"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Beaker,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FlaskConical,
  Layers3,
  Plus,
  Settings,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  CollectionToolbar,
  useCollectionView,
} from "@/shared/ui/collection-controls";
import {
  addIngredientPriceAction,
  addRecipeItemAction,
  configureProductCostAction,
  deleteRecipeAction,
  deleteRecipeItemAction,
  saveCostSettingsAction,
  saveFixedCostAction,
  saveIngredientAction,
  saveRecipeAction,
  saveScenarioAction,
  toggleFixedCostAction,
} from "./actions";
import type {
  CostSettings,
  FixedCost,
  Ingredient,
  ProductCostAnalysis,
  Recipe,
  RecipeKind,
  RecipeCost,
  Scenario,
} from "./types";

type Tab = "ingredients" | "recipes" | "products" | "fixed" | "projections";

export function CostsApp({
  ingredients,
  recipes,
  recipeCosts,
  analyses,
  settings,
  fixedCosts,
  monthlyFixedCosts,
  scenarios,
}: {
  ingredients: Ingredient[];
  recipes: Recipe[];
  recipeCosts: Record<string, RecipeCost>;
  analyses: ProductCostAnalysis[];
  settings: CostSettings;
  fixedCosts: FixedCost[];
  monthlyFixedCosts: number;
  scenarios: Scenario[];
}) {
  const [tab, setTab] = useState<Tab>("ingredients");
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "ingredients", label: "Materias primas", icon: <Beaker size={16} /> },
    { id: "recipes", label: "Recetas", icon: <FlaskConical size={16} /> },
    {
      id: "products",
      label: "Costos de productos",
      icon: <CircleDollarSign size={16} />,
    },
    { id: "fixed", label: "Costos fijos", icon: <Calculator size={16} /> },
    { id: "projections", label: "Proyecciones", icon: <Target size={16} /> },
  ];
  return (
    <main className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Motor económico
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Costos, precios y rentabilidad
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#747970]">
            Los costos se calculan desde precios, ingredientes y recetas. No se
            ingresa manualmente el costo de un producto.
          </p>
        </div>
        <Link
          href="/costos/guia"
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#235b45] bg-[#fffef9] px-4 py-3 text-xs font-black text-[#235b45] hover:bg-[#edf3ea]"
        >
          <BookOpenCheck size={17} />
          Guía para costear y fijar precios
        </Link>
      </div>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${tab === item.id ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
      {tab === "ingredients" && <IngredientsView ingredients={ingredients} />}
      {tab === "recipes" && (
        <RecipesView
          ingredients={ingredients}
          recipes={recipes}
          costs={recipeCosts}
        />
      )}
      {tab === "products" && (
        <ProductsCostView analyses={analyses} recipes={recipes} />
      )}
      {tab === "fixed" && (
        <FixedCostsView
          costs={fixedCosts}
          monthly={monthlyFixedCosts}
          settings={settings}
        />
      )}
      {tab === "projections" && (
        <ProjectionsView
          analyses={analyses}
          fixedCosts={monthlyFixedCosts}
          settings={settings}
          scenarios={scenarios}
        />
      )}
    </main>
  );
}

function IngredientsView({ ingredients }: { ingredients: Ingredient[] }) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [pricing, setPricing] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [view, setView] = useCollectionView("ingredients");
  const categories = [
    "Todas",
    ...new Set(ingredients.map((ingredient) => ingredient.category)),
  ];
  const visible = ingredients.filter(
    (ingredient) =>
      (category === "Todas" || ingredient.category === category) &&
      `${ingredient.name} ${ingredient.category}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  return (
    <section className="mt-5">
      <SectionHeader
        title="Materias primas"
        subtitle="Registra formatos y precios; esto no controla inventario."
        action={() => setCreating(true)}
        actionLabel="Materia prima"
      />
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar materia prima..."
      >
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="input h-11 min-h-0 sm:w-48"
        >
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </CollectionToolbar>
      <div
        className={
          view === "cards"
            ? "mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            : "card mt-4 overflow-x-auto"
        }
      >
        {view === "list" && visible.length > 0 && (
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="border-b border-[#deddd4] bg-[#f4f4ec] text-[11px] uppercase text-[#747970]">
              <tr>
                <th className="px-4 py-3">Materia prima</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Unidad base</th>
                <th className="px-4 py-3">Costo vigente</th>
                <th className="px-4 py-3">Última compra</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ecebe3]">
              {visible.map((ingredient) => (
                <tr key={ingredient.id} className="hover:bg-[#fafaf4]">
                  <td className="px-4 py-3 font-black">{ingredient.name}</td>
                  <td className="px-4 py-3 text-[#70756d]">
                    {ingredient.category}
                  </td>
                  <td className="px-4 py-3">
                    {unitLabel(ingredient.baseUnit)}
                  </td>
                  <td className="money px-4 py-3 font-black text-[#235b45]">
                    {ingredient.latestPrice
                      ? `${formatDecimalMoney(ingredient.latestPrice.costPerBase)} / ${unitLabel(ingredient.baseUnit)}`
                      : "Sin precio"}
                  </td>
                  <td className="px-4 py-3 text-[#70756d]">
                    {ingredient.latestPrice
                      ? formatDate(ingredient.latestPrice.purchaseDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-bold">
                      <button onClick={() => setEditing(ingredient)}>
                        Editar
                      </button>
                      <button
                        onClick={() => setPricing(ingredient)}
                        className="text-[#235b45]"
                      >
                        {ingredient.latestPrice
                          ? "Actualizar precio"
                          : "Agregar precio"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {view === "cards" &&
          visible.map((ingredient) => (
            <article key={ingredient.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{ingredient.name}</h3>
                  <p className="mt-1 text-xs text-[#777]">
                    {ingredient.category} · base por{" "}
                    {unitLabel(ingredient.baseUnit)}
                  </p>
                </div>
                {ingredient.latestPrice ? (
                  <CheckCircle2 size={19} className="text-[#235b45]" />
                ) : (
                  <AlertTriangle size={19} className="text-[#b17a12]" />
                )}
              </div>
              {ingredient.latestPrice ? (
                <div className="mt-4 rounded-xl bg-[#f0f1e9] p-3">
                  <p className="text-[10px] font-bold uppercase text-[#777]">
                    Costo vigente
                  </p>
                  <p className="money mt-1 text-xl font-black">
                    {formatDecimalMoney(ingredient.latestPrice.costPerBase)} /{" "}
                    {unitLabel(ingredient.baseUnit)}
                  </p>
                  <p className="mt-1 text-[11px] text-[#777]">
                    {ingredient.latestPrice.purchaseQuantity}{" "}
                    {unitLabel(ingredient.latestPrice.purchaseUnit)} por{" "}
                    {formatClp(ingredient.latestPrice.grossAmount)} ·{" "}
                    {formatDate(ingredient.latestPrice.purchaseDate)}
                  </p>
                </div>
              ) : (
                <p className="mt-4 rounded-xl bg-[#fff4d4] p-3 text-xs text-[#795f0d]">
                  Falta registrar un precio.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setEditing(ingredient)}
                  className="rounded-xl border border-[#d7d7ce] py-2.5 text-xs font-bold"
                >
                  Editar
                </button>
                <button
                  onClick={() => setPricing(ingredient)}
                  className="rounded-xl border border-[#d7d7ce] py-2.5 text-xs font-bold"
                >
                  {ingredient.latestPrice
                    ? "Actualizar precio"
                    : "Agregar precio"}
                </button>
              </div>
              {ingredient.prices.length > 1 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-[#235b45]">
                    Ver historial ({ingredient.prices.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {ingredient.prices.map((price) => (
                      <p key={price.id} className="text-[11px] text-[#777]">
                        {formatDate(price.purchaseDate)} ·{" "}
                        {formatClp(price.grossAmount)} ·{" "}
                        {formatDecimalMoney(price.costPerBase)}/
                        {unitLabel(ingredient.baseUnit)}
                      </p>
                    ))}
                  </div>
                </details>
              )}
            </article>
          ))}
        {!visible.length && (
          <Empty text="Crea la primera materia prima para comenzar el costeo." />
        )}
      </div>
      {creating && <IngredientDialog onClose={() => setCreating(false)} />}
      {editing && (
        <IngredientDialog
          ingredient={editing}
          onClose={() => setEditing(null)}
        />
      )}
      {pricing && (
        <PriceDialog ingredient={pricing} onClose={() => setPricing(null)} />
      )}
    </section>
  );
}

function RecipesView({
  ingredients,
  recipes,
  costs,
}: {
  ingredients: Ingredient[];
  recipes: Recipe[];
  costs: Record<string, RecipeCost>;
}) {
  const [creating, setCreating] = useState<RecipeKind | null>(null);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [addingTo, setAddingTo] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [view, setView] = useCollectionView("recipes");
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
  const recipeMap = new Map(recipes.map((item) => [item.id, item]));
  const visible = recipes.filter(
    (recipe) =>
      (kindFilter === "all" || recipe.kind === kindFilter) &&
      recipe.name
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  async function removeRecipe(recipe: Recipe) {
    if (
      !confirm(
        `¿Eliminar ${recipe.name}? Se desvinculará de cualquier producto que la tenga asignada.`,
      )
    )
      return;
    try {
      await deleteRecipeAction(recipe.id);
      location.reload();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la receta",
      );
    }
  }
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Recetas y subrecetas</h2>
          <p className="mt-1 text-sm text-[#777]">
            Crea preparaciones base y luego combínalas en la receta final de
            cada producto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCreating("subrecipe")}
            className="flex items-center gap-2 rounded-xl border border-[#235b45] bg-white px-4 py-3 text-xs font-black text-[#235b45]"
          >
            <Plus size={15} /> Subreceta
          </button>
          <button
            onClick={() => setCreating("final")}
            className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-xs font-black text-white"
          >
            <Plus size={15} /> Receta final
          </button>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-[#d8e3d6] bg-[#eef4eb] p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#235b45] text-white">
            <Layers3 size={20} />
          </span>
          <div>
            <h3 className="font-black text-[#235b45]">
              Un producto compuesto usa una receta final
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#626b63]">
              Crea por separado <b>Masa de empanada</b> y <b>Pino</b>. Después
              crea <b>Empanada de pino</b> y agrega esas dos preparaciones como
              subrecetas. Esa receta final es la única que se vincula al
              producto de venta.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-[#235b45]">
              <span className="rounded-lg bg-white px-3 py-2">Masa</span>
              <span>+</span>
              <span className="rounded-lg bg-white px-3 py-2">Pino</span>
              <span>+</span>
              <span className="rounded-lg bg-white px-3 py-2">Envase</span>
              <span>→</span>
              <span className="rounded-lg bg-[#d8f070] px-3 py-2">
                Empanada de pino
              </span>
            </div>
          </div>
        </div>
      </div>
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar receta..."
      >
        <select
          value={kindFilter}
          onChange={(event) => setKindFilter(event.target.value)}
          className="input h-11 min-h-0 sm:w-48"
        >
          <option value="all">Todas</option>
          <option value="subrecipe">Subrecetas</option>
          <option value="final">Recetas finales</option>
        </select>
      </CollectionToolbar>
      <div
        className={
          view === "cards" ? "mt-4 space-y-3" : "card mt-4 overflow-x-auto"
        }
      >
        {view === "list" && visible.length > 0 && (
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="border-b border-[#deddd4] bg-[#f4f4ec] text-[11px] uppercase text-[#747970]">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Rendimiento</th>
                <th className="px-4 py-3">Componentes</th>
                <th className="px-4 py-3">Costo calculado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ecebe3]">
              {visible.map((recipe) => {
                const cost = costs[recipe.id];
                return (
                  <tr key={recipe.id} className="hover:bg-[#fafaf4]">
                    <td className="px-4 py-3 font-black">{recipe.name}</td>
                    <td className="px-4 py-3">
                      {recipe.kind === "final" ? "Receta final" : "Subreceta"}
                    </td>
                    <td className="px-4 py-3">
                      {recipe.yieldQuantity}{" "}
                      {recipe.yieldUnit === "kg" ? "kg" : "un."}
                    </td>
                    <td className="px-4 py-3">{recipe.items.length}</td>
                    <td className="money px-4 py-3 font-black text-[#235b45]">
                      {formatClp(Math.round(cost?.perYieldUnit || 0))} /{" "}
                      {recipe.yieldUnit === "kg" ? "kg" : "un."}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {cost?.complete ? "Completa" : "Incompleta"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 whitespace-nowrap text-xs font-bold">
                        <button
                          className="text-[#235b45]"
                          onClick={() => setAddingTo(recipe)}
                        >
                          Agregar componente
                        </button>
                        <button onClick={() => setEditing(recipe)}>
                          Editar
                        </button>
                        <button
                          className="text-[#a24628]"
                          onClick={() => removeRecipe(recipe)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {view === "cards" &&
          visible.map((recipe) => {
            const cost = costs[recipe.id];
            return (
              <article key={recipe.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">{recipe.name}</h3>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${recipe.kind === "final" ? "bg-[#d8f070] text-[#235b45]" : "bg-[#e8eee6] text-[#5e6b62]"}`}
                      >
                        {recipe.kind === "final" ? "Receta final" : "Subreceta"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#777]">
                      Rinde {recipe.yieldQuantity}{" "}
                      {recipe.yieldUnit === "kg" ? "kg" : "unidades"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-[#777]">
                      Costo calculado
                    </p>
                    <p className="money mt-1 text-xl font-black text-[#235b45]">
                      {formatClp(Math.round(cost?.perYieldUnit || 0))} /{" "}
                      {recipe.yieldUnit === "kg" ? "kg" : "unidad"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 divide-y divide-[#ecebe3] rounded-xl border border-[#e4e3da]">
                  {recipe.items.map((item) => {
                    const ingredient = item.ingredientId
                      ? ingredientMap.get(item.ingredientId)
                      : undefined;
                    const subrecipe = item.subrecipeId
                      ? recipeMap.get(item.subrecipeId)
                      : undefined;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <b>
                            {ingredient?.name ||
                              subrecipe?.name ||
                              "Componente eliminado"}
                          </b>
                          <p className="text-xs text-[#777]">
                            {item.quantity} {unitLabel(item.unit)}{" "}
                            {subrecipe ? "· subreceta" : ""}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm("¿Quitar este componente?")) {
                              await deleteRecipeItemAction(item.id);
                              location.reload();
                            }
                          }}
                          className="text-[#a24628]"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  {!recipe.items.length && (
                    <p className="p-4 text-center text-xs text-[#888]">
                      Receta todavía vacía
                    </p>
                  )}
                </div>
                {cost && !cost.complete && (
                  <p className="mt-3 rounded-xl bg-[#fff4d4] p-3 text-xs text-[#795f0d]">
                    {cost.missing.join(" · ")}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-4">
                  <button
                    onClick={() => setAddingTo(recipe)}
                    className="flex items-center gap-2 text-xs font-bold text-[#235b45]"
                  >
                    <Plus size={14} /> Agregar materia prima o subreceta
                  </button>
                  <button
                    onClick={() => setEditing(recipe)}
                    className="text-xs font-bold text-[#62675f]"
                  >
                    Editar receta
                  </button>
                  <button
                    onClick={async () => {
                      if (
                        !confirm(
                          `¿Eliminar ${recipe.name}? Se desvinculará de cualquier producto que la tenga asignada.`,
                        )
                      )
                        return;
                      await removeRecipe(recipe);
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#a24628]"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        {!visible.length && (
          <Empty text="Crea una receta base, como Masa de empanada o Pan corriente." />
        )}
      </div>
      {creating && (
        <RecipeDialog
          defaultKind={creating}
          onClose={() => setCreating(null)}
        />
      )}
      {editing && (
        <RecipeDialog recipe={editing} onClose={() => setEditing(null)} />
      )}
      {addingTo && (
        <RecipeItemDialog
          recipe={addingTo}
          ingredients={ingredients}
          recipes={recipes}
          onClose={() => setAddingTo(null)}
        />
      )}
    </section>
  );
}

function ProductsCostView({
  analyses,
  recipes,
}: {
  analyses: ProductCostAnalysis[];
  recipes: Recipe[];
}) {
  const [editing, setEditing] = useState<ProductCostAnalysis | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useCollectionView("product-costs");
  const visible = analyses.filter(
    (product) =>
      (status === "all" ||
        (status === "complete" ? product.complete : !product.complete)) &&
      product.name
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  return (
    <section className="mt-5">
      <SectionHeader
        title="Rentabilidad por producto"
        subtitle="Costo, margen y precio sugerido desde la receta vinculada."
      />
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto..."
      >
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="input h-11 min-h-0 sm:w-48"
        >
          <option value="all">Todos</option>
          <option value="complete">Costeo completo</option>
          <option value="incomplete">Costeo incompleto</option>
        </select>
      </CollectionToolbar>
      <div
        className={
          view === "cards"
            ? "mt-4 grid gap-4 lg:grid-cols-2"
            : "card mt-4 overflow-x-auto"
        }
      >
        {view === "list" && visible.length > 0 && (
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="border-b border-[#deddd4] bg-[#f4f4ec] text-[11px] uppercase text-[#747970]">
              <tr>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Receta final</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Costo variable</th>
                <th className="px-4 py-3">Contribución</th>
                <th className="px-4 py-3">Margen</th>
                <th className="px-4 py-3">Precio sugerido</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ecebe3]">
              {visible.map((product) => (
                <tr key={product.id} className="hover:bg-[#fafaf4]">
                  <td className="px-4 py-3 font-black">{product.name}</td>
                  <td className="px-4 py-3 text-[#70756d]">
                    {product.recipeName || "Sin receta"}
                  </td>
                  <td className="money px-4 py-3">
                    {formatClp(product.price)}
                  </td>
                  <td className="money px-4 py-3">
                    {product.complete
                      ? formatClp(Math.round(product.variableCost))
                      : "Incompleto"}
                  </td>
                  <td className="money px-4 py-3">
                    {product.complete
                      ? formatClp(Math.round(product.contribution))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-black">
                    {product.complete
                      ? `${product.contributionPercentage.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="money px-4 py-3 font-black text-[#235b45]">
                    {product.complete ? formatClp(product.suggestedPrice) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(product)}
                      className="whitespace-nowrap text-xs font-bold text-[#235b45]"
                    >
                      Configurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {view === "cards" &&
          visible.map((product) => (
            <article key={product.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-black">{product.name}</h3>
                  <p className="mt-1 text-xs text-[#777]">
                    {product.recipeName || "Sin receta"} · venta por{" "}
                    {product.saleUnit === "kg" ? "kg" : "unidad"}
                  </p>
                </div>
                <Status
                  complete={product.complete}
                  margin={product.contributionPercentage}
                />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini label="Precio" value={formatClp(product.price)} />
                <Mini
                  label="Costo variable"
                  value={
                    product.complete
                      ? formatClp(Math.round(product.variableCost))
                      : "Incompleto"
                  }
                />
                <Mini
                  label="Contribución"
                  value={
                    product.complete
                      ? formatClp(Math.round(product.contribution))
                      : "—"
                  }
                />
                <Mini
                  label="Margen"
                  value={
                    product.complete
                      ? `${product.contributionPercentage.toFixed(1)}%`
                      : "—"
                  }
                />
              </div>
              {product.complete && (
                <div className="mt-3 flex items-center justify-between rounded-xl bg-[#e8f0e6] p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#66766c]">
                      Precio sugerido
                    </p>
                    <p className="mt-1 text-xs text-[#66766c]">
                      Para margen objetivo de {product.targetMarginPercentage}%
                    </p>
                  </div>
                  <b className="money text-2xl text-[#235b45]">
                    {formatClp(product.suggestedPrice)}
                  </b>
                </div>
              )}
              {product.complete && (
                <details className="mt-3 rounded-xl border border-[#e2e1d8] p-3">
                  <summary className="cursor-pointer text-xs font-bold text-[#235b45]">
                    Ver explicación del cálculo
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <Breakdown
                      label="Ingreso neto sin IVA"
                      value={product.netRevenue}
                    />
                    <Breakdown
                      label="Costo físico"
                      value={product.physicalCost}
                    />
                    <Breakdown label="Merma" value={product.wasteCost} />
                    <Breakdown
                      label="Comisión esperada"
                      value={product.commissionCost}
                    />
                  </div>
                  <p className="mt-3 text-xs text-[#666]">
                    El precio sugerido cubre el costo variable y busca un margen
                    de {product.targetMarginPercentage}% sobre el ingreso neto,
                    redondeado al siguiente $100.
                  </p>
                </details>
              )}
              {!product.complete && (
                <p className="mt-3 rounded-xl bg-[#fff4d4] p-3 text-xs text-[#795f0d]">
                  {product.missing.join(" · ")}
                </p>
              )}
              <button
                onClick={() => setEditing(product)}
                className="mt-4 rounded-xl border border-[#d7d7ce] px-4 py-2.5 text-xs font-bold"
              >
                Configurar costeo
              </button>
            </article>
          ))}
        {!visible.length && (
          <Empty text="Crea productos en el catálogo para calcular su rentabilidad." />
        )}
      </div>
      {editing && (
        <ProductCostDialog
          product={editing}
          recipes={recipes}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function FixedCostsView({
  costs,
  monthly,
  settings,
}: {
  costs: FixedCost[];
  monthly: number;
  settings: CostSettings;
}) {
  const [creating, setCreating] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Costos fijos</h2>
          <p className="mt-1 text-sm text-[#777]">
            Prorrateo mensual para punto de equilibrio.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfiguring(true)}
            className="flex items-center gap-2 rounded-xl border border-[#d7d7ce] bg-white px-4 py-3 text-xs font-bold"
          >
            <Settings size={15} /> Parámetros
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-xs font-bold text-white"
          >
            <Plus size={15} /> Costo fijo
          </button>
        </div>
      </div>
      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase text-[#777]">
            Total mensual equivalente
          </p>
          <p className="mt-1 text-xs text-[#777]">
            {settings.operatingDaysMonth} días operativos
          </p>
        </div>
        <b className="money text-3xl">{formatClp(Math.round(monthly))}</b>
      </div>
      <div className="mt-3 space-y-2">
        {costs.map((cost) => (
          <div
            key={cost.id}
            className={`card flex items-center justify-between gap-3 p-4 ${!cost.active ? "opacity-50" : ""}`}
          >
            <div>
              <b>{cost.name}</b>
              <p className="mt-1 text-xs text-[#777]">
                {cost.category} · {periodLabel(cost.period)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <b>{formatClp(cost.amount)}</b>
              <button
                onClick={async () => {
                  await toggleFixedCostAction(cost.id, !cost.active);
                  location.reload();
                }}
                className="text-xs font-bold text-[#235b45]"
              >
                {cost.active ? "Pausar" : "Activar"}
              </button>
            </div>
          </div>
        ))}
        {!costs.length && (
          <Empty text="Registra arriendo, sueldos, servicios y otros costos fijos." />
        )}
      </div>
      {creating && <FixedCostDialog onClose={() => setCreating(false)} />}
      {configuring && (
        <SettingsDialog
          settings={settings}
          onClose={() => setConfiguring(false)}
        />
      )}
    </section>
  );
}

function ProjectionsView({
  analyses,
  fixedCosts,
  settings,
  scenarios,
}: {
  analyses: ProductCostAnalysis[];
  fixedCosts: number;
  settings: CostSettings;
  scenarios: Scenario[];
}) {
  const complete = analyses.filter(
    (item) => item.complete && item.contribution > 0,
  );
  const first = scenarios[0];
  const [name, setName] = useState(first?.name || "Escenario esperado");
  const [days, setDays] = useState(
    first?.operatingDays || settings.operatingDaysMonth,
  );
  const [target, setTarget] = useState(
    first?.targetProfit || settings.targetMonthlyProfit,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    first?.quantities || {},
  );
  const result = useMemo(() => {
    let grossSales = 0;
    let contribution = 0;
    for (const product of complete) {
      const quantity = quantities[product.id] || 0;
      grossSales += product.price * quantity * days;
      contribution += product.contribution * quantity * days;
    }
    return {
      grossSales,
      contribution,
      profit: contribution - fixedCosts,
      targetContribution: fixedCosts + target,
    };
  }, [complete, quantities, days, fixedCosts, target]);
  function adjustMixToGoal() {
    const currentDailyContribution = complete.reduce(
      (sum, product) =>
        sum + product.contribution * (quantities[product.id] || 0),
      0,
    );
    if (currentDailyContribution <= 0) {
      alert(
        "Ingresa primero una mezcla diaria base, por ejemplo 30 empanadas y 30 kg de pan.",
      );
      return;
    }
    const requiredDailyContribution = (fixedCosts + target) / days;
    const factor = requiredDailyContribution / currentDailyContribution;
    setQuantities((current) =>
      Object.fromEntries(
        complete.map((product) => {
          const currentQuantity = current[product.id] || 0;
          if (!currentQuantity) return [product.id, 0];
          const scaled = currentQuantity * factor;
          return [
            product.id,
            product.saleUnit === "kg"
              ? Math.ceil(scaled * 10) / 10
              : Math.ceil(scaled),
          ];
        }),
      ),
    );
  }
  return (
    <section className="mt-5">
      <SectionHeader
        title="Proyección de mezcla"
        subtitle="Combina empanadas, kilos de pan y bollería según una venta diaria viable."
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="card p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Nombre">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Días abiertos">
              <input
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                type="number"
                min="1"
                max="31"
                className="input"
              />
            </Field>
            <Field label="Utilidad objetivo">
              <input
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                type="number"
                className="input"
              />
            </Field>
          </div>
          <h3 className="mt-6 font-black">Venta diaria esperada</h3>
          <div className="mt-3 divide-y divide-[#ecebe3]">
            {complete.map((product) => (
              <label key={product.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <b className="text-sm">{product.name}</b>
                  <p className="text-xs text-[#777]">
                    Aporta {formatClp(Math.round(product.contribution))} por{" "}
                    {product.saleUnit === "kg" ? "kg" : "unidad"}
                  </p>
                </div>
                <input
                  type="number"
                  min="0"
                  step={product.saleUnit === "kg" ? "0.1" : "1"}
                  value={quantities[product.id] || ""}
                  onChange={(e) =>
                    setQuantities((current) => ({
                      ...current,
                      [product.id]: Number(e.target.value),
                    }))
                  }
                  className="input w-28 text-right"
                  placeholder="0"
                />
                <span className="w-8 text-xs text-[#777]">
                  {product.saleUnit === "kg" ? "kg" : "un."}
                </span>
              </label>
            ))}
            {!complete.length && (
              <p className="py-8 text-center text-sm text-[#888]">
                Completa al menos un producto para proyectar.
              </p>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={adjustMixToGoal}
              className="rounded-xl border border-[#235b45] px-5 py-3 text-xs font-bold text-[#235b45]"
            >
              Ajustar mezcla al objetivo
            </button>
            <button
              onClick={async () => {
                await saveScenarioAction({
                  id: first?.id,
                  name,
                  operatingDays: days,
                  targetProfit: target,
                  quantities,
                });
                location.reload();
              }}
              className="rounded-xl bg-[#235b45] px-5 py-3 text-xs font-bold text-white"
            >
              Guardar escenario
            </button>
          </div>
          <p className="mt-3 text-[11px] text-[#777]">
            “Ajustar mezcla” conserva la proporción ingresada y la escala hasta
            cubrir costos fijos y utilidad objetivo.
          </p>
        </div>
        <aside className="space-y-3">
          <Result label="Ventas brutas mensuales" value={result.grossSales} />
          <Result label="Margen de contribución" value={result.contribution} />
          <Result label="Costos fijos" value={fixedCosts} />
          <div
            className={`card p-5 ${result.profit >= target ? "bg-[#e8f0e6]" : "bg-[#fff4d4]"}`}
          >
            <p className="text-xs font-bold uppercase text-[#777]">
              Resultado operacional
            </p>
            <p className="money mt-2 text-3xl font-black">
              {formatClp(Math.round(result.profit))}
            </p>
            <p className="mt-2 text-xs text-[#666]">
              {result.profit >= target
                ? `El escenario supera la utilidad objetivo de ${formatClp(target)}.`
                : `Faltan ${formatClp(Math.max(0, Math.round(result.targetContribution - result.contribution)))} de contribución mensual para el objetivo.`}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function IngredientDialog({
  ingredient,
  onClose,
}: {
  ingredient?: Ingredient;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={ingredient ? "Editar materia prima" : "Nueva materia prima"}
      onClose={onClose}
    >
      <AsyncForm action={saveIngredientAction}>
        {ingredient && <input type="hidden" name="id" value={ingredient.id} />}
        <Field label="Nombre *">
          <input
            name="name"
            required
            defaultValue={ingredient?.name}
            className="input"
            placeholder="Ej: Harina"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <select
              name="category"
              className="input"
              defaultValue={ingredient?.category || "Harinas"}
            >
              <option>Harinas</option>
              <option>Carnes</option>
              <option>Lácteos</option>
              <option>Verduras</option>
              <option>Grasas</option>
              <option>Condimentos</option>
              <option>Empaques</option>
              <option>Otros</option>
            </select>
          </Field>
          <Field label="Unidad base">
            <select
              name="baseUnit"
              className="input"
              defaultValue={ingredient?.baseUnit || "g"}
            >
              <option value="g">Gramos</option>
              <option value="ml">Mililitros</option>
              <option value="unit">Unidades</option>
            </select>
          </Field>
        </div>
        <Field label="Notas">
          <textarea
            name="notes"
            defaultValue={ingredient?.notes}
            className="input min-h-20 py-3"
          />
        </Field>
        <Submit>Guardar materia prima</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function PriceDialog({
  ingredient,
  onClose,
}: {
  ingredient: Ingredient;
  onClose: () => void;
}) {
  const units =
    ingredient.baseUnit === "g"
      ? ["kg", "g"]
      : ingredient.baseUnit === "ml"
        ? ["l", "ml"]
        : ["unit"];
  return (
    <Dialog title={`Precio de ${ingredient.name}`} onClose={onClose}>
      <AsyncForm action={addIngredientPriceAction}>
        <input type="hidden" name="ingredientId" value={ingredient.id} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad comprada">
            <input
              name="purchaseQuantity"
              required
              type="number"
              step="0.001"
              className="input"
              placeholder="25"
            />
          </Field>
          <Field label="Unidad">
            <select name="purchaseUnit" className="input">
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Precio total pagado">
          <input
            name="grossAmount"
            required
            type="number"
            className="input"
            placeholder="35680"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tratamiento IVA">
            <select name="taxMode" className="input">
              <option value="included">IVA incluido</option>
              <option value="exempt">Exento / sin crédito</option>
            </select>
          </Field>
          <Field label="Tasa IVA %">
            <input
              name="taxRate"
              type="number"
              step="0.001"
              defaultValue="19"
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input
              name="purchaseDate"
              type="date"
              required
              defaultValue={today()}
              className="input"
            />
          </Field>
          <Field label="Proveedor opcional">
            <input name="supplier" className="input" />
          </Field>
        </div>
        <Submit>Guardar precio</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function RecipeDialog({
  recipe,
  defaultKind = "subrecipe",
  onClose,
}: {
  recipe?: Recipe;
  defaultKind?: RecipeKind;
  onClose: () => void;
}) {
  const kind = recipe?.kind || defaultKind;
  return (
    <Dialog
      title={
        recipe
          ? "Editar receta"
          : kind === "final"
            ? "Nueva receta final"
            : "Nueva subreceta"
      }
      onClose={onClose}
    >
      <AsyncForm action={saveRecipeAction}>
        {recipe && <input type="hidden" name="id" value={recipe.id} />}
        <Field label="Tipo *">
          <select name="recipeKind" defaultValue={kind} className="input">
            <option value="subrecipe">Subreceta o preparación base</option>
            <option value="final">Receta final de un producto</option>
          </select>
        </Field>
        <Field label="Nombre *">
          <input
            name="name"
            required
            defaultValue={recipe?.name}
            className="input"
            placeholder="Ej: Masa de empanada"
          />
        </Field>
        <p className="-mt-2 text-xs leading-5 text-[#777]">
          {kind === "final"
            ? "Esta receta reunirá las subrecetas y materias primas del producto que vendes."
            : "Una subreceta es una preparación reutilizable, como masa, pino o relleno."}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rendimiento">
            <input
              name="yieldQuantity"
              required
              defaultValue={recipe?.yieldQuantity}
              type="number"
              step="0.001"
              className="input"
              placeholder="15"
            />
          </Field>
          <Field label="Unidad de rendimiento">
            <select
              name="yieldUnit"
              className="input"
              defaultValue={recipe?.yieldUnit || "unit"}
            >
              <option value="unit">Unidades o porciones</option>
              <option value="kg">Kilogramos</option>
            </select>
          </Field>
        </div>
        <Field label="Descripción">
          <textarea
            name="description"
            defaultValue={recipe?.description}
            className="input min-h-20 py-3"
          />
        </Field>
        <Submit>{recipe ? "Guardar cambios" : "Crear"}</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function RecipeItemDialog({
  recipe,
  ingredients,
  recipes,
  onClose,
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onClose: () => void;
}) {
  const [key, setKey] = useState(
    ingredients[0]
      ? `ingredient:${ingredients[0].id}`
      : recipes.find(
            (item) => item.id !== recipe.id && item.kind === "subrecipe",
          )
        ? `recipe:${recipes.find((item) => item.id !== recipe.id && item.kind === "subrecipe")!.id}`
        : "",
  );
  const [kind, id] = key.split(":");
  const ingredient = ingredients.find((item) => item.id === id);
  const subrecipe = recipes.find((item) => item.id === id);
  const allowedUnits =
    ingredient?.baseUnit === "g"
      ? ["g", "kg"]
      : ingredient?.baseUnit === "ml"
        ? ["ml", "l"]
        : ingredient
          ? ["unit"]
          : subrecipe
            ? [subrecipe.yieldUnit]
            : ["unit"];
  return (
    <Dialog title={`Agregar a ${recipe.name}`} onClose={onClose}>
      <AsyncForm action={addRecipeItemAction}>
        <input type="hidden" name="recipeId" value={recipe.id} />
        <input type="hidden" name="componentType" value={kind} />
        <input type="hidden" name="componentId" value={id} />
        <Field label="Ingrediente o subreceta">
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="input"
          >
            <optgroup label="Materias primas">
              {ingredients.map((item) => (
                <option key={item.id} value={`ingredient:${item.id}`}>
                  {item.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Subrecetas">
              {recipes
                .filter(
                  (item) => item.id !== recipe.id && item.kind === "subrecipe",
                )
                .map((item) => (
                  <option key={item.id} value={`recipe:${item.id}`}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </Field>
        <p className="-mt-2 rounded-xl bg-[#f3f4ed] p-3 text-xs leading-5 text-[#6d736c]">
          <b>Materia prima:</b> harina, queso, mantequilla o envase.{" "}
          <b>Subreceta:</b> una preparación creada previamente, como masa, pino
          o relleno de chocolate.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad">
            <input
              name="quantity"
              required
              type="number"
              step="0.001"
              className="input"
            />
          </Field>
          <Field label="Unidad">
            <select key={key} name="unit" className="input">
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Submit>Agregar componente</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function ProductCostDialog({
  product,
  recipes,
  onClose,
}: {
  product: ProductCostAnalysis;
  recipes: Recipe[];
  onClose: () => void;
}) {
  return (
    <Dialog title={`Costeo de ${product.name}`} onClose={onClose}>
      <AsyncForm action={configureProductCostAction}>
        <input type="hidden" name="productId" value={product.id} />
        <Field label="Receta final del producto">
          <select
            name="recipeId"
            defaultValue={product.recipeId || ""}
            className="input"
          >
            <option value="">Sin receta</option>
            {recipes
              .filter(
                (recipe) =>
                  recipe.kind === "final" || recipe.id === product.recipeId,
              )
              .map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name}
                  {recipe.kind !== "final"
                    ? " · actualmente es subreceta"
                    : ""}{" "}
                  · rinde en {recipe.yieldUnit === "kg" ? "kg" : "unidades"}
                </option>
              ))}
          </select>
        </Field>
        <p className="-mt-2 text-xs leading-5 text-[#777]">
          Si el producto tiene masa y relleno, selecciona aquí la receta final
          que contiene ambas subrecetas; no selecciones solamente la masa.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Merma comercial %">
            <input
              name="wastePercentage"
              type="number"
              step="0.1"
              defaultValue={product.wastePercentage}
              className="input"
            />
          </Field>
          <Field label="Margen objetivo %">
            <input
              name="targetMarginPercentage"
              type="number"
              step="0.1"
              defaultValue={product.targetMarginPercentage}
              className="input"
            />
          </Field>
        </div>
        <Submit>Guardar configuración</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function FixedCostDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="Nuevo costo fijo" onClose={onClose}>
      <AsyncForm action={saveFixedCostAction}>
        <Field label="Nombre">
          <input
            name="name"
            required
            className="input"
            placeholder="Ej: Arriendo"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <input name="amount" required type="number" className="input" />
          </Field>
          <Field label="Periodicidad">
            <select name="period" className="input">
              <option value="monthly">Mensual</option>
              <option value="daily">Diario</option>
              <option value="quarterly">Trimestral</option>
              <option value="semiannual">Semestral</option>
              <option value="annual">Anual</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría">
            <select name="category" className="input">
              <option>Local</option>
              <option>Personal</option>
              <option>Servicios</option>
              <option>Financiamiento</option>
              <option>Marketing</option>
              <option>Mantención</option>
              <option>Otros</option>
            </select>
          </Field>
          <Field label="Desde">
            <input
              name="startsOn"
              type="date"
              required
              defaultValue={today()}
              className="input"
            />
          </Field>
        </div>
        <Field label="Hasta (opcional)">
          <input name="endsOn" type="date" className="input" />
        </Field>
        <Submit>Guardar costo fijo</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function SettingsDialog({
  settings,
  onClose,
}: {
  settings: CostSettings;
  onClose: () => void;
}) {
  return (
    <Dialog title="Parámetros del modelo" onClose={onClose}>
      <AsyncForm action={saveCostSettingsAction}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="IVA %">
            <input
              name="vatRate"
              type="number"
              step="0.001"
              defaultValue={settings.vatRate}
              className="input"
            />
          </Field>
          <Field label="Días abiertos al mes">
            <input
              name="operatingDaysMonth"
              type="number"
              defaultValue={settings.operatingDaysMonth}
              className="input"
            />
          </Field>
        </div>
        <p className="pt-2 text-xs font-black">
          Mezcla esperada de pagos (debe sumar 100%)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Efectivo %">
            <input
              name="expectedCashPercentage"
              type="number"
              step="0.1"
              defaultValue={settings.expectedCashPercentage}
              className="input"
            />
          </Field>
          <Field label="Débito %">
            <input
              name="expectedDebitPercentage"
              type="number"
              step="0.1"
              defaultValue={settings.expectedDebitPercentage}
              className="input"
            />
          </Field>
          <Field label="Crédito %">
            <input
              name="expectedCreditPercentage"
              type="number"
              step="0.1"
              defaultValue={settings.expectedCreditPercentage}
              className="input"
            />
          </Field>
          <Field label="Transferencia %">
            <input
              name="expectedTransferPercentage"
              type="number"
              step="0.1"
              defaultValue={settings.expectedTransferPercentage}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comisión débito %">
            <input
              name="debitFeePercentage"
              type="number"
              step="0.0001"
              defaultValue={settings.debitFeePercentage}
              className="input"
            />
          </Field>
          <Field label="Comisión crédito %">
            <input
              name="creditFeePercentage"
              type="number"
              step="0.0001"
              defaultValue={settings.creditFeePercentage}
              className="input"
            />
          </Field>
        </div>
        <Field label="Utilidad mensual objetivo">
          <input
            name="targetMonthlyProfit"
            type="number"
            defaultValue={settings.targetMonthlyProfit}
            className="input"
          />
        </Field>
        <Submit>Guardar parámetros</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between">
          <h2 className="text-2xl font-black">{title}</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function AsyncForm({
  action,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      action={async (form) => {
        setBusy(true);
        try {
          await action(form);
          location.reload();
        } catch (error) {
          alert(error instanceof Error ? error.message : "No se pudo guardar");
          setBusy(false);
        }
      }}
      className="mt-6 space-y-4"
    >
      {children}
      <input type="hidden" name="_busy" value={busy ? "1" : "0"} />
    </form>
  );
}
function Submit({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-12 w-full rounded-xl bg-[#235b45] font-bold text-white">
      {children}
    </button>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-bold">
      {label}
      {children}
    </label>
  );
}
function SectionHeader({
  title,
  subtitle,
  action,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-1 text-sm text-[#777]">{subtitle}</p>
      </div>
      {action && (
        <button
          onClick={action}
          className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-xs font-bold text-white"
        >
          <Plus size={15} /> {actionLabel}
        </button>
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="card col-span-full p-10 text-center text-sm text-[#888]">
      {text}
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f1f1e9] p-3">
      <p className="text-[9px] font-bold uppercase text-[#777]">{label}</p>
      <p className="money mt-1 font-black">{value}</p>
    </div>
  );
}
function Breakdown({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[#f3f3ec] p-2">
      <span className="text-[#666]">{label}</span>
      <b>{formatClp(Math.round(value))}</b>
    </div>
  );
}
function Result({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase text-[#777]">{label}</p>
      <p className="money mt-2 text-2xl font-black">
        {formatClp(Math.round(value))}
      </p>
    </div>
  );
}
function Status({ complete, margin }: { complete: boolean; margin: number }) {
  if (!complete)
    return (
      <span className="rounded-full bg-[#fff1c7] px-3 py-1 text-[10px] font-bold text-[#795f0d]">
        Incompleto
      </span>
    );
  return (
    <span
      className={`rounded-full px-3 py-1 text-[10px] font-bold ${margin >= 50 ? "bg-[#e5f0e7] text-[#235b45]" : margin >= 30 ? "bg-[#fff1c7] text-[#795f0d]" : "bg-[#f7dfd7] text-[#9a3f22]"}`}
    >
      {margin >= 50 ? "Saludable" : margin >= 30 ? "Ajustado" : "Bajo"}
    </span>
  );
}
function formatDecimalMoney(value: number) {
  return `$${value.toLocaleString("es-CL", { minimumFractionDigits: value < 10 ? 2 : 0, maximumFractionDigits: 4 })}`;
}
function unitLabel(unit: string) {
  return (
    (
      { g: "g", kg: "kg", ml: "ml", l: "l", unit: "unidad" } as Record<
        string,
        string
      >
    )[unit] || unit
  );
}
function periodLabel(period: string) {
  return (
    (
      {
        daily: "Diario",
        monthly: "Mensual",
        quarterly: "Trimestral",
        semiannual: "Semestral",
        annual: "Anual",
      } as Record<string, string>
    )[period] || period
  );
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL");
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
  }).format(new Date());
}
