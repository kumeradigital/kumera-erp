import { Clock, Receipt, TrendingUp, Wallet } from "lucide-react";
import { formatClp } from "@/shared/money";
import { SalesFilters, type SalesPeriodView } from "./sales-filters";
import { paymentLabels, type PaymentMethod, type SaleSummary } from "./types";

export function SalesDashboard({
  summary,
  recent,
  period,
}: {
  summary: SaleSummary;
  recent: {
    id: string;
    total: number;
    payment: PaymentMethod;
    createdAt: string;
  }[];
  period: SalesPeriodView;
}) {
  return (
    <main className="mx-auto max-w-6xl p-5 md:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
          Ventas
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Resumen de ventas
        </h1>
        <p className="mt-2 text-sm text-[#747970]">{period.label}</p>
      </div>

      <SalesFilters period={period} />

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                <b>
                  {p.saleUnit === "kg"
                    ? `${p.quantity.toLocaleString("es-CL", { maximumFractionDigits: 3 })} kg`
                    : `${p.quantity} un.`}
                </b>
              </div>
            ))}
            {!summary.topProducts.length && <Empty />}
          </div>
        </div>
      </section>
      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-[#e6e5dd] p-5">
          <h2 className="font-black">Últimas ventas del periodo</h2>
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
                {new Date(r.createdAt).toLocaleString("es-CL", {
                  dateStyle: "short",
                  timeStyle: "short",
                  timeZone: "America/Santiago",
                })}{" "}
                · {paymentLabels[r.payment]}
              </p>
            </div>
            <b className="money">{formatClp(r.total)}</b>
          </div>
        ))}
        {!recent.length && <Empty />}
      </section>
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
    <p className="py-8 text-center text-sm text-[#888]">
      Sin ventas en este periodo
    </p>
  );
}
