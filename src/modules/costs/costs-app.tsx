"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FlaskConical,
  Layers3,
  PackageCheck,
  Plus,
  Settings,
  Eye,
  Pencil,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import { operationalWasteReserve } from "./calculations";
import {
  CollectionToolbar,
  useCollectionView,
} from "@/shared/ui/collection-controls";
import {
  addIngredientPriceAction,
  addRecipeItemAction,
  configureProductCostAction,
  createCostedProductAction,
  deleteIngredientAction,
  deleteRecipeAction,
  deleteRecipeItemAction,
  saveCostSettingsAction,
  saveFixedCostAction,
  saveIngredientAction,
  saveRecipeAction,
  saveScenarioAction,
  toggleFixedCostAction,
  updateRecipeItemAction,
} from "./actions";
import type {
  CostSettings,
  FixedCost,
  Ingredient,
  OperatingSchedule,
  ProductCostAnalysis,
  Recipe,
  RecipeKind,
  RecipeCost,
  Scenario,
} from "./types";
import type { BusinessPulse } from "@/modules/pos/types";
import type { Product as CatalogProduct } from "@/modules/pos/types";
import { ProductsClient } from "@/modules/pos/products-client";

export type CostTab =
  | "business"
  | "own"
  | "resale"
  | "supplies"
  | "ingredients"
  | "recipes"
  | "products";
type CostArea = "business" | "own" | "resale" | "supplies" | "products";

export function CostsApp({
  ingredients,
  recipes,
  recipeCosts,
  analyses,
  fixedCosts,
  monthlyFixedCosts,
  settings,
  schedule,
  catalogProducts,
  archivedProducts,
  initialProductView = "costing",
  initialTab = "own",
}: {
  ingredients: Ingredient[];
  recipes: Recipe[];
  recipeCosts: Record<string, RecipeCost>;
  analyses: ProductCostAnalysis[];
  fixedCosts: FixedCost[];
  monthlyFixedCosts: number;
  settings: CostSettings;
  schedule: OperatingSchedule;
  catalogProducts: CatalogProduct[];
  archivedProducts: CatalogProduct[];
  initialProductView?: "costing" | "catalog";
  initialTab?: CostTab;
}) {
  const legacyOwnTab = ["ingredients", "recipes"].includes(initialTab)
    ? initialTab
    : "ingredients";
  const [tab, setTab] = useState<CostArea>(
    ["business", "resale", "supplies", "products"].includes(initialTab)
      ? (initialTab as CostArea)
      : "own",
  );
  const [ownSection, setOwnSection] = useState<"ingredients" | "recipes">(
    legacyOwnTab as "ingredients" | "recipes",
  );
  const [productView, setProductView] = useState(initialProductView);
  const tabs: { id: CostArea; label: string; icon: React.ReactNode }[] = [
    {
      id: "business",
      label: "Costos fijos y mixtos",
      icon: <Building2 size={16} />,
    },
    {
      id: "own",
      label: "Elaboración y armado",
      icon: <Beaker size={16} />,
    },
    {
      id: "resale",
      label: "Compras para reventa",
      icon: <CircleDollarSign size={16} />,
    },
    {
      id: "supplies",
      label: "Otros insumos",
      icon: <PackageCheck size={16} />,
    },
    {
      id: "products",
      label: "Productos para vender",
      icon: <CircleDollarSign size={16} />,
    },
  ];
  return (
    <main className="mx-auto max-w-7xl p-4 pb-24 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Motor económico
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Costos, márgenes y precios
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#747970]">
            Ordena los gastos de tu negocio y calcula cuánto aporta cada
            producto para cubrirlos y generar utilidad.
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
      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {(
          [
            ["Estructura", ["business"]],
            ["Fuentes del costo", ["own", "resale", "supplies"]],
            ["Resultado", ["products"]],
          ] as const
        ).map(([group, ids]) => (
          <div
            key={group}
            className="shrink-0 rounded-2xl border border-[#e1e0d7] bg-[#f8f7f0] p-2"
          >
            <p className="mb-1 px-2 text-[9px] font-black uppercase tracking-[.13em] text-[#7a8078]">
              {group}
            </p>
            <div className="flex gap-2">
              {tabs
                .filter((item) => (ids as readonly string[]).includes(item.id))
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setTab(item.id);
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", item.id);
                      window.history.replaceState(null, "", url);
                    }}
                    className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${
                      tab === item.id
                        ? "bg-[#235b45] text-white"
                        : item.id === "products"
                          ? "border-2 border-[#235b45] bg-[#eef4eb] text-[#235b45]"
                          : item.id === "business"
                            ? "border-2 border-[#9ba99d] bg-[#fffef9] text-[#445249]"
                            : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      {tab === "business" && (
        <FixedCostsView
          costs={fixedCosts}
          monthly={monthlyFixedCosts}
          settings={settings}
          schedule={schedule}
        />
      )}
      {tab === "own" && (
        <section className="mt-5">
          <div className="rounded-2xl border border-[#cfdcc9] bg-[#eef4eb] p-5">
            <h2 className="font-black text-[#235b45]">Elaboraciones propias</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#626b63]">
              Registra materias primas y conviértelas en recetas o subrecetas.
              El producto vendible se crea posteriormente en Productos para
              vender.
            </p>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {(
              [
                ["ingredients", "Materias primas"],
                ["recipes", "Recetas"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setOwnSection(id)}
                className={`shrink-0 rounded-xl px-4 py-3 text-xs font-black ${ownSection === id ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {ownSection === "ingredients" && (
            <IngredientsView ingredients={ingredients} mode="raw" />
          )}
          {ownSection === "recipes" && (
            <RecipesView
              ingredients={ingredients.filter(
                (ingredient) => ingredient.sourceType !== "resale",
              )}
              recipes={recipes}
              costs={recipeCosts}
            />
          )}
        </section>
      )}
      {tab === "resale" && (
        <section className="mt-5">
          <div className="rounded-2xl border border-[#dfd7b8] bg-[#f7f3e4] p-5">
            <h2 className="font-black text-[#5d542f]">Compras para reventa</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6c6754]">
              Registra lo que compras listo para vender: formato, precio,
              proveedor y unidades obtenidas. Aquí todavía no defines el precio
              de venta ni el producto de Caja.
            </p>
          </div>
          <IngredientsView ingredients={ingredients} mode="resale" />
        </section>
      )}
      {tab === "supplies" && (
        <IngredientsView ingredients={ingredients} mode="other" />
      )}
      {tab === "products" && (
        <section className="mt-5">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(
              [
                ["costing", "Márgenes y precios"],
                ["catalog", "Catálogo y organización de Caja"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setProductView(id);
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "products");
                  url.searchParams.set("view", id);
                  window.history.replaceState(null, "", url);
                }}
                className={`shrink-0 rounded-xl px-4 py-3 text-xs font-black ${productView === id ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {productView === "costing" ? (
            <ProductsCostView
              analyses={analyses}
              recipes={recipes}
              ingredients={ingredients}
              recipeCosts={recipeCosts}
              settings={settings}
              showCreate
            />
          ) : (
            <ProductsClient
              products={catalogProducts}
              archivedProducts={archivedProducts}
              embedded
              hideIndividualCreate
            />
          )}
        </section>
      )}
    </main>
  );
}

export function CostingRoadmap({
  fixedCosts,
  ingredients,
  recipes,
  analyses,
  onOpen,
}: {
  fixedCosts: FixedCost[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  analyses: ProductCostAnalysis[];
  onOpen?: (tab: CostTab) => void;
}) {
  const completeProducts = analyses.filter((item) => item.complete).length;
  const steps: {
    number: number;
    title: string;
    detail: string;
    status: string;
    tab: CostTab;
    icon: React.ReactNode;
  }[] = [
    {
      number: 1,
      title: "Define costos fijos y servicios mixtos",
      detail:
        "Registra arriendo, remuneraciones y otros costos fijos. Agrega luz, agua y gas como servicios mixtos usando su promedio mensual.",
      status: fixedCosts.length
        ? `${fixedCosts.length} costos registrados`
        : "Pendiente",
      tab: "business",
      icon: <Building2 size={22} />,
    },
    {
      number: 2,
      title: "Registra todo lo que compras",
      detail:
        "Incluye harina, envases y también componentes listos como croissants, jamón o queso. Indica formato, precio y rendimiento aprovechable.",
      status: ingredients.length
        ? `${ingredients.length} insumos registrados`
        : "Pendiente",
      tab: "ingredients",
      icon: <Beaker size={22} />,
    },
    {
      number: 3,
      title: "Crea preparaciones o productos armados",
      detail:
        "Combina insumos comprados y preparaciones propias. Un croissant comprado con jamón y queso se arma aquí; un pan hecho desde cero también.",
      status: recipes.length
        ? `${recipes.length} preparaciones creadas`
        : "Según tu negocio",
      tab: "recipes",
      icon: <FlaskConical size={22} />,
    },
    {
      number: 4,
      title: "Compara costo, margen y precio",
      detail:
        "Separa reventa directa de productos elaborados o armados y revisa costo variable, contribución y precio sugerido.",
      status: completeProducts
        ? `${completeProducts} productos costeados`
        : "Pendiente",
      tab: "products",
      icon: <PackageCheck size={22} />,
    },
  ];
  return (
    <section className="mt-6">
      <div className="overflow-hidden rounded-[28px] bg-[#1f6048] p-6 text-white md:p-8">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#d8f070]">
          Tu ruta recomendada
        </p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black md:text-4xl">
          Primero entiende tu negocio. Después costea cada producto.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/75">
          El margen de contribución de un producto indica cuánto deja para pagar
          los costos fijos. La utilidad real aparece cuando la contribución de
          todas tus ventas supera esos gastos.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {steps.map((item) => (
          <button
            key={item.number}
            type="button"
            onClick={() => {
              if (onOpen) onOpen(item.tab);
              else window.location.assign(`/costos?tab=${item.tab}`);
            }}
            className="card group p-5 text-left transition hover:-translate-y-0.5 hover:border-[#9cb89f]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e8f0e6] text-[#235b45]">
                {item.icon}
              </div>
              <span className="rounded-full bg-[#f1f1e8] px-3 py-1 text-[10px] font-black uppercase text-[#687168]">
                {item.status}
              </span>
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-[.14em] text-[#7a8078]">
              Paso {item.number}
            </p>
            <h3 className="mt-1 text-lg font-black">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#747970]">
              {item.detail}
            </p>
            <span className="mt-4 flex items-center gap-2 text-xs font-black text-[#235b45]">
              Abrir <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function IngredientsView({
  ingredients,
  mode = "raw",
}: {
  ingredients: Ingredient[];
  mode?: "raw" | "other" | "resale";
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [pricing, setPricing] = useState<Ingredient | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [view, setView] = useCollectionView("ingredients");
  const scopedIngredients = ingredients.filter((ingredient) =>
    mode === "other"
      ? ingredient.sourceType === "supply"
      : mode === "resale"
        ? ingredient.sourceType === "resale"
        : ingredient.sourceType === "raw",
  );
  const categories = [
    "Todas",
    ...new Set(scopedIngredients.map((ingredient) => ingredient.category)),
  ];
  const visible = scopedIngredients.filter(
    (ingredient) =>
      (category === "Todas" || ingredient.category === category) &&
      `${ingredient.name} ${ingredient.category}`
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  async function removeIngredient(ingredient: Ingredient) {
    const noun =
      mode === "resale"
        ? "la compra para reventa"
        : mode === "other"
          ? "el insumo"
          : "la materia prima";
    if (
      !confirm(
        `¿Eliminar ${ingredient.name}? Esta acción quitará ${noun} del listado.`,
      )
    )
      return;
    try {
      await deleteIngredientAction(ingredient.id);
      location.reload();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : `No se pudo eliminar ${noun}`,
      );
    }
  }
  return (
    <section className="mt-5">
      <SectionHeader
        title={
          mode === "resale"
            ? "Artículos comprados para revender"
            : mode === "other"
              ? "Envases y otros insumos de venta"
              : "Materias primas"
        }
        subtitle={
          mode === "resale"
            ? "Registra el formato comprado y su precio. Luego podrás asignarlo a un producto para vender."
            : mode === "other"
              ? "Registra vasos, tapas, bolsas, servilletas u otros elementos consumidos al vender un producto."
              : "Registra formatos y precios de los ingredientes usados para elaborar o armar productos."
        }
        action={() => setCreating(true)}
        actionLabel={
          mode === "resale"
            ? "Registrar compra para reventa"
            : mode === "other"
              ? "Otro insumo"
              : "Materia prima"
        }
      />
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder={
          mode === "other"
            ? "Buscar envase u otro insumo..."
            : mode === "resale"
              ? "Buscar compra para reventa..."
              : "Buscar materia prima..."
        }
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
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="border-b border-[#deddd4] bg-[#f4f4ec] text-[11px] uppercase text-[#747970]">
              <tr>
                <th className="px-4 py-3">
                  {mode === "resale"
                    ? "Compra registrada"
                    : mode === "other"
                      ? "Insumo"
                      : "Materia prima"}
                </th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">
                  {mode === "resale" ? "Unidad de venta" : "Unidad base"}
                </th>
                <th className="px-4 py-3">Costo vigente</th>
                <th className="px-4 py-3">Precio pagado</th>
                <th className="px-4 py-3">
                  {mode === "resale"
                    ? "Unidades vendibles obtenidas"
                    : "Formato comprado"}
                </th>
                <th className="px-4 py-3">
                  {mode === "resale" ? "Interpretación" : "Rendimiento"}
                </th>
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
                  <td className="money px-4 py-3 font-black">
                    {ingredient.latestPrice
                      ? formatClp(ingredient.latestPrice.grossAmount)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#50554e]">
                    {ingredient.latestPrice
                      ? `${ingredient.latestPrice.purchaseQuantity} ${unitLabel(ingredient.latestPrice.purchaseUnit)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {mode === "resale" ? (
                      <span className="text-xs text-[#70756d]">
                        Costo por cada unidad que venderás
                      </span>
                    ) : (
                      <>
                        <b>{ingredient.usableYieldPercentage || 100}%</b>
                        <span
                          className={`ml-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase ${ingredient.yieldStatus === "estimated" ? "bg-[#fff0c2] text-[#775d12]" : "bg-[#e5f0e5] text-[#235b45]"}`}
                        >
                          {ingredient.yieldStatus === "estimated"
                            ? "Estimado"
                            : "Confirmado"}
                        </span>
                      </>
                    )}
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
                      <button
                        onClick={() => removeIngredient(ingredient)}
                        className="text-[#a24628]"
                      >
                        Eliminar
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
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#d9dbd1] pt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#777]">
                        Precio pagado
                      </p>
                      <p className="money mt-1 font-black">
                        {formatClp(ingredient.latestPrice.grossAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#777]">
                        {mode === "resale"
                          ? "Unidades vendibles obtenidas"
                          : "Formato comprado"}
                      </p>
                      <p className="mt-1 font-black">
                        {ingredient.latestPrice.purchaseQuantity}{" "}
                        {unitLabel(ingredient.latestPrice.purchaseUnit)}
                      </p>
                    </div>
                  </div>
                  {(ingredient.usableYieldPercentage || 100) < 100 && (
                    <div className="mt-3 border-t border-[#d9dbd1] pt-3">
                      <p className="text-[10px] font-bold uppercase text-[#777]">
                        Costo efectivo utilizable ·{" "}
                        {ingredient.usableYieldPercentage || 100}%
                      </p>
                      <p className="money mt-1 font-black text-[#a15b22]">
                        {formatDecimalMoney(
                          (ingredient.latestPrice.costPerBase * 100) /
                            (ingredient.usableYieldPercentage || 100),
                        )}{" "}
                        / {unitLabel(ingredient.baseUnit)}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-[#8a671b]">
                        Rendimiento{" "}
                        {ingredient.yieldStatus === "estimated"
                          ? "estimado"
                          : "confirmado"}{" "}
                        · {yieldLossLabel(ingredient.yieldLossType || "none")}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-[#777]">
                    {formatDate(ingredient.latestPrice.purchaseDate)}
                    {ingredient.latestPrice.supplier
                      ? ` · ${ingredient.latestPrice.supplier}`
                      : ""}
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
              <button
                onClick={() => removeIngredient(ingredient)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-[#a24628]"
              >
                <Trash2 size={14} /> Eliminar materia prima
              </button>
              {ingredient.prices.length > 1 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-[#235b45]">
                    Ver historial ({ingredient.prices.length})
                  </summary>
                  <div className="mt-2 space-y-1">
                    {ingredient.prices.map((price) => (
                      <p key={price.id} className="text-[11px] text-[#777]">
                        {formatDate(price.purchaseDate)} ·{" "}
                        {price.purchaseQuantity} {unitLabel(price.purchaseUnit)}{" "}
                        · {formatClp(price.grossAmount)} pagados ·{" "}
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
          <Empty
            text={
              mode === "other"
                ? "Agrega el primer envase u otro insumo asociado a una venta."
                : mode === "resale"
                  ? "Registra la primera compra lista para revender."
                  : "Crea la primera materia prima para comenzar el costeo."
            }
          />
        )}
      </div>
      {creating && (
        <IngredientDialog
          categories={categories.filter((item) => item !== "Todas")}
          defaultSourceType={
            mode === "resale" ? "resale" : mode === "other" ? "supply" : "raw"
          }
          onClose={() => setCreating(false)}
        />
      )}
      {editing && (
        <IngredientDialog
          ingredient={editing}
          categories={categories.filter((item) => item !== "Todas")}
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
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<RecipeKind>("subrecipe");
  const [view, setView] = useCollectionView("recipes");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{
    recipe: Recipe;
    item: Recipe["items"][number];
  } | null>(null);
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
  const recipeMap = new Map(recipes.map((item) => [item.id, item]));
  const addingTo = recipes.find((recipe) => recipe.id === addingToId) || null;
  const viewing = recipes.find((recipe) => recipe.id === viewingId) || null;
  const recipeCounts = {
    subrecipe: recipes.filter((recipe) => recipe.kind === "subrecipe").length,
    final: recipes.filter((recipe) => recipe.kind === "final").length,
  };
  useEffect(() => {
    const saved = localStorage.getItem("kumera-recipe-kind");
    if (saved === "subrecipe" || saved === "final") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setKindFilter(saved);
    }
  }, []);
  function selectKind(kind: RecipeKind) {
    setKindFilter(kind);
    localStorage.setItem("kumera-recipe-kind", kind);
  }
  const visible = recipes.filter(
    (recipe) =>
      recipe.kind === kindFilter &&
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
            onClick={() => {
              selectKind("subrecipe");
              setCreating("subrecipe");
            }}
            className="flex items-center gap-2 rounded-xl border border-[#235b45] bg-white px-4 py-3 text-xs font-black text-[#235b45]"
          >
            <Plus size={15} /> Subreceta
          </button>
          <button
            onClick={() => {
              selectKind("final");
              setCreating("final");
            }}
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
      <div
        className="mt-5 flex w-full gap-2 overflow-x-auto border-b border-[#deddd4] pb-2"
        role="tablist"
        aria-label="Tipo de receta"
      >
        <button
          type="button"
          role="tab"
          aria-selected={kindFilter === "subrecipe"}
          onClick={() => selectKind("subrecipe")}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black ${kindFilter === "subrecipe" ? "bg-[#235b45] text-white" : "bg-[#fffef9] text-[#62675f]"}`}
        >
          Subrecetas{" "}
          <span className="opacity-70">{recipeCounts.subrecipe}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={kindFilter === "final"}
          onClick={() => selectKind("final")}
          className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black ${kindFilter === "final" ? "bg-[#235b45] text-white" : "bg-[#fffef9] text-[#62675f]"}`}
        >
          Recetas finales{" "}
          <span className="opacity-70">{recipeCounts.final}</span>
        </button>
      </div>
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar receta..."
      />
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
                          onClick={() => setViewingId(recipe.id)}
                        >
                          Ver detalle
                        </button>
                        <button
                          className="text-[#235b45]"
                          onClick={() => setAddingToId(recipe.id)}
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
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditingItem({ recipe, item })}
                            className="text-[#235b45]"
                            aria-label="Editar componente"
                          >
                            <Pencil size={15} />
                          </button>
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
                    onClick={() => setViewingId(recipe.id)}
                    className="flex items-center gap-2 text-xs font-bold text-[#235b45]"
                  >
                    <Eye size={14} /> Ver detalle
                  </button>
                  <button
                    onClick={() => setAddingToId(recipe.id)}
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
          onClose={() => setAddingToId(null)}
        />
      )}
      {viewing && (
        <RecipeDetailDialog
          recipe={viewing}
          ingredients={ingredients}
          recipes={recipes}
          costs={costs}
          onEdit={(item) => setEditingItem({ recipe: viewing, item })}
          onDelete={async (item) => {
            await deleteRecipeItemAction(item.id);
          }}
          onClose={() => setViewingId(null)}
        />
      )}
      {editingItem && (
        <RecipeItemEditDialog
          recipe={editingItem.recipe}
          item={editingItem.item}
          ingredients={ingredients}
          recipes={recipes}
          onClose={() => setEditingItem(null)}
        />
      )}
    </section>
  );
}

function productTypeLabel(type: ProductCostAnalysis["productType"]) {
  if (type === "resale") return "Comprado para revender";
  if (type === "mixed") return "Armado con componentes comprados";
  if (type === "manufactured") return "Elaborado en el negocio";
  return "Tipo por definir";
}

function ProductsCostView({
  analyses,
  recipes,
  ingredients,
  recipeCosts,
  settings,
  productKindMode = "all",
  showCreate = false,
}: {
  analyses: ProductCostAnalysis[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  recipeCosts: Record<string, RecipeCost>;
  settings: CostSettings;
  productKindMode?: "all" | "resale" | "prepared";
  showCreate?: boolean;
}) {
  const [editing, setEditing] = useState<ProductCostAnalysis | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productKind, setProductKind] = useState(productKindMode);
  const [category, setCategory] = useState("Todas");
  const [view, setView] = useCollectionView("product-costs");
  const categories = [
    "Todas",
    ...new Set(analyses.map((product) => product.category)),
  ];
  const categoryProducts = analyses.filter(
    (product) => category === "Todas" || product.category === category,
  );
  const costedProducts = categoryProducts.filter((product) => product.complete);
  const averageMargin = costedProducts.length
    ? costedProducts.reduce(
        (sum, product) => sum + product.contributionPercentage,
        0,
      ) / costedProducts.length
    : 0;
  const averageContribution = costedProducts.length
    ? costedProducts.reduce((sum, product) => sum + product.contribution, 0) /
      costedProducts.length
    : 0;
  const visible = analyses.filter(
    (product) =>
      (category === "Todas" || product.category === category) &&
      (productKind === "all" ||
        (productKind === "resale"
          ? product.productType === "resale"
          : product.productType !== "resale")) &&
      (status === "all" ||
        (status === "complete" ? product.complete : !product.complete)) &&
      product.name
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  return (
    <section className="mt-5">
      <SectionHeader
        title={
          productKindMode === "resale"
            ? "Productos comprados para revender"
            : productKindMode === "prepared"
              ? "Costos de productos elaborados o armados"
              : "Productos para vender"
        }
        subtitle={
          productKindMode === "resale"
            ? "Para productos que vendes sin transformar: registra el costo del formato comprado y sus unidades vendibles."
            : productKindMode === "prepared"
              ? "Cada producto debe vincularse a una receta final que reúna todos sus ingredientes, preparaciones y envases."
              : "Crea el artículo comercial, vincúlalo a una receta o compra registrada y define su precio de venta. Éste es el catálogo que podrá usar Caja."
        }
        action={showCreate ? () => setCreating(true) : undefined}
        actionLabel="Crear producto para vender"
      />
      {productKindMode === "resale" && (
        <div className="mt-4 rounded-2xl border border-[#d9dfce] bg-[#f3f5eb] p-5 text-sm leading-6 text-[#626b63]">
          <b className="text-[#235b45]">Ejemplo:</b> si una bebida cuesta $600
          por unidad y se vende a $1.000, Kumera separa el IVA, incorpora la
          comisión esperada y calcula su contribución real. No necesitas crear
          una receta ficticia.
        </div>
      )}
      {productKindMode === "all" && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setProductKind("resale")}
            className={`rounded-2xl border p-4 text-left ${productKind === "resale" ? "border-[#235b45] bg-[#eaf2e7]" : "border-[#deddd4] bg-[#fffef9]"}`}
          >
            <b>Comprados para revender</b>
            <p className="mt-1 text-xs leading-5 text-[#70756d]">
              Se venden sin preparación. El costo nace del formato comprado, sus
              unidades vendibles, merma, IVA y comisiones.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setProductKind("prepared")}
            className={`rounded-2xl border p-4 text-left ${productKind === "prepared" ? "border-[#235b45] bg-[#eaf2e7]" : "border-[#deddd4] bg-[#fffef9]"}`}
          >
            <b>Elaborados o armados en el negocio</b>
            <p className="mt-1 text-xs leading-5 text-[#70756d]">
              Usan una receta y pueden combinar preparaciones propias con
              componentes comprados listos para usar.
            </p>
          </button>
        </div>
      )}
      <div className="mt-4 rounded-2xl border border-[#cfdcc9] bg-[#eaf2e7] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#66766c]">
              Margen técnico promedio por producto
            </p>
            <p className="mt-2 text-4xl font-black text-[#235b45]">
              {costedProducts.length ? `${averageMargin.toFixed(1)}%` : "—"}
            </p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#66766c]">
              Promedio simple sobre venta neta sin IVA con los precios actuales
              de los productos que tienen costeo completo
              {category === "Todas" ? "" : ` en ${category}`}. No está ponderado
              por cantidad vendida y no se usa para proyectar el resultado del
              negocio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-72">
            <Mini
              label="Contribución promedio"
              value={
                costedProducts.length
                  ? formatClp(Math.round(averageContribution))
                  : "—"
              }
            />
            <Mini
              label="Productos incluidos"
              value={`${costedProducts.length} de ${categoryProducts.length}`}
            />
          </div>
        </div>
      </div>
      <CollectionToolbar
        view={view}
        onViewChange={setView}
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto..."
      >
        {productKindMode === "all" && (
          <select
            value={productKind}
            onChange={(event) =>
              setProductKind(
                event.target.value as "all" | "resale" | "prepared",
              )
            }
            className="input h-11 min-h-0 sm:w-56"
            aria-label="Tipo de producto"
          >
            <option value="all">Todos los tipos</option>
            <option value="resale">Comprados para revender</option>
            <option value="prepared">Elaborados o armados</option>
          </select>
        )}
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="input h-11 min-h-0 sm:w-48"
          aria-label="Categoría de productos"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
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
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Fuente del costo</th>
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
                    {productTypeLabel(product.productType)}
                  </td>
                  <td className="px-4 py-3 text-[#70756d]">
                    {product.recipeName ||
                      product.resaleSourceName ||
                      "Sin fuente"}
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
                    {productTypeLabel(product.productType)} · {product.category}
                    {" · "}
                    {product.recipeName ||
                      product.resaleSourceName ||
                      "Sin fuente"}{" "}
                    · venta por {product.saleUnit === "kg" ? "kg" : "unidad"}
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
          resaleSources={ingredients.filter(
            (ingredient) => ingredient.sourceType === "resale",
          )}
          onClose={() => setEditing(null)}
        />
      )}
      {creating && (
        <NewCostedProductDialog
          recipes={recipes}
          recipeCosts={recipeCosts}
          settings={settings}
          resaleSources={ingredients.filter(
            (ingredient) => ingredient.sourceType === "resale",
          )}
          categories={[...new Set(analyses.map((item) => item.category))]}
          initialType={productKindMode === "resale" ? "resale" : undefined}
          onClose={() => setCreating(false)}
        />
      )}
    </section>
  );
}

export function FixedCostsView({
  costs,
  monthly,
  settings,
  schedule,
}: {
  costs: FixedCost[];
  monthly: number;
  settings: CostSettings;
  schedule: OperatingSchedule;
}) {
  const [creating, setCreating] = useState<{
    name: string;
    category: string;
  } | null>(null);
  const [editing, setEditing] = useState<FixedCost | null>(null);
  const [configuring, setConfiguring] = useState(false);
  const fixedSuggestions = [
    ["Arriendo", "Local"],
    ["Contabilidad", "Servicios"],
    ["Internet y telefonía", "Servicios"],
    ["Software y suscripciones", "Servicios"],
  ] as const;
  const mixedSuggestions = [
    ["Electricidad promedio", "Servicios mixtos"],
    ["Agua promedio", "Servicios mixtos"],
    ["Gas promedio", "Servicios mixtos"],
  ] as const;
  const personnelSuggestions = [
    ["Sueldos líquidos mensuales", "Personal"],
    ["Cotizaciones y cargas laborales", "Personal"],
    ["Sueldo asignado al dueño operador", "Personal"],
  ] as const;
  const [section, setSection] = useState<
    "summary" | "fixed" | "personnel" | "mixed"
  >(costs.length ? "summary" : "fixed");
  const visibleCosts = costs.filter((cost) => {
    if (section === "summary") return true;
    if (section === "personnel") return cost.category === "Personal";
    if (section === "mixed") return cost.category === "Servicios mixtos";
    return !["Personal", "Servicios mixtos"].includes(cost.category);
  });
  const helpTitle =
    section === "mixed"
      ? "Cómo registrar luz, agua y gas"
      : section === "personnel"
        ? "Cómo registrar el costo del personal"
        : section === "fixed"
          ? "Qué corresponde a un costo fijo"
          : "Cómo clasificar costos y tratar el IVA";
  return (
    <section className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">
            Costos fijos y servicios mixtos
          </h2>
          <p className="mt-1 text-sm text-[#777]">
            Registra lo que debes pagar incluso si vendes poco o nada durante el
            mes.
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
            onClick={() => setCreating({ name: "", category: "Otros" })}
            className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-xs font-bold text-white"
          >
            <Plus size={15} /> Agregar costo
          </button>
        </div>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["summary", "Resumen"],
            ["fixed", "Costos fijos"],
            ["personnel", "Personal"],
            ["mixed", "Servicios mixtos"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black ${section === id ? "bg-[#235b45] text-white" : "border border-[#d9d9cf] bg-[#fffef9] text-[#62675f]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <details className="mt-3 rounded-2xl border border-[#deddd4] bg-[#fffef9] p-4">
        <summary className="cursor-pointer text-sm font-black text-[#235b45]">
          {helpTitle}
        </summary>
        {section === "summary" && (
          <>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#cbdcc8] bg-[#edf5ea] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-[#235b45]">
                  <CheckCircle2 size={17} /> Sí corresponde aquí
                </p>
                <p className="mt-2 text-xs leading-5 text-[#5e6b62]">
                  Arriendo, personal mensual, contabilidad, software, internet,
                  permisos, seguros, luz, agua y gas.
                </p>
              </div>
              <div className="rounded-2xl border border-[#ead7a9] bg-[#fff8e5] p-4">
                <p className="flex items-center gap-2 text-sm font-black text-[#765d14]">
                  <AlertTriangle size={17} /> No corresponde aquí
                </p>
                <p className="mt-2 text-xs leading-5 text-[#766b4d]">
                  Ingredientes, envases, merma y comisiones por venta se
                  registran en Insumos y Costeo.
                </p>
                <Link
                  href="/costos?tab=ingredients"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[#765d14]"
                >
                  Ir a Insumos y compras <ArrowRight size={13} />
                </Link>
              </div>
              <div className="rounded-2xl border border-[#d9d8cf] bg-white p-4">
                <p className="text-sm font-black">¿Y el IVA?</p>
                <p className="mt-2 text-xs leading-5 text-[#6d726b]">
                  No lo agregues como costo mensual. Si no es recuperable, usa
                  el monto que efectivamente soporta tu negocio.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-3">
              <p>
                <b>¿Lo pagas aunque no vendas?</b>
                <span className="block text-[#6d726b]">Es costo fijo.</span>
              </p>
              <p>
                <b>¿Aumenta por unidad vendida?</b>
                <span className="block text-[#6d726b]">
                  Regístralo como insumo, envase o comisión.
                </span>
              </p>
              <p>
                <b>¿Es luz, agua o gas?</b>
                <span className="block text-[#6d726b]">
                  Es servicio mixto: usa su promedio mensual.
                </span>
              </p>
            </div>
          </>
        )}
        {section === "fixed" && (
          <div className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2">
            <p className="rounded-xl bg-[#edf5ea] p-4">
              <b>Incluye:</b> arriendo, contabilidad, software, internet,
              permisos y seguros que pagas aunque no vendas durante el mes.
            </p>
            <p className="rounded-xl bg-[#fff8e5] p-4">
              <b>No incluyas:</b> ingredientes, envases, comisiones, luz, agua,
              gas ni costos que crecen directamente con cada venta.
            </p>
          </div>
        )}
        {section === "personnel" && (
          <div className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2">
            <p className="rounded-xl bg-[#f5f1fb] p-4">
              Registra sueldos líquidos y cotizaciones o cargas laborales por
              separado. No agregues además el sueldo bruto completo.
            </p>
            <p className="rounded-xl bg-[#fff8e5] p-4">
              Si el dueño trabaja en la operación, asigna un sueldo razonable
              para no sobreestimar la rentabilidad del negocio.
            </p>
          </div>
        )}
        {section === "mixed" && (
          <div className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2">
            <p className="rounded-xl bg-[#eef5fa] p-4">
              Luz, agua y gas cambian con la actividad, pero abastecen al
              negocio completo. Usa el promedio mensual de cada cuenta y no lo
              repitas dentro de las recetas.
            </p>
            <p className="rounded-xl bg-[#fffef9] p-4 ring-1 ring-[#d9d8cf]">
              <b>Para estimarlo:</b> promedia varios meses representativos. Si
              tu consumo cambia mucho por temporada, usa el promedio de una
              temporada comparable.
            </p>
          </div>
        )}
      </details>
      <div className={section === "fixed" ? "mt-4" : "hidden"}>
        <p className="text-xs font-black uppercase tracking-[.12em] text-[#6e746c]">
          Costos fijos frecuentes
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fixedSuggestions.map(([name, category]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCreating({ name, category })}
              className="rounded-full border border-[#d9d9cf] bg-[#fffef9] px-3 py-2 text-xs font-bold hover:border-[#8daf96] hover:bg-[#edf5ea]"
            >
              + {name}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`${section === "personnel" ? "mt-4" : "hidden"} rounded-2xl border border-[#d8cfeb] bg-[#f5f1fb] p-4`}
      >
        <p className="text-sm font-black text-[#574270]">Personal mensual</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#6f6380]">
          Para una estimación simple registra por separado los sueldos líquidos
          pagados y las cotizaciones o cargas laborales que pagas. Si usas esta
          forma, no vuelvas a ingresar el sueldo bruto completo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {personnelSuggestions.map(([name, category]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCreating({ name, category })}
              className="rounded-full border border-[#c9bade] bg-white px-3 py-2 text-xs font-bold text-[#574270] hover:bg-[#eee6f8]"
            >
              + {name}
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-5 text-[#674b40]">
          <b>Si trabajas en la operación, tu tiempo también tiene un costo.</b>{" "}
          Agrega un sueldo mensual razonable para el dueño o socio operador. Si
          lo omites porque retiras dinero sin registrarlo, Kumera mostrará una
          rentabilidad mayor a la real. Puedes omitirlo sólo si tus retiros se
          realizan después de calcular la utilidad y no corresponden al pago de
          tu trabajo operativo.
        </div>
        <p className="mt-3 text-xs leading-5 text-[#6f6380]">
          Ausencias o días no trabajados pueden cambiar el pago real de un mes,
          pero para planificar usa el costo mensual normal. Pagos por hora,
          turno, unidad o lote se registrarán como mano de obra variable del
          producto.
        </p>
      </div>
      <div
        className={`${section === "mixed" ? "mt-4" : "hidden"} rounded-2xl border border-[#cdd9e5] bg-[#eef5fa] p-4`}
      >
        <p className="text-sm font-black text-[#294f68]">
          Servicios mixtos: luz, agua y gas
        </p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#587083]">
          Su consumo cambia con la actividad, pero normalmente abastece a todo
          el negocio y no a un solo producto. Ingresa el promedio mensual de la
          cuenta. Kumera lo considerará en la estructura del negocio, separado
          de los costos fijos.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {mixedSuggestions.map(([name, category]) => (
            <button
              key={name}
              type="button"
              onClick={() => setCreating({ name, category })}
              className="rounded-full border border-[#b8cad8] bg-white px-3 py-2 text-xs font-bold text-[#294f68] hover:bg-[#e4f0f7]"
            >
              + {name}
            </button>
          ))}
        </div>
      </div>
      <div className="card mt-4 flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-bold uppercase text-[#777]">
            Total mensual de toda la estructura
          </p>
          <p className="mt-1 text-xs text-[#777]">
            {settings.operatingDaysMonth} días operativos
          </p>
        </div>
        <b className="money text-3xl">{formatClp(Math.round(monthly))}</b>
      </div>
      <div className="mt-3 space-y-2">
        {visibleCosts.map((cost) => (
          <div
            key={cost.id}
            className={`card flex items-center justify-between gap-3 p-4 ${!cost.active ? "opacity-50" : ""}`}
          >
            <div>
              <b>{cost.name}</b>
              <p className="mt-1 text-xs text-[#777]">
                {cost.category} · {periodLabel(cost.period)}
                {!cost.affectsProfitability && " · Sólo flujo de caja"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <b>{formatClp(cost.amount)}</b>
              <button
                onClick={() => setEditing(cost)}
                className="flex items-center gap-1 text-xs font-bold text-[#235b45]"
              >
                <Pencil size={14} /> Editar
              </button>
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
        {!visibleCosts.length && (
          <Empty text="Todavía no hay costos registrados en esta sección." />
        )}
      </div>
      {creating && (
        <FixedCostDialog
          template={creating}
          onClose={() => setCreating(null)}
        />
      )}
      {editing && (
        <FixedCostDialog cost={editing} onClose={() => setEditing(null)} />
      )}
      {configuring && (
        <SettingsDialog
          settings={settings}
          schedule={schedule}
          onClose={() => setConfiguring(false)}
        />
      )}
    </section>
  );
}

export function ProjectionsView({
  fixedCosts,
  businessPulse,
  globalBusinessPulse,
  monthlyBusinessPulses,
  estimatedVatPayable,
  vatRate,
}: {
  fixedCosts: number;
  businessPulse: BusinessPulse;
  globalBusinessPulse: BusinessPulse;
  monthlyBusinessPulses: { month: string; pulse: BusinessPulse }[];
  estimatedVatPayable: number;
  vatRate: number;
}) {
  const [period, setPeriod] = useState(monthlyBusinessPulses[0].month);
  const selectedMonth = monthlyBusinessPulses.find(
    (item) => item.month === period,
  );
  const activePulse =
    period === "global"
      ? globalBusinessPulse
      : selectedMonth?.pulse || businessPulse;
  const monthlySales = activePulse.projectedMonthlySales;
  const margin = activePulse.observedContributionPercentage;
  const contribution = activePulse.projectedMonthlyContribution;
  const wasteReserve = activePulse.projectedMonthlyWasteReserve;
  const projectedNetSales = monthlySales / (1 + vatRate / 100);
  const weightedNetMargin = projectedNetSales
    ? (contribution / projectedNetSales) * 100
    : 0;
  const operatingResult = contribution - wasteReserve - fixedCosts;
  const effectiveMargin = margin - activePulse.operationalWastePercentage;
  const breakEvenSales =
    effectiveMargin > 0 ? fixedCosts / (effectiveMargin / 100) : 0;
  const coverage = activePulse.recipeCostCoveragePercentage;
  const dailySalesDifference = globalBusinessPulse.averageDailySales
    ? ((activePulse.averageDailySales - globalBusinessPulse.averageDailySales) /
        globalBusinessPulse.averageDailySales) *
      100
    : 0;
  const monthLabel = (month: string) =>
    new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${month}-15T12:00:00Z`));
  const periodLabel =
    period === "global" ? "Global desde octubre" : monthLabel(period);

  return (
    <section className="mt-5">
      <SectionHeader
        title="Viabilidad con datos reales"
        subtitle="El mes en curso muestra rápido los cambios de temporada. El histórico global se conserva como referencia."
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#deddd4] bg-[#fffef9] p-3">
        <div>
          <label
            htmlFor="viability-period"
            className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[#777]"
          >
            Periodo analizado
          </label>
          <select
            id="viability-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded-xl border border-[#d8d8cf] bg-white px-4 py-2.5 text-xs font-black capitalize text-[#394039]"
          >
            {monthlyBusinessPulses.map((item) => (
              <option key={item.month} value={item.month}>
                {monthLabel(item.month)} · {item.pulse.observedDays} jornadas
              </option>
            ))}
            <option value="global">
              Global desde octubre · {globalBusinessPulse.observedDays} jornadas
            </option>
          </select>
        </div>
        {period !== "global" && (
          <p className="text-xs text-[#6f756e]">
            <span className="capitalize">{periodLabel}</span> vs. global:{" "}
            {dailySalesDifference >= 0 ? "+" : ""}
            {dailySalesDifference.toFixed(1)}% en venta diaria
          </p>
        )}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
                Base de cálculo
              </p>
              <h3 className="mt-1 text-lg font-black">
                Datos reales del negocio
              </h3>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#777]">
                {activePulse.observedDays} jornadas cerradas y conciliadas ·
                promedio diario de {formatClp(activePulse.averageDailySales)} ·{" "}
                {activePulse.operatingDaysMonth} días abiertos al mes.
              </p>
            </div>
            <span className="rounded-full bg-[#e8f0e6] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#235b45]">
              Automático · sin supuestos manuales
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProjectionFact
              label="Jornadas observadas"
              value={`${activePulse.observedDays}`}
              detail="cerradas y conciliadas"
            />
            <ProjectionFact
              label="Venta diaria promedio"
              value={formatClp(activePulse.averageDailySales)}
              detail="promedio real por jornada"
            />
            <ProjectionFact
              label="Venta mensual proyectada"
              value={formatClp(monthlySales)}
              detail={`${activePulse.operatingDaysMonth} días abiertos`}
            />
            <ProjectionFact
              label="Margen real ponderado"
              value={`${weightedNetMargin.toFixed(1)}%`}
              detail={`sobre venta neta · equivale a ${margin.toFixed(1)}% de la venta bruta`}
            />
          </div>

          {coverage < 95 && (
            <div className="mt-4 flex gap-3 rounded-xl border border-[#ead8a6] bg-[#fff4d4] p-4 text-xs leading-5 text-[#755b16]">
              <AlertTriangle className="mt-0.5 shrink-0" size={17} />
              <p>
                <b>Cobertura de productos vigentes: {coverage.toFixed(0)}%.</b>{" "}
                La proyección aplica el margen conocido también a la parte aún
                no costeada. Las ventas históricas de productos archivados no
                reducen este indicador.
              </p>
            </div>
          )}
        </div>

        <div
          className={`card p-5 ${operatingResult >= 0 ? "border-[#b9d0b8] bg-[#e8f0e6]" : "border-[#ead8a6] bg-[#fff4d4]"}`}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
            Resultado estimado
          </p>
          <p
            className={`money mt-3 text-4xl font-black ${operatingResult >= 0 ? "text-[#235b45]" : "text-[#9a3f22]"}`}
          >
            {formatClp(Math.round(operatingResult))}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#666]">
            Resultado operacional mensual antes de impuesto a la renta.
          </p>
          <div className="mt-5 space-y-3 border-t border-black/10 pt-4 text-sm">
            <ProjectionRow
              label="Ventas brutas proyectadas"
              value={monthlySales}
            />
            <ProjectionRow
              label="Venta neta estimada sin IVA"
              value={projectedNetSales}
            />
            <ProjectionRow
              label="Contribución tras recetas y comisiones"
              value={contribution}
            />
            <ProjectionRow
              label={`Reserva merma no registrada (${activePulse.operationalWastePercentage}%)`}
              value={-wasteReserve}
            />
            <ProjectionRow label="Costos fijos" value={-fixedCosts} />
          </div>
          <div className="mt-4 rounded-xl border border-[#cbd8c8] bg-white/75 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#235b45]">
              El IVA no se descuenta nuevamente
            </p>
            <p className="mt-2 text-xs leading-5 text-[#59635b]">
              La contribución ya se calcula desde ventas sin IVA. Por eso este
              resultado es posterior al IVA contenido en las ventas. La reserva
              acumulada para el próximo F29 es {formatClp(estimatedVatPayable)}:
              reduce tu dinero disponible, pero restarla aquí otra vez
              duplicaría el impuesto.
            </p>
          </div>
          <div className="mt-4 rounded-xl bg-white/65 p-4">
            <p className="text-[10px] font-bold uppercase text-[#777]">
              Punto de equilibrio mensual
            </p>
            <p className="money mt-1 text-xl font-black">
              {formatClp(Math.round(breakEvenSales))}
            </p>
            <p className="mt-1 text-[11px] text-[#777]">
              Ventas necesarias para cubrir los costos fijos con este margen.
            </p>
          </div>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-[#e7e6de] p-5">
          <h3 className="font-black">Mezcla real de ventas por categoría</h3>
          <p className="mt-1 text-xs text-[#777]">
            Así se repartiría la venta mensual si tus clientes mantienen la
            misma preferencia observada.
          </p>
        </div>
        <div className="divide-y divide-[#ecebe3]">
          {activePulse.categoryMix.map((item) => (
            <div
              key={item.category}
              className="grid gap-3 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)_130px] sm:items-center"
            >
              <b className="text-sm">{item.category}</b>
              <div className="h-2 overflow-hidden rounded-full bg-[#eceee7]">
                <div
                  className="h-full rounded-full bg-[#235b45]"
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
              <div className="sm:text-right">
                <b className="money text-sm">
                  {formatClp(
                    Math.round((monthlySales * item.percentage) / 100),
                  )}
                </b>
                <span className="ml-2 text-[11px] text-[#777]">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-4 text-[11px] leading-5 text-[#777]">
        Esta lectura orienta decisiones operacionales y se actualiza con los
        registros reales. No reemplaza la contabilidad, no descuenta impuesto a
        la renta y la reserva de IVA mostrada es una estimación acumulada, no la
        liquidación definitiva del F29.
      </p>
    </section>
  );
}

function ProjectionRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[#666]">{label}</span>
      <b className="money">
        {value < 0 ? "−" : ""}
        {formatClp(Math.round(Math.abs(value)))}
      </b>
    </div>
  );
}

function ProjectionFact({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#e4e4db] bg-[#faf9f4] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
        {label}
      </p>
      <p className="money mt-2 text-xl font-black">{value}</p>
      <p className="mt-1 text-[11px] text-[#777]">{detail}</p>
    </div>
  );
}

function LegacyProjectionsView({
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
    const wasteReserve = operationalWasteReserve(
      grossSales,
      settings.operationalWastePercentage,
    );
    return {
      grossSales,
      contribution,
      wasteReserve,
      profit: contribution - wasteReserve - fixedCosts,
      targetContribution: fixedCosts + target + wasteReserve,
    };
  }, [complete, quantities, days, fixedCosts, settings, target]);
  function adjustMixToGoal() {
    const currentDailyContribution = complete.reduce(
      (sum, product) =>
        sum +
        (product.contribution -
          operationalWasteReserve(
            product.price,
            settings.operationalWastePercentage,
          )) *
          (quantities[product.id] || 0),
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
        title="Simulador de ventas y utilidad"
        subtitle="Prueba cuánto necesitas vender diariamente para cubrir la operación y alcanzar una utilidad mensual."
      />

      <div className="mt-4 rounded-2xl border border-[#d4dfce] bg-[#edf4e9] p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#235b45] text-white">
            <Target size={19} />
          </span>
          <div>
            <h3 className="font-black text-[#235b45]">
              Cómo usar esta proyección
            </h3>
            <div className="mt-3 grid gap-3 text-xs leading-5 text-[#5f6d63] md:grid-cols-3">
              <p>
                <b>1. Define el mes.</b>
                <br />
                Indica cuántos días abrirás y cuánto quieres ganar después de
                pagar costos fijos.
              </p>
              <p>
                <b>2. Escribe una venta diaria posible.</b>
                <br />
                Ingresa unidades o kilos que crees vender de cada producto en un
                día normal.
              </p>
              <p>
                <b>3. Revisa el resultado.</b>
                <br />
                La mezcla diaria se multiplica por los días abiertos para
                calcular el resultado mensual.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
              Paso 1
            </p>
            <h3 className="mt-1 font-black">Supuestos del escenario</h3>
          </div>
          <span className="rounded-full bg-[#f0f1e9] px-3 py-1.5 text-[10px] font-bold text-[#667067]">
            Costos fijos: {formatClp(Math.round(fixedCosts))}/mes
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
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
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Result label="Ventas brutas mensuales" value={result.grossSales} />
        <Result label="Margen de contribución" value={result.contribution} />
        <Result
          label={`Reserva merma (${settings.operationalWastePercentage}%)`}
          value={-result.wasteReserve}
        />
        <Result label="Costos fijos mensuales" value={fixedCosts} />
        <div
          className={`card p-5 ${result.profit >= target ? "border-[#b9d0b8] bg-[#e8f0e6]" : "border-[#ead8a6] bg-[#fff4d4]"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#777]">
            Resultado operacional
          </p>
          <p
            className={`money mt-2 text-2xl font-black ${result.profit >= 0 ? "text-[#235b45]" : "text-[#9a3f22]"}`}
          >
            {formatClp(Math.round(result.profit))}
          </p>
          <p className="mt-2 text-[11px] leading-4 text-[#666]">
            {result.profit >= target
              ? `Cumple la utilidad objetivo de ${formatClp(target)}.`
              : `Faltan ${formatClp(Math.max(0, Math.round(result.targetContribution - result.contribution)))} de contribución mensual.`}
          </p>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7e6de] p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
              Paso 2
            </p>
            <h3 className="mt-1 font-black">
              Venta diaria esperada por producto
            </h3>
            <p className="mt-1 text-xs text-[#777]">
              Ingresa cantidades de un día normal, no el total mensual.
            </p>
          </div>
          <button
            onClick={() => setQuantities({})}
            className="rounded-lg border border-[#d7d7ce] px-3 py-2 text-xs font-bold text-[#666]"
          >
            Limpiar cantidades
          </button>
        </div>
        <div className="divide-y divide-[#ecebe3]">
          {complete.map((product) => (
            <label
              key={product.id}
              className="grid items-center gap-3 px-5 py-4 hover:bg-[#fafaf4] sm:grid-cols-[minmax(0,1fr)_160px_150px]"
            >
              <div className="min-w-0">
                <b className="text-sm">{product.name}</b>
                <p className="mt-1 text-[11px] text-[#777]">
                  Precio {formatClp(product.price)} · contribuye{" "}
                  {formatClp(Math.round(product.contribution))} por{" "}
                  {product.saleUnit === "kg" ? "kg" : "unidad"}
                </p>
              </div>
              <div className="relative">
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
                  className="input pr-12 text-right font-black"
                  placeholder="0"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#777]">
                  {product.saleUnit === "kg" ? "kg" : "un."}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-[10px] font-bold uppercase text-[#888]">
                  Venta diaria
                </p>
                <b className="money mt-1 block text-sm text-[#235b45]">
                  {formatClp(
                    Math.round(product.price * (quantities[product.id] || 0)),
                  )}
                </b>
              </div>
            </label>
          ))}
          {!complete.length && (
            <p className="py-8 text-center text-sm text-[#888]">
              Completa al menos un producto para proyectar.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#e7e6de] bg-[#fafaf5] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[11px] leading-5 text-[#777]">
            “Ajustar al objetivo” conserva la proporción ingresada y escala toda
            la mezcla hasta cubrir costos fijos y utilidad objetivo.
          </p>
          <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
    </section>
  );
}

function IngredientDialog({
  ingredient,
  categories,
  defaultSourceType = "raw",
  onClose,
}: {
  ingredient?: Ingredient;
  categories: string[];
  defaultSourceType?: "raw" | "supply" | "resale";
  onClose: () => void;
}) {
  const sourceType = ingredient?.sourceType || defaultSourceType;
  const availableCategories = Array.from(
    new Set(
      [ingredient?.category, ...categories]
        .map((category) => category?.trim())
        .filter((category): category is string => Boolean(category)),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const [categoryChoice, setCategoryChoice] = useState(
    ingredient?.category || availableCategories[0] || "__none",
  );
  const noun =
    sourceType === "resale"
      ? "compra para reventa"
      : sourceType === "supply"
        ? "insumo"
        : "materia prima";
  return (
    <Dialog
      title={ingredient ? `Editar ${noun}` : `Nueva ${noun}`}
      onClose={onClose}
    >
      <AsyncForm action={saveIngredientAction}>
        {ingredient && <input type="hidden" name="id" value={ingredient.id} />}
        <input type="hidden" name="sourceType" value={sourceType} />
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
              className="input"
              value={categoryChoice}
              required
              onChange={(event) => setCategoryChoice(event.target.value)}
            >
              {!availableCategories.length && (
                <option value="__none" disabled>
                  Sin categorías
                </option>
              )}
              {availableCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value="__new">＋ Agregar categoría nueva</option>
            </select>
            {categoryChoice === "__new" ? (
              <input
                name="category"
                required
                autoFocus
                maxLength={60}
                className="input mt-2"
                placeholder="Nombre de la nueva categoría"
              />
            ) : categoryChoice !== "__none" ? (
              <input type="hidden" name="category" value={categoryChoice} />
            ) : null}
          </Field>
          <Field label="Unidad base">
            <select
              name="baseUnit"
              className="input"
              defaultValue={
                ingredient?.baseUnit || (sourceType === "resale" ? "unit" : "g")
              }
              disabled={sourceType === "resale"}
            >
              <option value="g">Gramos</option>
              <option value="ml">Mililitros</option>
              <option value="unit">Unidades</option>
            </select>
            {sourceType === "resale" && (
              <input type="hidden" name="baseUnit" value="unit" />
            )}
          </Field>
        </div>
        <Field label="Notas">
          <textarea
            name="notes"
            defaultValue={ingredient?.notes}
            className="input min-h-20 py-3"
          />
        </Field>
        {sourceType !== "resale" && (
          <div className="rounded-xl border border-[#e4d9b8] bg-[#fff9e8] p-4">
            <p className="text-xs font-black text-[#6e5717]">
              Rendimiento aprovechable
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[#756b50]">
              Se usa para huesos, piel, grasa, limpieza o reducción por cocción.
              El costo de las recetas aumentará automáticamente según la parte
              realmente utilizable.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Rendimiento %">
                <input
                  name="usableYieldPercentage"
                  type="number"
                  min="0.001"
                  max="100"
                  step="0.001"
                  required
                  defaultValue={ingredient?.usableYieldPercentage ?? 100}
                  className="input"
                />
              </Field>
              <Field label="Tipo de pérdida">
                <select
                  name="yieldLossType"
                  defaultValue={ingredient?.yieldLossType || "none"}
                  className="input"
                >
                  <option value="none">Sin pérdida</option>
                  <option value="cleaning">Limpieza / grasa</option>
                  <option value="cooking">Cocción</option>
                  <option value="bone_skin">Hueso y piel</option>
                  <option value="combined">Combinada</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  name="yieldStatus"
                  defaultValue={ingredient?.yieldStatus || "confirmed"}
                  className="input"
                >
                  <option value="estimated">Estimado</option>
                  <option value="confirmed">Confirmado</option>
                </select>
              </Field>
            </div>
          </div>
        )}
        {sourceType === "resale" && (
          <input type="hidden" name="usableYieldPercentage" value="100" />
        )}
        <Submit>Guardar {noun}</Submit>
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
  const [taxMode, setTaxMode] = useState<"net" | "included" | "exempt">("net");
  const units =
    ingredient.baseUnit === "g"
      ? ["kg", "g"]
      : ingredient.baseUnit === "ml"
        ? ["l", "ml"]
        : ["unit"];
  const isResale = ingredient.sourceType === "resale";
  return (
    <Dialog
      title={
        isResale
          ? `Compra y rendimiento de ${ingredient.name}`
          : `Precio de ${ingredient.name}`
      }
      onClose={onClose}
    >
      <AsyncForm action={addIngredientPriceAction}>
        <input type="hidden" name="ingredientId" value={ingredient.id} />
        {isResale && (
          <div className="mb-4 rounded-xl border border-[#dfd4ae] bg-[#fff8df] p-4 text-xs leading-5 text-[#6f6030]">
            <b className="text-[#594b20]">Separa compra de venta:</b> indica
            cuántas unidades podrás vender con el formato completo. Ejemplo: si
            compras un cheesecake entero por $25.000 y lo vendes en 10 trozos,
            registra <b>10 unidades vendibles</b>. Kumera calculará el costo de
            cada trozo.
          </div>
        )}
        <div className={isResale ? "grid gap-3" : "grid grid-cols-2 gap-3"}>
          <Field
            label={
              isResale
                ? "¿Cuántas unidades vendibles obtienes?"
                : "Cantidad comprada"
            }
          >
            <input
              name="purchaseQuantity"
              required
              type="number"
              step="0.001"
              min="0.001"
              className="input"
              placeholder={isResale ? "Ej: 10 porciones" : "25"}
            />
          </Field>
          {isResale ? (
            <input type="hidden" name="purchaseUnit" value="unit" />
          ) : (
            <Field label="Unidad">
              <select name="purchaseUnit" className="input">
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unitLabel(unit)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <Field
          label={
            taxMode === "net"
              ? isResale
                ? "Costo neto del formato completo"
                : "Subtotal neto de la compra"
              : taxMode === "included"
                ? isResale
                  ? "Total pagado por el formato completo"
                  : "Total pagado con IVA"
                : isResale
                  ? "Monto pagado por el formato completo"
                  : "Monto pagado"
          }
        >
          <input
            name="purchaseAmount"
            required
            type="number"
            className="input"
            placeholder="35680"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tratamiento IVA">
            <select
              name="taxMode"
              className="input"
              value={taxMode}
              onChange={(event) =>
                setTaxMode(event.target.value as "net" | "included" | "exempt")
              }
            >
              <option value="net">Neto de factura, sin IVA</option>
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
  const [saved, setSaved] = useState(false);
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
  const alreadyAdded = recipe.items.some((item) =>
    kind === "ingredient" ? item.ingredientId === id : item.subrecipeId === id,
  );
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
      <AsyncForm
        action={addRecipeItemAction}
        reloadOnSuccess={false}
        onSuccess={(form) => {
          form.reset();
          setSaved(true);
        }}
      >
        <input type="hidden" name="recipeId" value={recipe.id} />
        <input type="hidden" name="componentType" value={kind} />
        <input type="hidden" name="componentId" value={id} />
        <Field label="Ingrediente o subreceta">
          <select
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setSaved(false);
            }}
            className="input"
          >
            <optgroup label="Materias primas">
              {ingredients.map((item) => (
                <option key={item.id} value={`ingredient:${item.id}`}>
                  {item.name}
                  {recipe.items.some(
                    (recipeItem) => recipeItem.ingredientId === item.id,
                  )
                    ? " · ya agregado"
                    : ""}
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
                    {recipe.items.some(
                      (recipeItem) => recipeItem.subrecipeId === item.id,
                    )
                      ? " · ya agregada"
                      : ""}
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
        {alreadyAdded && !saved && (
          <p className="rounded-xl bg-[#fff4d4] p-3 text-center text-xs font-bold text-[#795f0d]">
            Este componente ya está en la receta. Abre el detalle para editar su
            cantidad o eliminarlo.
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="rounded-xl bg-[#eef4eb] p-3 text-center text-xs font-bold text-[#235b45]"
          >
            Componente agregado. Puedes continuar con el siguiente.
          </p>
        )}
        <Submit disabled={alreadyAdded}>
          {alreadyAdded ? "Componente ya agregado" : "Agregar componente"}
        </Submit>
      </AsyncForm>
    </Dialog>
  );
}

function RecipeDetailDialog({
  recipe,
  ingredients,
  recipes,
  costs,
  onEdit,
  onDelete,
  onClose,
}: {
  recipe: Recipe;
  ingredients: Ingredient[];
  recipes: Recipe[];
  costs: Record<string, RecipeCost>;
  onEdit: (item: Recipe["items"][number]) => void;
  onDelete: (item: Recipe["items"][number]) => Promise<void>;
  onClose: () => void;
}) {
  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));
  const recipeMap = new Map(recipes.map((item) => [item.id, item]));
  return (
    <Dialog title={`Detalle · ${recipe.name}`} onClose={onClose}>
      <div className="mt-5 rounded-xl bg-[#eef2e9] p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span>Rendimiento</span>
          <b>
            {recipe.yieldQuantity} {recipe.yieldUnit === "kg" ? "kg" : "un."}
          </b>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span>Costo total del lote</span>
          <b>{formatClp(Math.round(costs[recipe.id]?.total || 0))}</b>
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
          const contribution = recipeItemCost(
            item,
            ingredient,
            subrecipe,
            costs,
          );
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <b className="block truncate text-sm">
                  {ingredient?.name ||
                    subrecipe?.name ||
                    "Componente eliminado"}
                </b>
                <p className="mt-1 text-xs text-[#777]">
                  {item.quantity} {unitLabel(item.unit)}
                  {subrecipe ? " · subreceta" : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-[#777]">Aporta</p>
                <b className="money text-sm">
                  {contribution == null
                    ? "Sin precio"
                    : formatClp(Math.round(contribution))}
                </b>
              </div>
              <button
                onClick={() => onEdit(item)}
                className="grid size-9 place-items-center rounded-lg bg-[#e8eee6] text-[#235b45]"
                aria-label="Editar componente"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={async () => {
                  const name =
                    ingredient?.name || subrecipe?.name || "este componente";
                  if (!confirm(`¿Quitar ${name} de esta receta?`)) return;
                  try {
                    await onDelete(item);
                  } catch (error) {
                    alert(
                      error instanceof Error
                        ? error.message
                        : "No se pudo quitar el componente",
                    );
                  }
                }}
                className="grid size-9 place-items-center rounded-lg bg-[#fff0e9] text-[#a24628]"
                aria-label="Quitar componente"
                title="Quitar de la receta"
              >
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        {!recipe.items.length && (
          <p className="p-5 text-center text-xs text-[#888]">
            Receta todavía vacía
          </p>
        )}
      </div>
    </Dialog>
  );
}

function RecipeItemEditDialog({
  recipe,
  item,
  ingredients,
  recipes,
  onClose,
}: {
  recipe: Recipe;
  item: Recipe["items"][number];
  ingredients: Ingredient[];
  recipes: Recipe[];
  onClose: () => void;
}) {
  const ingredient = ingredients.find(
    (value) => value.id === item.ingredientId,
  );
  const subrecipe = recipes.find((value) => value.id === item.subrecipeId);
  const allowedUnits =
    ingredient?.baseUnit === "g"
      ? ["g", "kg"]
      : ingredient?.baseUnit === "ml"
        ? ["ml", "l"]
        : ingredient
          ? ["unit"]
          : subrecipe
            ? [subrecipe.yieldUnit]
            : [item.unit];
  return (
    <Dialog
      title={`Editar · ${ingredient?.name || subrecipe?.name || "componente"}`}
      onClose={onClose}
    >
      <p className="mt-3 text-xs text-[#777]">Receta: {recipe.name}</p>
      <AsyncForm action={updateRecipeItemAction}>
        <input type="hidden" name="id" value={item.id} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad">
            <input
              name="quantity"
              required
              type="number"
              min="0.001"
              step="0.001"
              defaultValue={item.quantity}
              className="input"
            />
          </Field>
          <Field label="Unidad">
            <select name="unit" defaultValue={item.unit} className="input">
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unitLabel(unit)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Submit>Guardar componente</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function recipeItemCost(
  item: Recipe["items"][number],
  ingredient: Ingredient | undefined,
  subrecipe: Recipe | undefined,
  costs: Record<string, RecipeCost>,
) {
  if (ingredient) {
    const unitMultiplier = item.unit === "kg" || item.unit === "l" ? 1000 : 1;
    return ingredient.latestPrice
      ? (ingredient.latestPrice.costPerBase *
          item.quantity *
          unitMultiplier *
          100) /
          (ingredient.usableYieldPercentage || 100)
      : null;
  }
  if (subrecipe) {
    const unitMultiplier =
      item.unit === "kg" && subrecipe.yieldUnit !== "kg" ? 1000 : 1;
    return (
      (costs[subrecipe.id]?.perYieldUnit || 0) * item.quantity * unitMultiplier
    );
  }
  return null;
}

function NewCostedProductDialog({
  recipes,
  recipeCosts,
  settings,
  categories,
  resaleSources,
  initialType = "manufactured",
  onClose,
}: {
  recipes: Recipe[];
  recipeCosts: Record<string, RecipeCost>;
  settings: CostSettings;
  categories: string[];
  resaleSources: Ingredient[];
  initialType?: "resale" | "manufactured" | "mixed";
  onClose: () => void;
}) {
  const [productType, setProductType] = useState(initialType);
  const availableCategories = Array.from(
    new Set(categories.map((category) => category.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es"));
  const [categoryChoice, setCategoryChoice] = useState(
    availableCategories[0] || "__none",
  );
  const [recipeId, setRecipeId] = useState("");
  const [resaleSourceId, setResaleSourceId] = useState("");
  const [targetMargin, setTargetMargin] = useState(60);
  const [wastePercentage, setWastePercentage] = useState(0);
  const [finalPrice, setFinalPrice] = useState("");
  const sourceCost =
    productType === "resale"
      ? resaleSources.find((source) => source.id === resaleSourceId)
          ?.latestPrice?.costPerBase || 0
      : recipeCosts[recipeId]?.perYieldUnit || 0;
  const feePercentage =
    (settings.expectedDebitPercentage / 100) * settings.debitFeePercentage +
    (settings.expectedCreditPercentage / 100) * settings.creditFeePercentage;
  const suggestedDenominator =
    (1 - targetMargin / 100) / (1 + settings.vatRate / 100) -
    feePercentage / 100;
  const suggestedPrice =
    sourceCost > 0 && suggestedDenominator > 0
      ? Math.ceil(
          (sourceCost * (1 + wastePercentage / 100)) /
            suggestedDenominator /
            100,
        ) * 100
      : 0;
  return (
    <Dialog title="Crear producto y asignar su costo" onClose={onClose}>
      <AsyncForm action={createCostedProductAction}>
        <Field label="Nombre del producto">
          <input
            name="name"
            required
            maxLength={100}
            className="input"
            placeholder="Ej: Café americano"
          />
        </Field>
        <Field label="Categoría propia de este negocio">
          <select
            className="input"
            value={categoryChoice}
            required
            onChange={(event) => setCategoryChoice(event.target.value)}
          >
            {!availableCategories.length && (
              <option value="__none" disabled>
                Sin categorías
              </option>
            )}
            {availableCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
            <option value="__new">＋ Agregar categoría nueva</option>
          </select>
          {categoryChoice === "__new" ? (
            <input
              name="category"
              required
              autoFocus
              maxLength={60}
              className="input mt-2"
              placeholder="Nombre de la nueva categoría"
            />
          ) : categoryChoice !== "__none" ? (
            <input type="hidden" name="category" value={categoryChoice} />
          ) : null}
        </Field>
        <Field label="Descripción opcional">
          <textarea
            name="description"
            maxLength={300}
            className="input min-h-20 py-3"
            placeholder="Descripción visible en el catálogo"
          />
        </Field>
        <Field label="Origen del costo">
          <select
            name="productType"
            className="input"
            value={productType}
            onChange={(event) =>
              setProductType(event.target.value as typeof productType)
            }
          >
            <option value="manufactured">
              Elaboración propia desde una receta
            </option>
            <option value="mixed">
              Armado con componentes comprados y/o elaborados
            </option>
            <option value="resale">Compra y reventa sin elaboración</option>
          </select>
          <span className="mt-1 block text-[11px] font-normal leading-5 text-[#6f746d]">
            Elige reventa si compras el producto listo. Elige elaboración si su
            costo nace de una receta, o armado si combinas elementos comprados y
            elaborados.
          </span>
        </Field>
        {productType === "resale" ? (
          <div className="grid gap-3 rounded-xl border border-[#deded4] bg-[#faf9f4] p-4">
            <p className="text-xs font-black text-[#235b45]">
              Compra registrada que origina el costo
            </p>
            <Field label="Producto comprado para revender">
              <select
                name="resaleSourceId"
                required
                className="input"
                value={resaleSourceId}
                onChange={(event) => setResaleSourceId(event.target.value)}
              >
                <option value="" disabled>
                  Seleccionar compra registrada
                </option>
                {resaleSources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                    {source.latestPrice
                      ? ` · ${formatClp(Math.round(source.latestPrice.costPerBase))} netos/un.`
                      : " · sin precio registrado"}
                  </option>
                ))}
              </select>
            </Field>
            <p className="text-[11px] leading-5 text-[#6f746d]">
              El precio y rendimiento se administran en Compras para reventa.
              Aquí sólo conectas esa fuente al producto que venderás.
            </p>
            {!resaleSources.length && (
              <Link
                href="/costos?tab=resale"
                className="text-xs font-black text-[#235b45] underline"
              >
                Registrar primero una compra para reventa
              </Link>
            )}
            <input type="hidden" name="recipeId" value="" />
          </div>
        ) : (
          <Field
            label={
              productType === "mixed"
                ? "Receta final de armado"
                : "Receta final"
            }
          >
            <select
              name="recipeId"
              required
              className="input"
              value={recipeId}
              onChange={(event) => setRecipeId(event.target.value)}
            >
              <option value="" disabled>
                Seleccionar receta final
              </option>
              {recipes
                .filter((recipe) => recipe.kind === "final")
                .map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} ·{" "}
                    {recipe.yieldUnit === "kg" ? "por kg" : "por unidad"}
                  </option>
                ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Merma comercial %">
            <input
              name="wastePercentage"
              type="number"
              min="0"
              max="99"
              step="0.1"
              value={wastePercentage}
              onChange={(event) =>
                setWastePercentage(Number(event.target.value))
              }
              className="input"
            />
          </Field>
          <Field label="Margen objetivo %">
            <input
              name="targetMarginPercentage"
              type="number"
              min="0"
              max="94"
              step="0.1"
              value={targetMargin}
              onChange={(event) => setTargetMargin(Number(event.target.value))}
              className="input"
            />
          </Field>
        </div>
        <div className="rounded-2xl border border-[#c9d9c5] bg-[#eaf2e7] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#66766c]">
            Precio sugerido según el margen elegido
          </p>
          {suggestedPrice ? (
            <>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="money text-3xl font-black text-[#235b45]">
                  {formatClp(suggestedPrice)}
                </p>
                <button
                  type="button"
                  onClick={() => setFinalPrice(String(suggestedPrice))}
                  className="rounded-xl border border-[#235b45] bg-[#fffef9] px-3 py-2 text-xs font-black text-[#235b45]"
                >
                  Usar este precio
                </button>
              </div>
              <p className="mt-1 text-[11px] leading-5 text-[#66766c]">
                Considera costo neto, merma, IVA y la mezcla esperada de
                comisiones por tarjeta. Puedes elegir otro precio final.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs leading-5 text-[#66766c]">
              Selecciona primero una receta o compra con precio vigente para
              calcular la sugerencia.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Forma de venta">
            <select name="saleUnit" className="input" defaultValue="unit">
              <option value="unit">Por unidad</option>
              <option value="kg">Por kilogramo</option>
            </select>
          </Field>
          <Field label="Precio de venta final">
            <input
              name="price"
              required
              type="number"
              min="1"
              className="input"
              value={finalPrice}
              onChange={(event) => setFinalPrice(event.target.value)}
              placeholder={suggestedPrice ? String(suggestedPrice) : undefined}
            />
          </Field>
        </div>
        <Field label="Precio en PedidosYa (opcional)">
          <input
            name="pedidosYaPrice"
            type="number"
            min="1"
            className="input"
            placeholder="Puede ser diferente al precio del local"
          />
        </Field>
        <label className="flex items-start gap-3 rounded-xl border border-[#dfe4da] bg-[#f3f6ef] p-4 text-sm">
          <input
            name="trackDailyAvailability"
            type="checkbox"
            className="mt-0.5 size-4 accent-[#235b45]"
          />
          <span>
            <b className="block text-[#235b45]">
              Controlar disponibilidad diaria
            </b>
            <span className="mt-1 block text-xs font-normal leading-5 text-[#6f756d]">
              Para productos vendidos por unidad. Caja solicitará la cantidad
              disponible al comenzar el día.
            </span>
          </span>
        </label>
        <Field label="Imagen opcional">
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="block w-full text-xs"
          />
        </Field>
        <p className="rounded-xl bg-[#eef4eb] p-3 text-xs leading-5 text-[#526158]">
          Al guardar, este producto quedará en el catálogo general y aparecerá
          automáticamente en Caja si ese módulo está habilitado.
        </p>
        <Submit>Crear producto y calcular costo</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function ProductCostDialog({
  product,
  recipes,
  resaleSources,
  onClose,
}: {
  product: ProductCostAnalysis;
  recipes: Recipe[];
  resaleSources: Ingredient[];
  onClose: () => void;
}) {
  const initialType =
    product.productType || (product.recipeId ? "manufactured" : "resale");
  const [productType, setProductType] = useState(initialType);
  return (
    <Dialog title={`Costeo de ${product.name}`} onClose={onClose}>
      <AsyncForm action={configureProductCostAction}>
        <input type="hidden" name="productId" value={product.id} />
        <Field label="Cómo obtienes este producto">
          <select
            name="productType"
            value={productType}
            onChange={(event) =>
              setProductType(
                event.target.value as "resale" | "manufactured" | "mixed",
              )
            }
            className="input"
          >
            <option value="resale">Lo compro para revender</option>
            <option value="manufactured">
              Lo elaboro desde materias primas
            </option>
            <option value="mixed">
              Lo armo con componentes comprados y/o elaborados
            </option>
          </select>
        </Field>
        <div className="rounded-xl bg-[#eef4eb] p-3 text-xs leading-5 text-[#526158]">
          {productType === "resale"
            ? "Se vende tal como se compra. Vincúlalo a una compra registrada; no necesita receta."
            : productType === "manufactured"
              ? "Su costo nace de una receta final con materias primas y preparaciones propias."
              : "Su costo nace de una receta final de armado. Puede incluir un componente comprado, una preparación propia y envases; por ejemplo croissant + jamón + queso + bolsa."}
        </div>
        {productType === "resale" && (
          <div className="rounded-xl border border-[#deded4] bg-[#faf9f4] p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#657067]">
              Si es reventa
            </p>
            <div className="mt-3 grid gap-3">
              <Field label="Producto comprado para revender">
                <select
                  name="resaleSourceId"
                  required
                  defaultValue={product.resaleSourceId || ""}
                  className="input"
                >
                  <option value="" disabled>
                    Seleccionar compra registrada
                  </option>
                  {resaleSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                      {source.latestPrice
                        ? ` · ${formatClp(Math.round(source.latestPrice.costPerBase))} netos/un.`
                        : " · sin precio registrado"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#6f746d]">
              El costo se actualizará desde el último precio registrado en
              Compras para reventa.
            </p>
          </div>
        )}
        {productType !== "resale" ? (
          <Field
            label={
              productType === "mixed"
                ? "Receta final de armado"
                : "Receta final del producto"
            }
          >
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
        ) : (
          <input type="hidden" name="recipeId" value="" />
        )}
        {productType !== "resale" && (
          <p className="-mt-2 text-xs leading-5 text-[#777]">
            Si el producto tiene masa y relleno, selecciona aquí la receta final
            que contiene todos sus componentes y envases; no selecciones
            solamente una parte.
          </p>
        )}
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

function FixedCostDialog({
  cost,
  template,
  onClose,
}: {
  cost?: FixedCost;
  template?: { name: string; category: string };
  onClose: () => void;
}) {
  return (
    <Dialog
      title={cost ? "Editar costo mensual" : "Nuevo costo mensual"}
      onClose={onClose}
    >
      <AsyncForm action={saveFixedCostAction}>
        {cost && <input type="hidden" name="id" value={cost.id} />}
        <Field label="Nombre">
          <input
            name="name"
            required
            defaultValue={cost?.name || template?.name}
            className="input"
            placeholder="Ej: Arriendo"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto que realmente es costo para el negocio">
            <input
              name="amount"
              required
              type="number"
              defaultValue={cost?.amount}
              className="input"
            />
          </Field>
          <Field label="Periodicidad">
            <select
              name="period"
              defaultValue={cost?.period || "monthly"}
              className="input"
            >
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
            <select
              name="category"
              defaultValue={cost?.category || template?.category || "Otros"}
              className="input"
            >
              <option>Local</option>
              <option>Personal</option>
              <option>Servicios</option>
              <option>Servicios mixtos</option>
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
              defaultValue={cost?.startsOn || today()}
              className="input"
            />
          </Field>
        </div>
        <p className="-mt-1 rounded-xl bg-[#f3f3eb] p-3 text-xs leading-5 text-[#666c64]">
          Si recuperas el IVA de esta compra, ingresa el monto neto. Si el IVA
          no es recuperable, ingresa el total que efectivamente soporta tu
          negocio.
        </p>
        <Field label="Hasta (opcional)">
          <input
            name="endsOn"
            type="date"
            defaultValue={cost?.endsOn || ""}
            className="input"
          />
        </Field>
        <label className="flex gap-3 rounded-xl bg-[#eff0e8] p-4 text-sm">
          <input
            name="affectsProfitability"
            type="checkbox"
            defaultChecked={cost?.affectsProfitability ?? true}
          />
          <span>
            <b>Descontar en rentabilidad</b>
            <span className="mt-1 block text-xs text-[#666c64]">
              Desactívalo para cuotas de crédito u otras salidas que son sólo
              flujo de caja. En un crédito, únicamente el interés es gasto.
            </span>
          </span>
        </label>
        <Submit>{cost ? "Guardar cambios" : "Guardar costo mensual"}</Submit>
      </AsyncForm>
    </Dialog>
  );
}

function SettingsDialog({
  settings,
  schedule,
  onClose,
}: {
  settings: CostSettings;
  schedule: OperatingSchedule;
  onClose: () => void;
}) {
  const [daysMode, setDaysMode] = useState(schedule.mode);
  return (
    <Dialog title="Parámetros del modelo" onClose={onClose}>
      <AsyncForm action={saveCostSettingsAction}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="IVA %">
            <input
              name="vatRate"
              type="number"
              step="0.001"
              defaultValue={settings.vatRate}
              className="input"
            />
          </Field>
        </div>
        <p className="rounded-xl bg-[#f3f3eb] p-3 text-xs leading-5 text-[#666c64]">
          Esta tasa se usa para separar el precio neto del IVA en ventas y
          compras afectas. El IVA no se agrega como costo fijo mensual.
        </p>
        <fieldset className="grid gap-3 rounded-2xl border border-[#deddd4] p-4">
          <legend className="px-1 text-xs font-black">
            Días de funcionamiento
          </legend>
          <label className="flex items-start gap-3 rounded-xl bg-[#f3f3eb] p-3 text-sm">
            <input
              type="radio"
              name="operatingDaysMode"
              value="weekly"
              checked={daysMode === "weekly"}
              onChange={() => setDaysMode("weekly")}
              className="mt-1"
            />
            <span>
              <b>Calcular desde mi horario semanal</b>
              <span className="mt-1 block text-xs text-[#666c64]">
                Kumera contará los días reales del mes: 28, 29, 30 o 31 según el
                calendario.
              </span>
            </span>
          </label>
          {daysMode === "weekly" && (
            <div className="grid gap-3">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {[
                  [1, "Lun"],
                  [2, "Mar"],
                  [3, "Mié"],
                  [4, "Jue"],
                  [5, "Vie"],
                  [6, "Sáb"],
                  [7, "Dom"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex flex-col items-center gap-2 rounded-xl border border-[#d7d7ce] p-2 text-xs font-bold"
                  >
                    <input
                      name="operatingWeekdays"
                      type="checkbox"
                      value={value}
                      defaultChecked={schedule.weekdays.includes(Number(value))}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Hora de apertura">
                  <input
                    name="openingTime"
                    type="time"
                    defaultValue={schedule.openingTime?.slice(0, 5) || "09:00"}
                    className="input"
                  />
                </Field>
                <Field label="Hora de cierre">
                  <input
                    name="closingTime"
                    type="time"
                    defaultValue={schedule.closingTime?.slice(0, 5) || "19:00"}
                    className="input"
                  />
                </Field>
              </div>
              <p className="text-xs text-[#666c64]">
                El horario queda asociado al local principal. Por ahora los
                feriados no se descuentan automáticamente.
              </p>
            </div>
          )}
          <label className="flex items-start gap-3 rounded-xl bg-[#f3f3eb] p-3 text-sm">
            <input
              type="radio"
              name="operatingDaysMode"
              value="manual"
              checked={daysMode === "manual"}
              onChange={() => setDaysMode("manual")}
              className="mt-1"
            />
            <span>
              <b>Usar una cantidad manual mensual</b>
              <span className="mt-1 block text-xs text-[#666c64]">
                Útil si tus días cambian sin seguir una semana regular.
              </span>
            </span>
          </label>
          {daysMode === "manual" ? (
            <Field label="Días abiertos al mes">
              <input
                name="operatingDaysMonth"
                type="number"
                min="1"
                max="31"
                defaultValue={settings.operatingDaysMonth}
                className="input"
              />
            </Field>
          ) : (
            <input
              type="hidden"
              name="operatingDaysMonth"
              value={settings.operatingDaysMonth}
            />
          )}
        </fieldset>
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
        <div className="rounded-xl bg-[#eff0e8] p-4 text-sm">
          <p className="font-black">Comisión de tarjetas vigente</p>
          <p className="mt-1 text-[#666c64]">
            Modelo mixto: {settings.cardFeePercentage}% +{" "}
            {formatClp(settings.cardFeeFixedAmount)} netos por transacción, más{" "}
            {settings.cardFeeVatRate}% de IVA. Abono en{" "}
            {settings.cardSettlementDays} día.
          </p>
        </div>
        <Field label="Ticket promedio esperado para proyectar comisiones">
          <input
            name="expectedTicketAmount"
            type="number"
            min="1"
            defaultValue={settings.expectedTicketAmount}
            className="input"
          />
        </Field>
        <Field label="Utilidad mensual objetivo">
          <input
            name="targetMonthlyProfit"
            type="number"
            defaultValue={settings.targetMonthlyProfit}
            className="input"
          />
        </Field>
        <Field label="Reserva por merma no registrada %">
          <input
            name="operationalWastePercentage"
            type="number"
            min="0"
            max="20"
            step="0.1"
            defaultValue={settings.operationalWastePercentage}
            className="input"
          />
          <span className="mt-1 block text-[10px] font-normal leading-4 text-[#777]">
            Se descuenta de la venta bruta proyectada para cubrir pérdidas que
            no se pesan ni registran. No reemplaza la merma de recetas.
          </span>
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
  reloadOnSuccess = true,
  onSuccess,
}: {
  action: (form: FormData) => Promise<void>;
  children: React.ReactNode;
  reloadOnSuccess?: boolean;
  onSuccess?: (form: HTMLFormElement) => void;
}) {
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={formRef}
      action={async (formData) => {
        setBusy(true);
        try {
          await action(formData);
          if (reloadOnSuccess) {
            location.reload();
            return;
          }
          if (formRef.current) onSuccess?.(formRef.current);
          setBusy(false);
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
function Submit({
  children,
  disabled = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className="h-12 w-full rounded-xl bg-[#235b45] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#aeb7ae]"
    >
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
function yieldLossLabel(value: NonNullable<Ingredient["yieldLossType"]>) {
  return (
    {
      none: "sin pérdida",
      cleaning: "limpieza / grasa",
      cooking: "reducción por cocción",
      bone_skin: "hueso y piel",
      combined: "limpieza y cocción",
    } as const
  )[value];
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
