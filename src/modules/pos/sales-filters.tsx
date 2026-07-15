"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

export type SalesPeriodView = {
  mode: "today" | "day" | "month" | "range";
  label: string;
  date: string;
  month: string;
  from: string;
  to: string;
};

export function SalesFilters({ period }: { period: SalesPeriodView }) {
  const [mode, setMode] = useState(period.mode);
  return (
    <form className="card mt-6 p-4" method="get">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-48 flex-1 text-xs font-bold">
          Periodo
          <select
            name="period"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as SalesPeriodView["mode"])
            }
            className="input mt-2"
          >
            <option value="today">Día en curso</option>
            <option value="day">Un día</option>
            <option value="month">Un mes</option>
            <option value="range">Rango de días</option>
          </select>
        </label>
        {mode === "day" && (
          <label className="min-w-48 flex-1 text-xs font-bold">
            Día
            <input
              name="date"
              type="date"
              defaultValue={period.date}
              className="input mt-2"
            />
          </label>
        )}
        {mode === "month" && (
          <label className="min-w-48 flex-1 text-xs font-bold">
            Mes
            <input
              name="month"
              type="month"
              defaultValue={period.month}
              className="input mt-2"
            />
          </label>
        )}
        {mode === "range" && (
          <>
            <label className="min-w-44 flex-1 text-xs font-bold">
              Desde
              <input
                name="from"
                type="date"
                defaultValue={period.from}
                className="input mt-2"
              />
            </label>
            <label className="min-w-44 flex-1 text-xs font-bold">
              Hasta
              <input
                name="to"
                type="date"
                defaultValue={period.to}
                className="input mt-2"
              />
            </label>
          </>
        )}
        <button className="flex h-11 items-center gap-2 rounded-xl bg-[#235b45] px-5 text-sm font-bold text-white">
          <CalendarDays size={16} /> Mostrar
        </button>
      </div>
    </form>
  );
}
