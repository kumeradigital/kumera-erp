"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, History, Pencil, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import { reconcileCashSessionAction } from "./actions";
import type { CashClosure } from "./data";

export function CashClosureHistory({ closures }: { closures: CashClosure[] }) {
  const [selected, setSelected] = useState<CashClosure | null>(null);
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
          Administración
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Historial de cierres
        </h1>
        <p className="mt-2 text-sm text-[#747970]">
          Revisa el efectivo esperado, el conteo real y las correcciones de cada
          jornada.
        </p>
      </div>

      <div className="mt-7 space-y-3">
        {closures.map((closure) => (
          <article key={closure.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-black">
                    Jornada del{" "}
                    {new Date(closure.openedAt).toLocaleDateString("es-CL", {
                      timeZone: "America/Santiago",
                    })}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${closure.autoClosed ? "bg-[#fff1c7] text-[#795f0d]" : "bg-[#e6f1e9] text-[#235b45]"}`}
                  >
                    {closure.autoClosed ? "Cierre automático" : "Cierre manual"}
                  </span>
                  {closure.countedCash == null && (
                    <span className="flex items-center gap-1 rounded-full bg-[#f7dfd7] px-2.5 py-1 text-[10px] font-bold text-[#9a3f22]">
                      <AlertTriangle size={11} /> Pendiente
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#777]">
                  Abierta {formatDate(closure.openedAt)} · Cerrada{" "}
                  {formatDate(closure.closedAt)}
                </p>
              </div>
              <button
                onClick={() => setSelected(closure)}
                className="flex items-center gap-2 rounded-xl border border-[#d7d7ce] bg-white px-4 py-2.5 text-xs font-bold"
              >
                <Pencil size={14} />{" "}
                {closure.countedCash == null
                  ? "Completar cierre"
                  : "Corregir conteo"}
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Amount label="Efectivo inicial" value={closure.openingCash} />
              <Amount label="Ventas en efectivo" value={closure.cashSales} />
              <Amount
                label="Efectivo esperado"
                value={closure.expectedCash}
                strong
              />
              <Amount label="Efectivo contado" value={closure.countedCash} />
              <Amount
                label="Diferencia"
                value={closure.difference}
                difference
              />
            </div>
            {closure.reconciliation && (
              <details className="mt-4 rounded-xl bg-[#f2f2ea] p-4">
                <summary className="cursor-pointer text-xs font-bold text-[#235b45]">
                  Ver totales conciliados y mermas
                </summary>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  {(
                    Object.entries(closure.reconciliation.byPayment) as [
                      keyof typeof closure.reconciliation.byPayment,
                      number,
                    ][]
                  ).map(([method, total]) => (
                    <div
                      key={method}
                      className="flex justify-between rounded-lg bg-white p-3"
                    >
                      <span>
                        {
                          {
                            cash: "Efectivo",
                            debit: "Débito",
                            credit: "Crédito",
                            transfer: "Transferencia",
                          }[method]
                        }
                      </span>
                      <b>{formatClp(total)}</b>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[#666]">
                  {closure.reconciliation.reason}
                </p>
                {closure.waste.length > 0 && (
                  <div className="mt-4 border-t border-[#deddd4] pt-3">
                    <b className="text-xs">Mermas</b>
                    {closure.waste.map((item, index) => (
                      <p key={`${item.name}-${index}`} className="mt-2 text-xs">
                        {item.name}:{" "}
                        <b>
                          {item.quantity.toLocaleString("es-CL", {
                            maximumFractionDigits: 3,
                          })}{" "}
                          {item.saleUnit === "kg" ? "kg" : "un."}
                        </b>
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </details>
            )}
            {closure.adjustments.length > 0 && (
              <details className="mt-4 border-t border-[#ebeae2] pt-3">
                <summary className="cursor-pointer text-xs font-bold text-[#235b45]">
                  Ver {closure.adjustments.length}{" "}
                  {closure.adjustments.length === 1
                    ? "corrección"
                    : "correcciones"}
                </summary>
                <div className="mt-3 space-y-2">
                  {closure.adjustments.map((item, index) => (
                    <div
                      key={`${item.createdAt}-${index}`}
                      className="rounded-xl bg-[#f1f1e9] p-3 text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <span>
                          {item.previous == null
                            ? "Sin conteo"
                            : formatClp(item.previous)}{" "}
                          → <b>{formatClp(item.next)}</b>
                        </span>
                        <span className="text-[#777]">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[#666]">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </article>
        ))}
        {!closures.length && (
          <div className="card p-12 text-center">
            <History className="mx-auto text-[#999]" />
            <p className="mt-3 font-bold">Todavía no hay cierres registrados</p>
          </div>
        )}
      </div>
      {selected && (
        <CorrectionDialog
          closure={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}

function Amount({
  label,
  value,
  strong,
  difference,
}: {
  label: string;
  value: number | null;
  strong?: boolean;
  difference?: boolean;
}) {
  const color =
    difference && value != null
      ? value < 0
        ? "text-[#a24628]"
        : value > 0
          ? "text-[#235b45]"
          : ""
      : "";
  return (
    <div
      className={`rounded-xl p-3 ${strong ? "bg-[#e8f0e6]" : "bg-[#f2f2ea]"}`}
    >
      <p className="text-[10px] font-bold uppercase text-[#7b8077]">{label}</p>
      <p className={`money mt-2 font-black ${color}`}>
        {value == null ? "Pendiente" : formatClp(value)}
      </p>
    </div>
  );
}

function CorrectionDialog({
  closure,
  onClose,
}: {
  closure: CashClosure;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-md md:rounded-3xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Historial de cierres
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {closure.countedCash == null
                ? "Completar cierre"
                : "Corregir conteo"}
            </h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-5 rounded-xl bg-[#eff0e8] p-4 text-sm">
          <div className="flex justify-between">
            <span>Efectivo esperado</span>
            <b>{formatClp(closure.expectedCash)}</b>
          </div>
          {closure.countedCash != null && (
            <div className="mt-2 flex justify-between">
              <span>Conteo actual</span>
              <b>{formatClp(closure.countedCash)}</b>
            </div>
          )}
        </div>
        <form
          action={async (form) => {
            setBusy(true);
            try {
              await reconcileCashSessionAction(
                closure.id,
                Number(form.get("countedCash")),
                String(form.get("reason") || ""),
              );
              location.reload();
            } catch (error) {
              alert(
                error instanceof Error ? error.message : "No se pudo guardar",
              );
              setBusy(false);
            }
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Efectivo real contado
            <input
              name="countedCash"
              required
              inputMode="numeric"
              defaultValue={closure.countedCash ?? ""}
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Motivo de la corrección *
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={300}
              className="input mt-2 min-h-20 py-3"
              placeholder="Ej: Conteo realizado al día siguiente"
            />
          </label>
          <button
            disabled={busy}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#235b45] font-black text-white disabled:opacity-50"
          >
            <CheckCircle2 size={17} />{" "}
            {busy ? "Guardando..." : "Guardar corrección"}
          </button>
        </form>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Santiago",
  });
}
