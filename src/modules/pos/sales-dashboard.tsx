import {
  BarChart3,
  Clock,
  CreditCard,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
  const peakHour = [...summary.hourlySales].sort(
    (a, b) => b.total - a.total,
  )[0];
  const maxHourlySales = Math.max(
    1,
    ...summary.hourlySales.map((item) => item.total),
  );

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

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
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
        <Stat
          label="Comisiones tarjetas"
          value={formatClp(summary.commissionTotal)}
          icon={<CreditCard />}
        />
        <Stat
          label="Ingreso después de comisión"
          value={formatClp(summary.netReceivable)}
          icon={<Wallet />}
        />
      </section>
      {summary.commissionTotal > 0 && (
        <p className="mt-3 text-xs text-[#70756d]">
          Las comisiones incluyen {formatClp(summary.commissionNet)} netos y{" "}
          {formatClp(summary.commissionTax)} de IVA crédito estimado.
        </p>
      )}
      {summary.unallocatedDifference !== 0 && (
        <div className="mt-4 rounded-xl border border-[#e7d8a5] bg-[#fff8dc] p-4 text-sm text-[#6f5b17]">
          <b>
            {formatClp(summary.unallocatedDifference)} conciliados sin desglose
            de producto.
          </b>{" "}
          El total de medios de pago fue corregido con los comprobantes del
          cierre; el detalle de productos conserva solo lo registrado en caja.
        </div>
      )}
      <section className="card mt-4 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#e6e5dd] p-5">
          <div>
            <div className="flex items-center gap-2 text-[#235b45]">
              <BarChart3 size={19} />
              <h2 className="font-black text-[#20231f]">Ventas por horario</h2>
            </div>
            <p className="mt-1 text-xs text-[#777]">
              Compara los tickets registrados según la hora chilena en el
              periodo seleccionado.
            </p>
          </div>
          {peakHour && (
            <div className="rounded-xl bg-[#edf4e9] px-4 py-3 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6f786e]">
                Hora con más ventas
              </p>
              <p className="mt-1 text-lg font-black text-[#235b45]">
                {formatHourRange(peakHour.hour)}
              </p>
              <p className="text-[11px] text-[#6f786e]">
                {formatClp(peakHour.total)} · {peakHour.count}{" "}
                {peakHour.count === 1 ? "ticket" : "tickets"}
              </p>
            </div>
          )}
        </div>
        {summary.hourlySales.length ? (
          <div className="divide-y divide-[#eeede6] px-5">
            {summary.hourlySales.map((item) => (
              <div
                key={item.hour}
                className="grid items-center gap-3 py-3 sm:grid-cols-[100px_minmax(150px,1fr)_110px_110px]"
              >
                <b className="text-sm">{formatHourRange(item.hour)}</b>
                <div className="h-3 overflow-hidden rounded-full bg-[#eceee6]">
                  <div
                    className="h-full min-w-1 rounded-full bg-[#6d925d]"
                    style={{ width: `${(item.total / maxHourlySales) * 100}%` }}
                  />
                </div>
                <div className="text-left sm:text-right">
                  <b className="money text-sm">{formatClp(item.total)}</b>
                  <p className="text-[10px] text-[#777]">
                    {item.count} {item.count === 1 ? "ticket" : "tickets"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] font-bold uppercase text-[#888]">
                    Ticket promedio
                  </p>
                  <b className="money text-sm text-[#235b45]">
                    {formatClp(item.average)}
                  </b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty />
        )}
        {summary.unallocatedDifference !== 0 && (
          <p className="border-t border-[#e6e5dd] bg-[#fafaf5] px-5 py-3 text-[11px] leading-5 text-[#777]">
            Este análisis utiliza solamente los tickets registrados en caja. La
            conciliación manual del cierre no se asigna a una hora porque no
            existe un horario verificable para esa diferencia.
          </p>
        )}
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
          <h2 className="font-black">Detalle de productos vendidos</h2>
          <p className="mt-1 text-xs text-[#777]">
            Todos los productos registrados durante el periodo seleccionado.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[#f2f2ea] text-[10px] uppercase text-[#777]">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Cantidad</th>
                <th className="px-5 py-3 text-right">Venta registrada</th>
              </tr>
            </thead>
            <tbody>
              {summary.topProducts.map((product) => (
                <tr key={product.name} className="border-t border-[#eeede6]">
                  <td className="px-5 py-3 font-bold">{product.name}</td>
                  <td className="px-5 py-3">
                    {product.saleUnit === "kg"
                      ? `${product.quantity.toLocaleString("es-CL", { maximumFractionDigits: 3 })} kg`
                      : `${product.quantity} un.`}
                  </td>
                  <td className="money px-5 py-3 text-right font-bold">
                    {formatClp(product.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!summary.topProducts.length && <Empty />}
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

function formatHourRange(hour: number) {
  const next = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00–${String(next).padStart(2, "0")}:00`;
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
