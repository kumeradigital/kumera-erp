"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Receipt,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import { closeCashSessionAction } from "./actions";
import {
  paymentLabels,
  type CashSession,
  type PaymentMethod,
  type SaleSummary,
} from "./types";
export function SalesDashboard({
  session,
  summary,
  recent,
}: {
  session: CashSession | null;
  summary: SaleSummary;
  recent: {
    id: string;
    total: number;
    payment: PaymentMethod;
    createdAt: string;
  }[];
}) {
  const [closing, setClosing] = useState(false);
  const cashSales =
    summary.byPayment.find((p) => p.method === "cash")?.total || 0;
  const expectedCash = (session?.openingCash || 0) + cashSales;
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Ventas
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Resumen de la jornada
          </h1>
          <p className="mt-2 text-sm text-[#747970]">
            {session
              ? `${session.status === "open" ? "Caja abierta" : "Última caja cerrada"} · ${new Date(session.openedAt).toLocaleString("es-CL")}`
              : "Todavía no hay jornadas"}
          </p>
        </div>
        {session?.status === "open" ? (
          <div className="flex gap-2">
            <Link
              href="/caja"
              className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-bold text-white"
            >
              Ir a vender <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => setClosing(true)}
              className="rounded-xl border border-[#d7d7ce] bg-white px-4 py-3 text-sm font-bold"
            >
              Cerrar caja
            </button>
          </div>
        ) : (
          <Link
            href="/caja"
            className="rounded-xl bg-[#235b45] px-4 py-3 text-sm font-bold text-white"
          >
            Abrir nueva jornada
          </Link>
        )}
      </div>
      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Ventas"
          value={formatClp(summary.total)}
          icon={<TrendingUp />}
        />
        <Stat
          label="Transacciones"
          value={String(summary.count)}
          icon={<Receipt />}
        />
        <Stat
          label="Ticket promedio"
          value={formatClp(summary.average)}
          icon={<Wallet />}
        />
        <Stat
          label="Pago predominante"
          value={
            summary.byPayment[0]
              ? paymentLabels[summary.byPayment[0].method]
              : "—"
          }
          icon={<Clock />}
        />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-black">Medios de pago</h2>
          <div className="mt-5 space-y-3">
            {summary.byPayment.map((p) => (
              <div
                key={p.method}
                className="flex items-center justify-between rounded-xl bg-[#f2f2ea] p-4"
              >
                <span className="text-sm font-bold">
                  {paymentLabels[p.method]}
                </span>
                <b className="money">{formatClp(p.total)}</b>
              </div>
            ))}
            {!summary.byPayment.length && <Empty />}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-black">Productos más vendidos</h2>
          <div className="mt-5 space-y-3">
            {summary.topProducts.slice(0, 6).map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-[#d8f070] text-xs font-black">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-bold">{p.name}</span>
                <b>{p.quantity} un.</b>
              </div>
            ))}
            {!summary.topProducts.length && <Empty />}
          </div>
        </div>
      </section>
      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-[#e6e5dd] p-5">
          <h2 className="font-black">Últimas ventas</h2>
        </div>
        {recent.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between border-b border-[#eeede6] px-5 py-4 last:border-0"
          >
            <div>
              <p className="text-sm font-bold">
                Venta #{r.id.slice(0, 6).toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-[#777]">
                {new Date(r.createdAt).toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {paymentLabels[r.payment]}
              </p>
            </div>
            <b className="money">{formatClp(r.total)}</b>
          </div>
        ))}
        {!recent.length && <Empty />}
      </section>
      {closing && session && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
          <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-md md:rounded-3xl">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
                  Fin de jornada
                </p>
                <h2 className="mt-1 text-2xl font-black">Cerrar caja</h2>
              </div>
              <button onClick={() => setClosing(false)}>
                <X />
              </button>
            </div>
            <div className="mt-5 rounded-xl bg-[#eff0e8] p-4">
              <div className="flex justify-between text-sm">
                <span>Efectivo esperado</span>
                <b className="money">{formatClp(expectedCash)}</b>
              </div>
              <p className="mt-1 text-[11px] text-[#777]">
                Inicial + ventas en efectivo
              </p>
            </div>
            <form
              action={async (form) => {
                await closeCashSessionAction(
                  session.id,
                  Number(form.get("countedCash")),
                  String(form.get("note") || ""),
                );
                location.reload();
              }}
              className="mt-5 space-y-4"
            >
              <label className="block text-xs font-bold">
                Efectivo contado
                <input
                  name="countedCash"
                  required
                  inputMode="numeric"
                  defaultValue={expectedCash}
                  className="input mt-2"
                />
              </label>
              <label className="block text-xs font-bold">
                Nota opcional
                <input name="note" className="input mt-2" />
              </label>
              <button className="h-13 w-full rounded-xl bg-[#235b45] font-black text-white">
                Confirmar cierre
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex justify-between text-[#235b45]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7d8179]">
          {label}
        </p>
        {icon}
      </div>
      <p className="money mt-4 text-2xl font-black">{value}</p>
    </div>
  );
}
function Empty() {
  return (
    <p className="py-8 text-center text-sm text-[#888]">Sin ventas todavía</p>
  );
}
