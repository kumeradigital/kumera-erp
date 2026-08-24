import {
  BarChart3,
  Clock,
  CreditCard,
  Gauge,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import { SalesFilters, type SalesPeriodView } from "./sales-filters";
import {
  paymentLabels,
  type BusinessPulse,
  type PaymentMethod,
  type SalePaymentMethod,
  type SalesSessionPeriod,
  type SaleSummary,
} from "./types";

export function SalesDashboard({
  summary,
  sessions,
  recent,
  period,
  pulse,
}: {
  summary: SaleSummary;
  sessions: SalesSessionPeriod[];
  recent: {
    id: string;
    total: number;
    payment: SalePaymentMethod;
    createdAt: string;
  }[];
  period: SalesPeriodView;
  pulse: BusinessPulse;
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

      <BusinessPulsePanel pulse={pulse} />

      <section className="card mt-4 overflow-hidden">
        <div className="border-b border-[#e6e5dd] p-5">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[#235b45]" />
            <h2 className="font-black">Jornadas de caja del período</h2>
          </div>
          <p className="mt-1 text-xs text-[#777]">
            Horario real de apertura y cierre de cada caja consultada.
          </p>
        </div>
        {sessions.length ? (
          <div className="divide-y divide-[#eeede6]">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">
                      Caja del {formatSessionDate(session.openedAt)}
                    </b>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${session.status === "open" ? "bg-[#e3f0df] text-[#235b45]" : "bg-[#f0f0e8] text-[#666]"}`}
                    >
                      {session.status === "open"
                        ? "Activa"
                        : session.autoClosed
                          ? "Cierre automático"
                          : "Cerrada"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#777]">
                    Apertura: <b>{formatSessionTime(session.openedAt)}</b>
                    {session.closedAt && (
                      <>
                        {" "}
                        · Cierre: <b>{formatSessionTime(session.closedAt)}</b>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-xs text-[#777] sm:text-right">
                  <p>Efectivo inicial</p>
                  <b className="money text-sm text-[#20231f]">
                    {formatClp(session.openingCash)}
                  </b>
                </div>
                <div className="text-xs text-[#777] sm:min-w-28 sm:text-right">
                  <p>Duración</p>
                  <b className="text-sm text-[#20231f]">
                    {formatSessionDuration(
                      session.openedAt,
                      session.closedAt || new Date().toISOString(),
                    )}
                    {session.status === "open" ? " hasta ahora" : ""}
                  </b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[#888]">
            No hay jornadas iniciadas en este período
          </p>
        )}
      </section>

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
        {summary.byCategory.length > 0 && (
          <div className="border-b border-[#e6e5dd] bg-[#fafaf5] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#777]">
              Totales por categoría
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.byCategory.map((category) => (
                <div
                  key={category.category}
                  className="rounded-xl border border-[#e2e3d9] bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">{category.category}</h3>
                      <p className="mt-1 text-[11px] text-[#777]">
                        {category.productCount}{" "}
                        {category.productCount === 1
                          ? "producto vendido"
                          : "productos vendidos"}
                      </p>
                    </div>
                    <b className="money text-[#235b45]">
                      {formatClp(category.total)}
                    </b>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    {category.unitQuantity > 0 && (
                      <span className="rounded-full bg-[#edf4e9] px-3 py-1.5 text-[#235b45]">
                        {formatQuantity(category.unitQuantity)} un.
                      </span>
                    )}
                    {category.kgQuantity > 0 && (
                      <span className="rounded-full bg-[#edf4e9] px-3 py-1.5 text-[#235b45]">
                        {formatQuantity(category.kgQuantity)} kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-[#f2f2ea] text-[10px] uppercase text-[#777]">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Cantidad</th>
                <th className="px-5 py-3 text-right">Venta registrada</th>
              </tr>
            </thead>
            <tbody>
              {summary.topProducts.map((product) => (
                <tr key={product.name} className="border-t border-[#eeede6]">
                  <td className="px-5 py-3 font-bold">{product.name}</td>
                  <td className="px-5 py-3 text-[#666]">{product.category}</td>
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
                ·{" "}
                {r.payment === "unclassified"
                  ? "Conciliada al cierre"
                  : paymentLabels[r.payment]}
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

function BusinessPulsePanel({ pulse }: { pulse: BusinessPulse }) {
  const hasData = pulse.observedDays > 0;
  return (
    <section className="card mt-4 overflow-hidden border-[#cddbc8]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dce5d8] bg-[#edf4e9] p-5">
        <div>
          <div className="flex items-center gap-2 text-[#235b45]">
            <Gauge size={19} />
            <h2 className="font-black">Pulso del negocio</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#667066]">
            Tendencia preliminar construida únicamente con jornadas cerradas y
            conciliadas.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#55705e]">
          {pulse.observedDays}{" "}
          {pulse.observedDays === 1 ? "jornada" : "jornadas"}
        </span>
      </div>
      {hasData ? (
        <>
          <div className="grid gap-px bg-[#e6e8df] sm:grid-cols-2 xl:grid-cols-4">
            <PulseValue
              label="Ventas observadas"
              value={formatClp(pulse.totalSales)}
              detail={formatObservedRange(pulse)}
            />
            <PulseValue
              label="Promedio diario"
              value={formatClp(pulse.averageDailySales)}
              detail="Por jornada conciliada"
            />
            <PulseValue
              label="Proyección mensual"
              value={formatClp(pulse.projectedMonthlySales)}
              detail={`${pulse.operatingDaysMonth} días abiertos al ritmo actual`}
              accent
            />
            <PulseValue
              label="Resultado mensual estimado"
              value={
                pulse.profitabilityReady
                  ? formatClp(pulse.projectedMonthlyOperatingResult)
                  : "Pendiente"
              }
              detail={
                pulse.profitabilityReady
                  ? `${pulse.costCoveragePercentage.toFixed(0)}% de ventas con costo identificado`
                  : "Aún no hay ventas con costeo completo"
              }
            />
          </div>
          <p className="border-t border-[#e6e5dd] bg-[#fffef9] px-5 py-3 text-[11px] leading-5 text-[#747970]">
            {pulse.profitabilityReady
              ? `Estimación con recetas y precios vigentes: contribución mensual ${formatClp(pulse.projectedMonthlyContribution)} menos costos fijos ${formatClp(pulse.monthlyFixedCosts)}. No descuenta impuesto a la renta ni reemplaza la contabilidad.`
              : "La proyección de ventas todavía no representa utilidad. Completa y vincula los costeos de los productos vendidos para estimarla."}
          </p>
        </>
      ) : (
        <div className="p-6 text-center text-sm text-[#777]">
          El pulso aparecerá después del primer cierre de caja conciliado.
        </div>
      )}
    </section>
  );
}

function PulseValue({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`p-5 ${accent ? "bg-[#f5fadf]" : "bg-[#fffef9]"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#777]">
        {label}
      </p>
      <p
        className={`money mt-2 text-2xl font-black ${accent ? "text-[#235b45]" : "text-[#20231f]"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#777]">{detail}</p>
    </div>
  );
}

function formatObservedRange(pulse: BusinessPulse) {
  if (!pulse.firstObservedAt || !pulse.lastObservedAt) return "Sin período";
  const format = (value: string) =>
    new Date(value).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/Santiago",
    });
  const first = format(pulse.firstObservedAt);
  const last = format(pulse.lastObservedAt);
  return first === last ? first : `${first} al ${last}`;
}

function formatHourRange(hour: number) {
  const next = (hour + 1) % 24;
  return `${String(hour).padStart(2, "0")}:00–${String(next).padStart(2, "0")}:00`;
}

function formatQuantity(value: number) {
  return value.toLocaleString("es-CL", { maximumFractionDigits: 3 });
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

function formatSessionTime(value: string) {
  return new Date(value).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

function formatSessionDuration(from: string, to: string) {
  const minutes = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000),
  );
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} h ${remainder} min` : `${remainder} min`;
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
