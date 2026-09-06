"use client";

import { useMemo, useState } from "react";
import { Check, Search, Warehouse } from "lucide-react";
import { saveInventoryAction } from "./actions";
import type { InventoryItem, InventoryUnit } from "./types";

function allowedUnits(item: InventoryItem): InventoryUnit[] {
  if (item.baseUnit === "g") return ["kg", "g"];
  if (item.baseUnit === "ml") return ["l", "ml"];
  return ["unit"];
}

const unitLabels: Record<InventoryUnit, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "litros",
  unit: "unidades",
};

export function InventoryClient({ items }: { items: InventoryItem[] }) {
  const [values, setValues] = useState(
    () =>
      Object.fromEntries(
        items.map((item) => [
          item.id,
          { quantity: item.quantity?.toString() || "", unit: item.unit },
        ]),
      ) as Record<string, { quantity: string; unit: InventoryUnit }>,
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const categories = [
    "Todas",
    ...new Set(items.map((item) => item.category).sort()),
  ];
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return items.filter(
      (item) =>
        (category === "Todas" || item.category === category) &&
        (!term || item.name.toLocaleLowerCase("es").includes(term)),
    );
  }, [category, items, search]);

  async function save() {
    setBusy(true);
    setSaved(false);
    try {
      const result = await saveInventoryAction(
        items.map((item) => ({
          ingredientId: item.id,
          quantity:
            values[item.id].quantity === ""
              ? null
              : Number(values[item.id].quantity),
          unit: values[item.id].unit,
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#687467]">
            Control manual
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Inventario</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#747970]">
            Anota cuánto tienes actualmente de cada materia prima. Las ventas,
            recetas y compras no modificarán estas cantidades automáticamente.
          </p>
        </div>
        <button
          onClick={save}
          disabled={busy || !dirty}
          className="flex h-12 items-center gap-2 rounded-xl bg-[#235b45] px-5 text-sm font-black text-white disabled:opacity-45"
        >
          <Check size={17} />
          {busy ? "Guardando…" : saved ? "Guardado" : "Guardar inventario"}
        </button>
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

      <section className="card mt-4 overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,1fr)_170px_150px] gap-3 border-b bg-[#f0f1e8] px-5 py-3 text-[11px] font-black uppercase tracking-wider text-[#6f746c] md:grid">
          <span>Materia prima</span>
          <span>Cantidad actual</span>
          <span>Unidad</span>
        </div>
        {visible.length ? (
          visible.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 border-b border-[#e8e8df] px-4 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_170px_150px] md:items-center md:px-5"
            >
              <div className="min-w-0">
                <p className="truncate font-black">{item.name}</p>
                <p className="mt-1 text-xs text-[#777]">{item.category}</p>
              </div>
              <label className="text-[10px] font-black uppercase text-[#777] md:text-transparent">
                Cantidad actual
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  inputMode="decimal"
                  value={values[item.id].quantity}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      [item.id]: {
                        ...current[item.id],
                        quantity: event.target.value,
                      },
                    }));
                    setDirty(true);
                    setSaved(false);
                  }}
                  className="input mt-1 text-base font-black text-[#252824] md:mt-0"
                  placeholder="Sin contar"
                />
              </label>
              <label className="text-[10px] font-black uppercase text-[#777] md:text-transparent">
                Unidad
                <select
                  value={values[item.id].unit}
                  onChange={(event) => {
                    setValues((current) => ({
                      ...current,
                      [item.id]: {
                        ...current[item.id],
                        unit: event.target.value as InventoryUnit,
                      },
                    }));
                    setDirty(true);
                    setSaved(false);
                  }}
                  className="input mt-1 text-[#252824] md:mt-0"
                >
                  {allowedUnits(item).map((unit) => (
                    <option key={unit} value={unit}>
                      {unitLabels[unit]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-sm text-[#777]">
            No hay materias primas que coincidan con la búsqueda.
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center gap-2 text-xs text-[#747970]">
        <Warehouse size={16} /> {items.length} materias primas ordenadas
        alfabéticamente
      </div>
    </main>
  );
}
