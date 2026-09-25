"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import {
  archiveInventoryItemAction,
  createInventoryProviderAction,
  createInventorySupplyAction,
  saveInventoryAction,
} from "./actions";
import type { InventoryItem, InventorySupplier } from "./types";

type InventoryValue = {
  quantity: number | null;
  minimumQuantity: number;
  supplier: InventorySupplier | null;
};

const supplyCategories = [
  "Aseo",
  "Embalaje",
  "Papelería",
  "Mantención",
  "Otros",
] as const;

export function InventoryClient({
  items,
  providers,
}: {
  items: InventoryItem[];
  providers: string[];
}) {
  const [catalogItems, setCatalogItems] = useState(items);
  const [providerOptions, setProviderOptions] = useState(providers);
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          {
            quantity: item.quantity ?? null,
            minimumQuantity: item.minimumQuantity,
            supplier: item.supplier ?? null,
          },
        ]),
      ) as Record<string, InventoryValue>,
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSupply, setNewSupply] = useState({
    name: "",
    category: "Aseo",
    quantity: "0",
    minimumQuantity: "0",
    supplier: "" as InventorySupplier | "",
  });
  const categories = [
    "Todas",
    ...new Set(catalogItems.map((item) => item.category).sort()),
  ];

  const groupedItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    const visible = catalogItems.filter(
      (item) =>
        (category === "Todas" || item.category === category) &&
        (!term || item.name.toLocaleLowerCase("es").includes(term)),
    );

    return [...providerOptions, "Sin proveedor"]
      .map((supplier) => ({
        supplier,
        items: visible
          .filter(
            (item) =>
              (values[item.id].supplier ?? "Sin proveedor") === supplier,
          )
          .sort((a, b) =>
            a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
          ),
      }))
      .filter((group) => group.items.length > 0);
  }, [catalogItems, category, providerOptions, search, values]);

  const shoppingGroups = useMemo(
    () =>
      [...providerOptions, "Sin proveedor"]
        .map((supplier) => ({
          supplier,
          items: catalogItems
            .filter((item) => {
              const value = values[item.id];
              return (
                (value.supplier ?? "Sin proveedor") === supplier &&
                (value.quantity ?? 0) < value.minimumQuantity
              );
            })
            .map((item) => ({
              ...item,
              current: values[item.id].quantity ?? 0,
              minimum: values[item.id].minimumQuantity,
              missing:
                values[item.id].minimumQuantity -
                (values[item.id].quantity ?? 0),
            }))
            .sort((a, b) =>
              a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
            ),
        }))
        .filter((group) => group.items.length > 0),
    [catalogItems, providerOptions, values],
  );

  const shoppingItemCount = shoppingGroups.reduce(
    (total, group) => total + group.items.length,
    0,
  );

  function updateItem(id: string, change: Partial<InventoryValue>) {
    setValues((current) => ({
      ...current,
      [id]: { ...current[id], ...change },
    }));
    setDirty(true);
    setSaved(false);
  }

  function adjustQuantity(id: string, difference: number) {
    const current = values[id].quantity;
    updateItem(id, {
      quantity: Math.max(0, (current ?? (difference > 0 ? 0 : 1)) + difference),
    });
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const result = await saveInventoryAction(
        catalogItems.map((item) => ({
          ingredientId: item.id,
          kind: item.kind,
          quantity: values[item.id].quantity,
          minimumQuantity: values[item.id].minimumQuantity,
          supplier: values[item.id].supplier,
        })),
      );
      if (!result.ok) throw new Error(result.error);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el inventario",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createSupply() {
    setCreating(true);
    try {
      const result = await createInventorySupplyAction({
        name: newSupply.name,
        category: newSupply.category,
        quantity: Number(newSupply.quantity),
        minimumQuantity: Number(newSupply.minimumQuantity),
        supplier: newSupply.supplier || null,
      });
      if (!result.ok) throw new Error(result.error);
      setCatalogItems((current) => [...current, result.item]);
      setValues((current) => ({
        ...current,
        [result.item.id]: {
          quantity: result.item.quantity ?? 0,
          minimumQuantity: result.item.minimumQuantity,
          supplier: result.item.supplier ?? null,
        },
      }));
      setNewSupply({
        name: "",
        category: "Aseo",
        quantity: "0",
        minimumQuantity: "0",
        supplier: "",
      });
      setCreating(false);
      setShowCreate(false);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "No se pudo crear el insumo",
      );
      setCreating(false);
    }
  }

  async function addProvider() {
    const value = window.prompt("Nombre del nuevo proveedor");
    if (!value?.trim()) return;
    const result = await createInventoryProviderAction(value);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setProviderOptions((current) =>
      [...new Set([...current, result.name])].sort((a, b) =>
        a.localeCompare(b, "es", { sensitivity: "base" }),
      ),
    );
    setNewSupply((current) => ({ ...current, supplier: result.name }));
  }

  async function archiveItem(item: InventoryItem) {
    if (
      !window.confirm(
        `¿Quitar ${item.name} del inventario?${
          item.kind === "ingredient"
            ? " Seguirá disponible en las recetas y costos."
            : " Quedará archivado."
        }`,
      )
    ) {
      return;
    }
    const result = await archiveInventoryItemAction({
      id: item.id,
      kind: item.kind,
    });
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setCatalogItems((current) => current.filter(({ id }) => id !== item.id));
    setValues((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#687467]">
            Control manual
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Inventario</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#747970]">
            Revisa el stock y ajústalo con los botones. Nada se descuenta
            automáticamente por ventas, recetas o compras.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowShoppingList(true)}
            className="flex h-12 items-center gap-2 rounded-xl border border-[#235b45] bg-[#edf2e9] px-5 text-sm font-black text-[#235b45]"
          >
            <ShoppingCart size={17} /> Lista de compras
            {shoppingItemCount > 0 && (
              <span className="grid min-w-6 place-items-center rounded-full bg-[#235b45] px-1.5 py-0.5 text-xs text-white">
                {shoppingItemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-12 items-center gap-2 rounded-xl border border-[#235b45] bg-white px-5 text-sm font-black text-[#235b45]"
          >
            <Plus size={17} /> Nuevo insumo
          </button>
          <button
            onClick={addProvider}
            className="flex h-12 items-center gap-2 rounded-xl border border-[#235b45] bg-white px-5 text-sm font-black text-[#235b45]"
          >
            <Plus size={17} /> Proveedor
          </button>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="flex h-12 items-center gap-2 rounded-xl bg-[#235b45] px-5 text-sm font-black text-white disabled:opacity-45"
          >
            <Check size={17} />
            {busy ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
          </button>
        </div>
      </div>

      <div className="card mt-7 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
          <label className="relative">
            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input pl-11"
              placeholder="Buscar materia prima"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="input"
            aria-label="Filtrar por categoría"
          >
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        {groupedItems.length ? (
          groupedItems.map((group) => (
            <section key={group.supplier} className="card overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b bg-[#edf2e9] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-[#235b45]" />
                  <h2 className="font-black">{group.supplier}</h2>
                </div>
                <span className="text-xs font-bold text-[#687467]">
                  {group.items.length} productos
                </span>
              </header>

              {group.items.map((item) => {
                const value = values[item.id];
                return (
                  <div
                    key={item.id}
                    className="grid gap-4 border-b border-[#e8e8df] px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_210px_200px_150px_44px] md:items-center md:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black">{item.name}</p>
                      <p className="mt-1 text-xs text-[#777]">
                        {item.category} ·{" "}
                        {item.kind === "supply" ? "Insumo" : "Materia prima"}
                      </p>
                    </div>

                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-[#777] md:hidden">
                        Proveedor
                      </span>
                      <select
                        value={value.supplier ?? ""}
                        onChange={(event) =>
                          updateItem(item.id, {
                            supplier: event.target.value
                              ? (event.target.value as InventorySupplier)
                              : null,
                          })
                        }
                        className="input h-11 text-sm"
                        aria-label={`Proveedor de ${item.name}`}
                      >
                        <option value="">Sin proveedor</option>
                        {providerOptions.map((supplier) => (
                          <option key={supplier} value={supplier}>
                            {supplier}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="flex items-center justify-between gap-3 md:justify-end">
                      <div className="min-w-20 rounded-xl bg-[#f0f1e8] px-3 py-2 text-center">
                        <p className="text-[9px] font-black uppercase tracking-wide text-[#777]">
                          Stock
                        </p>
                        <p className="text-xl font-black text-[#235b45]">
                          {value.quantity ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, -1)}
                          className="grid size-11 place-items-center rounded-xl border border-[#d7d8cd] bg-white text-[#235b45] disabled:opacity-35"
                          disabled={value.quantity === 0}
                          aria-label={`Restar una unidad de ${item.name}`}
                        >
                          <Minus size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, 1)}
                          className="grid size-11 place-items-center rounded-xl bg-[#235b45] text-white"
                          aria-label={`Sumar una unidad de ${item.name}`}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-[#777]">
                        Stock mínimo
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={value.minimumQuantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            minimumQuantity: Math.max(
                              0,
                              Number.parseInt(event.target.value || "0", 10),
                            ),
                          })
                        }
                        className="input h-11 text-center text-lg font-black text-[#235b45]"
                        aria-label={`Stock mínimo de ${item.name}`}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => archiveItem(item)}
                      className="grid size-11 place-items-center rounded-xl text-[#b94d2d] hover:bg-[#fff0ea]"
                      aria-label={`Quitar ${item.name} del inventario`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </section>
          ))
        ) : (
          <div className="card p-12 text-center text-sm text-[#777]">
            No hay materias primas que coincidan con la búsqueda.
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#747970]">
        <Warehouse size={16} /> {catalogItems.length} artículos agrupados por
        proveedor
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#687467]">
                  Inventario manual
                </p>
                <h2 className="mt-2 text-2xl font-black">Nuevo insumo</h2>
                <p className="mt-1 text-sm text-[#747970]">
                  Para aseo, embalaje, oficina u otros artículos que no forman
                  parte de una receta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-[#f0f1e8]"
                aria-label="Cerrar"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-black">
                Nombre
                <input
                  value={newSupply.name}
                  onChange={(event) =>
                    setNewSupply((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="input mt-2"
                  placeholder="Ej. Lavaloza"
                  autoFocus
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block text-sm font-black">
                  Categoría
                  <select
                    value={newSupply.category}
                    onChange={(event) =>
                      setNewSupply((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="input mt-2"
                  >
                    {supplyCategories.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-black">
                  Stock inicial
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={newSupply.quantity}
                    onChange={(event) =>
                      setNewSupply((current) => ({
                        ...current,
                        quantity: event.target.value,
                      }))
                    }
                    className="input mt-2"
                  />
                </label>
                <label className="block text-sm font-black">
                  Stock mínimo
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={newSupply.minimumQuantity}
                    onChange={(event) =>
                      setNewSupply((current) => ({
                        ...current,
                        minimumQuantity: event.target.value,
                      }))
                    }
                    className="input mt-2"
                  />
                </label>
              </div>
              <label className="block text-sm font-black">
                Proveedor
                <select
                  value={newSupply.supplier}
                  onChange={(event) =>
                    setNewSupply((current) => ({
                      ...current,
                      supplier: event.target.value as InventorySupplier | "",
                    }))
                  }
                  className="input mt-2"
                >
                  <option value="">Sin proveedor</option>
                  {providerOptions.map((supplier) => (
                    <option key={supplier}>{supplier}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addProvider}
                  className="mt-2 text-sm font-black text-[#235b45] underline"
                >
                  + Agregar otro proveedor
                </button>
              </label>
            </div>

            <button
              type="button"
              onClick={createSupply}
              disabled={
                creating ||
                newSupply.name.trim().length < 2 ||
                !newSupply.quantity
              }
              className="mt-6 h-12 w-full rounded-xl bg-[#235b45] font-black text-white disabled:opacity-45"
            >
              {creating ? "Creando…" : "Agregar al inventario"}
            </button>
          </div>
        </div>
      )}

      {showShoppingList && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#e8e8df] pb-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[.18em] text-[#687467]">
                  Reposición de inventario
                </p>
                <h2 className="mt-2 text-2xl font-black">Lista de compras</h2>
                <p className="mt-1 text-sm text-[#747970]">
                  Solo aparecen productos cuyo stock está bajo el mínimo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowShoppingList(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-[#f0f1e8]"
                aria-label="Cerrar lista de compras"
              >
                <X size={22} />
              </button>
            </div>

            {shoppingGroups.length ? (
              <div className="mt-5 space-y-5">
                {shoppingGroups.map((group) => (
                  <section key={group.supplier}>
                    <div className="mb-2 flex items-center gap-2 text-[#235b45]">
                      <Truck size={17} />
                      <h3 className="font-black">{group.supplier}</h3>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[#dfe3d8]">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[#e8e8df] bg-white px-4 py-3 last:border-0"
                        >
                          <div>
                            <p className="font-black">{item.name}</p>
                            <p className="text-xs text-[#747970]">
                              Hay {item.current} · mínimo {item.minimum}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#edf2e9] px-4 py-2 text-right">
                            <p className="text-[9px] font-black uppercase tracking-wide text-[#687467]">
                              Comprar
                            </p>
                            <p className="text-xl font-black text-[#235b45]">
                              {item.missing}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="my-10 rounded-2xl bg-[#edf2e9] px-5 py-10 text-center">
                <Check className="mx-auto text-[#235b45]" size={32} />
                <p className="mt-3 font-black">No falta comprar nada</p>
                <p className="mt-1 text-sm text-[#747970]">
                  Todos los productos están en su mínimo o por encima.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
