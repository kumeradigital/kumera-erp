"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, Search, Sparkles } from "lucide-react";
import type { ProductionPlanning, ProductionPlanningProduct } from "./types";

const weekdayNames = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function chileToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function tomorrowWeekday() {
  const [year, month, day] = chileToday().split("-").map(Number);
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 12)).getUTCDay();
  return tomorrow === 1 ? 2 : tomorrow;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percentile(values: number[], value: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((sorted.length - 1) * value)];
}

function roundedSuggestion(value: number, unit: "unit" | "kg") {
  if (value <= 0) return 0;
  return unit === "kg" ? Math.ceil(value * 2) / 2 : Math.ceil(value);
}

function quantity(value: number, unit: "unit" | "kg") {
  return `${value.toLocaleString("es-CL", { maximumFractionDigits: unit === "kg" ? 1 : 0 })} ${unit === "kg" ? "kg" : "un."}`;
}

function trendFor(product: ProductionPlanningProduct, dates: string[]) {
  const values = dates
    .filter((date) => date >= product.firstSaleDate)
    .map((date) => product.dailySales[date] || 0);
  if (values.length < 6) return "Sin tendencia";
  const recent = values.slice(-3);
  const previous = values.slice(-6, -3);
  const recentAverage = recent.reduce((sum, item) => sum + item, 0) / 3;
  const previousAverage = previous.reduce((sum, item) => sum + item, 0) / 3;
  if (!previousAverage) return recentAverage > 0 ? "Subiendo" : "Estable";
  const difference = (recentAverage - previousAverage) / previousAverage;
  if (difference > 0.12) return "Subiendo";
  if (difference < -0.12) return "Bajando";
  return "Estable";
}

export function ProductionPlanningPanel({
  planning,
}: {
  planning: ProductionPlanning;
}) {
  const [weekday, setWeekday] = useState(tomorrowWeekday);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const dates = planning.days.map((day) => day.date);
  const categories = useMemo(
    () => [...new Set(planning.products.map((item) => item.category))].sort(),
    [planning.products],
  );
  const rows = useMemo(
    () =>
      planning.products
        .filter(
          (product) =>
            (category === "all" || product.category === category) &&
            (!search.trim() ||
              product.name
                .toLocaleLowerCase("es")
                .includes(search.trim().toLocaleLowerCase("es"))),
        )
        .map((product) => {
          const comparableDates = planning.days
            .filter(
              (day) =>
                day.weekday === weekday && day.date >= product.firstSaleDate,
            )
            .map((day) => day.date);
          const allProductDates = planning.days
            .filter((day) => day.date >= product.firstSaleDate)
            .map((day) => day.date);
          const comparableValues = comparableDates.map(
            (date) => product.dailySales[date] || 0,
          );
          const evidenceDates = comparableDates.length
            ? comparableDates
            : allProductDates;
          const fallback = comparableValues.length
            ? comparableValues
            : allProductDates.map((date) => product.dailySales[date] || 0);
          const average = fallback.length
            ? fallback.reduce((sum, value) => sum + value, 0) / fallback.length
            : 0;
          const typical = median(fallback);
          const upper = percentile(fallback, 0.75);
          const wasteDates = evidenceDates.filter(
            (date) => product.dailyWaste[date] != null,
          );
          const wasteAverage = wasteDates.length
            ? wasteDates.reduce(
                (sum, date) => sum + (product.dailyWaste[date] || 0),
                0,
              ) / wasteDates.length
            : 0;
          return {
            product,
            samples: comparableValues.length,
            average,
            maximum: fallback.length ? Math.max(...fallback) : 0,
            suggestionLow: roundedSuggestion(
              typical || average,
              product.saleUnit,
            ),
            suggestionHigh: roundedSuggestion(
              Math.max(typical, upper, average),
              product.saleUnit,
            ),
            wasteAverage,
            trend: trendFor(product, dates),
          };
        })
        .filter((row) => row.average > 0 || row.maximum > 0)
        .sort((a, b) => b.average - a.average),
    [category, dates, planning.days, planning.products, search, weekday],
  );
  const groupedRows = useMemo(
    () =>
      categories
        .map((categoryName) => ({
          category: categoryName,
          rows: rows.filter((row) => row.product.category === categoryName),
        }))
        .filter((group) => group.rows.length > 0),
    [categories, rows],
  );

  return (
    <section className="mt-6">
      <div className="rounded-2xl border border-[#cbdcc6] bg-[#edf4e9] p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 shrink-0 text-[#235b45]" size={21} />
          <div>
            <h2 className="font-black text-[#235b45]">
              Sugerencia basada en ventas reales
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#647064]">
              Usa jornadas cerradas desde el 1 de octubre. Los días abiertos en
              que un producto no se vendió cuentan como cero. Es una guía de
              demanda, no una orden automática de producción. Las ventas
              antiguas registradas sólo como “Dulce” se excluyen porque no
              identifican la variedad vendida.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <PlanningStat
            label="Jornadas observadas"
            value={planning.days.length}
          />
          <PlanningStat
            label="Productos con detalle"
            value={planning.products.length}
          />
          <PlanningStat
            label="Datos hasta"
            value={
              planning.lastObservedDate
                ? formatDate(planning.lastObservedDate)
                : "—"
            }
          />
        </div>
      </div>

      <div className="card mt-4 p-4">
        <div className="flex items-center gap-2 text-[#235b45]">
          <CalendarRange size={18} />
          <b>¿Qué día quieres planificar?</b>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {weekdayNames.map((name, index) =>
            index === 1 ? null : (
              <button
                type="button"
                key={name}
                onClick={() => setWeekday(index)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-black ${weekday === index ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-white text-[#62675f]"}`}
              >
                {name}
              </button>
            ),
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto"
              className="input pl-10"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="input"
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="border-b border-[#e6e5dd] p-5">
          <h2 className="font-black">
            Plan para el {weekdayNames[weekday].toLowerCase()}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#777]">
            “Típico” es la mediana y evita que un día extraordinario distorsione
            la recomendación. El rango sugerido llega hasta el percentil 75.
          </p>
        </div>
        <div className="divide-y divide-[#e6e5dd]">
          {groupedRows.map((group) => (
            <details key={group.category} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-[#f7f6ef] px-5 py-4 marker:hidden hover:bg-[#f2f2ea] [&::-webkit-details-marker]:hidden">
                <div>
                  <h3 className="font-black text-[#235b45]">
                    {group.category}
                  </h3>
                  <p className="mt-1 text-xs text-[#777]">
                    {group.rows.length}{" "}
                    {group.rows.length === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <ChevronDown
                  size={20}
                  className="shrink-0 text-[#235b45] transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-[#f2f2ea] text-[10px] uppercase text-[#777]">
                    <tr>
                      <th className="px-5 py-3">Producto</th>
                      <th className="px-5 py-3">Evidencia</th>
                      <th className="px-5 py-3">Promedio</th>
                      <th className="px-5 py-3">Máximo</th>
                      <th className="px-5 py-3">Tendencia</th>
                      <th className="px-5 py-3">Merma prom.</th>
                      <th className="px-5 py-3 text-right">Sugerencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr
                        key={row.product.id}
                        className="border-t border-[#eeede6]"
                      >
                        <td className="px-5 py-3 font-bold">
                          {row.product.name}
                        </td>
                        <td className="px-5 py-3">
                          <b>{row.samples}</b>{" "}
                          {row.samples === 1 ? "día" : "días"}
                          {row.samples < 2 && (
                            <p className="mt-1 text-[10px] font-bold text-[#9a5c17]">
                              Muy preliminar
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {quantity(row.average, row.product.saleUnit)}
                        </td>
                        <td className="px-5 py-3">
                          {quantity(row.maximum, row.product.saleUnit)}
                        </td>
                        <td className="px-5 py-3">{row.trend}</td>
                        <td className="px-5 py-3">
                          {row.wasteAverage > 0
                            ? quantity(row.wasteAverage, row.product.saleUnit)
                            : "—"}
                        </td>
                        <td className="px-5 py-3 text-right font-black text-[#235b45]">
                          {quantity(row.suggestionLow, row.product.saleUnit)}
                          {row.suggestionHigh > row.suggestionLow &&
                            `–${quantity(row.suggestionHigh, row.product.saleUnit)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-[#777]">
            Todavía no hay ventas detalladas suficientes para este filtro.
          </p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#777]">
        En Pan, los kilos vendidos corresponden a la familia completa registrada
        en caja y la merma sólo corresponde al pan propio pesado al cierre. Por
        ahora, la sugerencia de Pan representa demanda total en kilos: como la
        caja no distingue la marraqueta dentro de esa venta, no debe leerse como
        kilos exactos de pan propio a fabricar.
      </p>
    </section>
  );
}

function PlanningStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#777]">
        {label}
      </p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}
