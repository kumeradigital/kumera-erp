"use client";
import { useMemo, useState } from "react";
import {
  CircleHelp,
  Landmark,
  Pencil,
  Plus,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  saveFinancialReconciliationAction,
  saveObligationAction,
  saveOperationAction,
  updateOperationAction,
} from "./actions";
import {
  DEFAULT_OPERATION_CATEGORY,
  OPERATION_CATEGORIES_BY_TYPE,
} from "./categories";
import {
  operationLabels,
  type FinancialCutoff,
  type FinancialObligation,
  type Operation,
  type OperationType,
} from "./types";
export function OperationsApp({
  operations,
  ingredients,
  ledger,
  cutoff,
  obligations,
  summary,
}: {
  operations: Operation[];
  ingredients: { id: string; name: string; base_unit: string }[];
  ledger: { status: string; closed_at: string | null } | null;
  cutoff: FinancialCutoff;
  obligations: FinancialObligation[];
  summary: {
    openingBalance: number;
    expectedBank: number;
    expectedCash: number;
    expectedTotal: number;
    salesTotal: number;
    operatingIncome: number;
    operatingExpenses: number;
    cardFees: number;
    withdrawals: number;
    pendingObligations: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [showMobileDashboard, setShowMobileDashboard] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [addingObligation, setAddingObligation] = useState(false);
  const [reconcilingBalances, setReconcilingBalances] = useState(false);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [payingObligation, setPayingObligation] =
    useState<FinancialObligation | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupByType, setGroupByType] = useState(false);
  const currentMonth = todayInChile().slice(0, 7);
  const currentObligations = obligations.filter(
    (item) => item.dueDate.slice(0, 7) <= currentMonth,
  );
  const futureObligations = obligations.filter(
    (item) => item.dueDate.slice(0, 7) > currentMonth,
  );
  const categories = useMemo(
    () => [...new Set(operations.map((item) => item.category))].sort(),
    [operations],
  );
  const visibleOperations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return operations.filter(
      (item) =>
        (typeFilter === "all" || item.type === typeFilter) &&
        (categoryFilter === "all" || item.category === categoryFilter) &&
        (!term ||
          item.description.toLocaleLowerCase("es").includes(term) ||
          item.category.toLocaleLowerCase("es").includes(term) ||
          item.supplier?.toLocaleLowerCase("es").includes(term)),
    );
  }, [operations, search, typeFilter, categoryFilter]);
  const groups = groupByType
    ? Object.entries(
        visibleOperations.reduce(
          (result, item) => {
            (result[item.type] ||= []).push(item);
            return result;
          },
          {} as Partial<Record<OperationType, Operation[]>>,
        ),
      ).filter((group): group is [OperationType, Operation[]] => !!group[1])
    : [];
  return (
    <main className="mx-auto max-w-7xl p-5 md:p-8">
      <section className="md:hidden">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
          Registro en terreno
        </p>
        <h1 className="mt-2 text-3xl font-black">Anotar una compra</h1>
        <p className="mt-2 text-sm leading-6 text-[#676d65]">
          Regístrala apenas pagues. Después podrás actualizar los precios de las
          materias primas usando la factura completa.
        </p>
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="mt-5 flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#235b45] px-5 text-lg font-black text-white shadow-sm"
        >
          <Plus size={22} /> Registrar compra o gasto
        </button>
        <div className="mt-4 rounded-2xl border border-[#d8dfd5] bg-white p-4">
          <p className="text-xs font-black uppercase tracking-[.12em] text-[#6e746c]">
            Últimos registros
          </p>
          <div className="mt-3 divide-y divide-[#e5e5dc]">
            {operations.slice(0, 3).map((operation) => (
              <div
                key={operation.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{operation.description}</p>
                  <p className="mt-1 text-xs text-[#777]">
                    {formatDate(operation.date)} · {operation.category}
                  </p>
                </div>
                <p className="money shrink-0 font-black">
                  {formatClp(operation.gross)}
                </p>
              </div>
            ))}
            {!operations.length && (
              <p className="py-4 text-sm text-[#777]">
                Todavía no hay movimientos registrados.
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowMobileDashboard((value) => !value)}
          className="mt-4 w-full rounded-xl border border-[#bfc8bc] bg-white px-4 py-3 text-sm font-black text-[#235b45]"
        >
          {showMobileDashboard
            ? "Ocultar panel financiero"
            : "Ver panel financiero completo"}
        </button>
      </section>
      <div className={`${showMobileDashboard ? "block" : "hidden"} md:block`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
              Control financiero
            </p>
            <h1 className="mt-2 text-3xl font-black">Finanzas reales</h1>
            <p className="mt-2 text-sm text-[#747970]">
              Saldos esperados desde el último corte conciliado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReconcilingBalances(true)}
              className="flex items-center gap-2 rounded-xl border border-[#235b45] bg-white px-4 py-3 text-sm font-black text-[#235b45]"
            >
              <Landmark size={18} />
              Conciliar saldos reales
            </button>
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 rounded-xl border border-[#bfc8bc] bg-white px-4 py-3 text-sm font-black text-[#235b45]"
            >
              <CircleHelp size={18} />
              ¿Cómo registrar correctamente?
            </button>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-black text-white"
            >
              <Plus size={17} />
              Movimiento
            </button>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-[#bed5b9] bg-[#edf6e9] p-5">
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
            Corte conciliado al {formatDate(cutoff.cutoffDate)}
          </p>
          <p className="mt-2 text-sm text-[#586158]">
            Partimos con {formatClp(cutoff.openingBank)} en banco y{" "}
            {formatClp(cutoff.openingCash)} en efectivo. Los pagos posteriores,
            incluido el impuesto ya pagado, se descuentan sólo cuando están
            verificados.
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric l="Saldo conciliado inicial" v={summary.openingBalance} />
          <Metric l="Banco esperado" v={summary.expectedBank} icon="bank" />
          <Metric l="Efectivo esperado" v={summary.expectedCash} icon="cash" />
          <Metric l="Ventas conciliadas de este mes" v={summary.salesTotal} />
          <Metric
            l="Egresos verificados de este mes"
            v={summary.operatingExpenses}
          />
          <Metric
            l="Compromisos de este mes"
            v={summary.pendingObligations}
            warning
          />
        </div>
        <div className="mt-4 rounded-2xl bg-[#f4f2e9] p-5 text-sm text-[#65685f]">
          <strong className="text-[#252822]">
            Esto controla dinero real, no calcula rentabilidad.
          </strong>{" "}
          La rentabilidad se calcula aparte en Costos con recetas, comisiones y
          costos fijos. Un compromiso pendiente no baja el saldo hasta que se
          paga.
        </div>
        {!!obligations.length && (
          <section className="card mt-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Próximos pagos</h2>
                <p className="mt-1 text-xs text-[#777]">
                  Incluye montos confirmados y recordatorios por calcular.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddingObligation(true)}
                className="flex items-center gap-2 rounded-xl border border-[#235b45] px-3 py-2 text-sm font-black text-[#235b45]"
              >
                <Plus size={16} /> Compromiso
              </button>
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <ObligationGroup
                title="Este mes"
                subtitle="Pagos que todavía corresponden al período actual"
                obligations={currentObligations}
                empty="No quedan compromisos con monto conocido para este mes."
                onPay={setPayingObligation}
                current
              />
              <ObligationGroup
                title="Mes siguiente"
                subtitle="Reservas futuras; todavía no están vencidas"
                obligations={futureObligations}
                empty="No hay compromisos futuros registrados."
                onPay={setPayingObligation}
              />
            </div>
          </section>
        )}
        {!obligations.length && (
          <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <h2 className="font-black">Próximos pagos</h2>
              <p className="mt-1 text-sm text-[#777]">
                No hay compromisos pendientes registrados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddingObligation(true)}
              className="flex items-center gap-2 rounded-xl border border-[#235b45] px-3 py-2 text-sm font-black text-[#235b45]"
            >
              <Plus size={16} /> Compromiso
            </button>
          </section>
        )}
        {ledger?.status !== "closed" && (
          <p className="mt-4 rounded-xl bg-[#fff4d4] p-4 text-sm text-[#795f0d]">
            Cierra primero la Puesta en marcha para fijar oficialmente la
            inversión por recuperar.
          </p>
        )}
        <div className="card mt-6 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_220px_220px_auto]">
            <label className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#777]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar descripción o proveedor"
                className="input pl-10"
              />
            </label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="input"
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos los tipos</option>
              {Object.entries(operationLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input"
              aria-label="Filtrar por categoría"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setGroupByType((value) => !value)}
              className={`rounded-xl border px-4 text-sm font-black ${groupByType ? "border-[#235b45] bg-[#eaf3ea] text-[#235b45]" : "border-[#deded5]"}`}
            >
              {groupByType ? "Vista normal" : "Agrupar por tipo"}
            </button>
          </div>
          <p className="mt-3 text-xs text-[#777]">
            {visibleOperations.length} de {operations.length} movimientos
          </p>
        </div>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-[#f2f2ea] text-xs uppercase text-[#777]">
              <tr>
                <th className="p-4">Fecha</th>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Materia prima</th>
                <th className="text-right">Monto</th>
                <th className="w-24 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groupByType
                ? groups.map(([type, items]) => (
                    <OperationGroup
                      key={type}
                      type={type}
                      operations={items}
                      onEdit={setEditing}
                    />
                  ))
                : visibleOperations.map((operation) => (
                    <OperationRow
                      key={operation.id}
                      operation={operation}
                      onEdit={setEditing}
                    />
                  ))}
            </tbody>
          </table>
          {!visibleOperations.length && (
            <p className="p-10 text-center text-sm text-[#777]">
              No hay movimientos que coincidan con los filtros.
            </p>
          )}
        </div>
      </div>
      {quickOpen && (
        <QuickOperationDialog onClose={() => setQuickOpen(false)} />
      )}
      {open && (
        <OperationDialog
          ingredients={ingredients}
          onClose={() => setOpen(false)}
        />
      )}
      {editing && (
        <OperationDialog
          operation={editing}
          ingredients={ingredients}
          onClose={() => setEditing(null)}
        />
      )}
      {payingObligation && (
        <OperationDialog
          obligation={payingObligation}
          ingredients={ingredients}
          onClose={() => setPayingObligation(null)}
        />
      )}
      {showGuide && <RegistrationGuide onClose={() => setShowGuide(false)} />}
      {addingObligation && (
        <ObligationDialog onClose={() => setAddingObligation(false)} />
      )}
      {reconcilingBalances && (
        <BalanceReconciliationDialog
          expectedBank={summary.expectedBank}
          expectedCash={summary.expectedCash}
          onClose={() => setReconcilingBalances(false)}
        />
      )}
    </main>
  );
}

function QuickOperationDialog({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<"purchase" | "expense">("purchase");
  const [category, setCategory] = useState("Materias primas");
  const categories = OPERATION_CATEGORIES_BY_TYPE[type];

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:hidden">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-operation-title"
        className="max-h-[100dvh] w-full min-w-0 overflow-x-hidden overflow-y-auto rounded-t-3xl bg-[#fffef9] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
              Registro rápido
            </p>
            <h2 id="quick-operation-title" className="mt-1 text-2xl font-black">
              Nueva compra o gasto
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-[#f0f0e8] p-3"
          >
            <X size={22} />
          </button>
        </div>

        <form
          action={async (form) => {
            await saveOperationAction(form);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <input type="hidden" name="date" value={todayInChile()} />
          <input type="hidden" name="financialStatus" value="verified" />

          <label className="block text-sm font-black">
            Monto total pagado
            <input
              name="amount"
              type="number"
              min="1"
              inputMode="numeric"
              required
              autoFocus
              className="input mt-2 h-16 text-2xl font-black"
              placeholder="$ 0"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-black">¿Cómo pagaste?</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                ["debit", "Débito"],
                ["cash", "Efectivo"],
                ["credit", "Crédito"],
                ["transfer", "Transferencia"],
              ].map(([value, label], index) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={value}
                    defaultChecked={index === 0}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-12 items-center justify-center rounded-xl border border-[#d7dbd3] bg-white px-3 font-bold peer-checked:border-[#235b45] peer-checked:bg-[#e8f2e7] peer-checked:text-[#235b45]">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-black">
            ¿Qué compraste o pagaste?
            <input
              name="description"
              required
              maxLength={160}
              className="input mt-2 h-14 text-base"
              placeholder="Ej. Harina e insumos"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Tipo
              <select
                name="type"
                value={type}
                onChange={(event) => {
                  const next = event.target.value as "purchase" | "expense";
                  setType(next);
                  setCategory(DEFAULT_OPERATION_CATEGORY[next]);
                }}
                className="input mt-2"
              >
                <option value="purchase">Compra</option>
                <option value="expense">Gasto</option>
              </select>
            </label>
            <label className="text-xs font-bold">
              Categoría
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input mt-2"
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Documento
              <select
                name="taxMode"
                defaultValue="included"
                className="input mt-2"
              >
                <option value="included">Factura con IVA</option>
                <option value="exempt">Sin crédito IVA</option>
              </select>
            </label>
            <label className="text-xs font-bold">
              Proveedor
              <input
                name="supplier"
                className="input mt-2"
                placeholder="Opcional"
              />
            </label>
          </div>

          <label className="block text-xs font-bold">
            Nota o número de factura
            <input name="note" className="input mt-2" placeholder="Opcional" />
          </label>

          <div className="rounded-xl bg-[#edf6e9] p-3 text-xs leading-5 text-[#345443]">
            Se registrará con fecha de hoy y como dinero ya pagado. Carga el
            total una sola vez; luego podrás actualizar los precios de cada
            materia prima desde la factura sin duplicar este gasto.
          </div>

          <button className="sticky bottom-0 min-h-14 w-full rounded-xl bg-[#235b45] text-lg font-black text-white shadow-[0_-10px_18px_10px_#fffef9]">
            Guardar ahora
          </button>
        </form>
      </section>
    </div>
  );
}

function BalanceReconciliationDialog({
  expectedBank,
  expectedCash,
  onClose,
}: {
  expectedBank: number;
  expectedCash: number;
  onClose: () => void;
}) {
  const [bank, setBank] = useState(String(expectedBank));
  const [cash, setCash] = useState(String(expectedCash));
  const bankDifference = (Number(bank) || 0) - expectedBank;
  const cashDifference = (Number(cash) || 0) - expectedCash;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center md:p-4">
      <section className="max-h-[100dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
              Nuevo corte financiero
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Conciliar saldos reales
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <p className="mt-3 text-sm text-[#6f746c]">
          Esto no borra movimientos anteriores. Guarda un nuevo punto de partida
          y deja documentadas las diferencias encontradas.
        </p>
        <form
          action={async (form) => {
            await saveFinancialReconciliationAction(form);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <input type="hidden" name="expectedBank" value={expectedBank} />
          <input type="hidden" name="expectedCash" value={expectedCash} />
          <label className="block text-xs font-bold">
            Saldo bancario real
            <input
              name="bank"
              required
              min={0}
              inputMode="numeric"
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              className="input mt-2 text-lg font-black"
            />
            <span className="mt-1 block font-normal text-[#777]">
              ERP: {formatClp(expectedBank)} · Diferencia:{" "}
              {formatSigned(bankDifference)}
            </span>
          </label>
          <label className="block text-xs font-bold">
            Efectivo total real
            <input
              name="cash"
              required
              min={0}
              inputMode="numeric"
              value={cash}
              onChange={(event) => setCash(event.target.value)}
              className="input mt-2 text-lg font-black"
            />
            <span className="mt-1 block font-normal text-[#777]">
              ERP: {formatClp(expectedCash)} · Diferencia:{" "}
              {formatSigned(cashDifference)}
            </span>
          </label>
          <label className="block text-xs font-bold">
            Motivo o referencia
            <textarea
              name="reason"
              required
              minLength={3}
              maxLength={500}
              className="input mt-2 min-h-24 py-3"
              placeholder="Ej. Saldos comparados con Mercado Pago y conteo físico al cierre"
            />
          </label>
          <div className="rounded-xl bg-[#fff3d5] p-3 text-xs text-[#725b1b]">
            Después de guardar, las ventas y gastos nuevos se calcularán desde
            este corte. Úsalo solamente con saldos realmente comprobados.
          </div>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            Guardar nuevo corte conciliado
          </button>
        </form>
      </section>
    </div>
  );
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${formatClp(value)}`;
}

function ObligationGroup({
  title,
  subtitle,
  obligations,
  empty,
  onPay,
  current = false,
}: {
  title: string;
  subtitle: string;
  obligations: FinancialObligation[];
  empty: string;
  onPay: (obligation: FinancialObligation) => void;
  current?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${current ? "border-[#d9c888] bg-[#fffaf0]" : "border-[#d9ddd5] bg-[#f7f7f2]"}`}
    >
      <p className="font-black">{title}</p>
      <p className="mt-1 text-xs text-[#777]">{subtitle}</p>
      <div className="mt-3 space-y-3">
        {obligations.map((item) => (
          <div key={item.id} className="rounded-xl border bg-[#fffef9] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-black">{item.name}</p>
                <p className="mt-1 text-xs text-[#777]">
                  Vence {formatDate(item.dueDate)}
                  {item.kind === "loan_payment" ? " · Sólo flujo de caja" : ""}
                </p>
              </div>
              <p className="money font-black">
                {item.amount == null ? "Por calcular" : formatClp(item.amount)}
              </p>
            </div>
            {item.note && (
              <p className="mt-3 text-xs text-[#777]">{item.note}</p>
            )}
            <button
              type="button"
              onClick={() => onPay(item)}
              className="mt-4 w-full rounded-xl border border-[#235b45] px-3 py-2 text-sm font-black text-[#235b45] hover:bg-[#edf3ea]"
            >
              Registrar pago
            </button>
          </div>
        ))}
        {!obligations.length && (
          <p className="rounded-xl border border-dashed border-[#cfd3ca] p-4 text-sm text-[#777]">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

function ObligationDialog({ onClose }: { onClose: () => void }) {
  const [recurring, setRecurring] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
              Pago futuro
            </p>
            <h2 className="mt-1 text-2xl font-black">Nuevo compromiso</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <form
          action={async (form) => {
            await saveObligationAction(form);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Nombre
            <input
              name="name"
              required
              className="input mt-2"
              placeholder="Ej. IVA septiembre"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Monto, si ya lo conoces
              <input
                name="amount"
                type="number"
                min="1"
                className="input mt-2"
                placeholder="Por calcular"
              />
            </label>
            <label className="text-xs font-bold">
              Fecha de control o vencimiento
              <input
                name="dueDate"
                type="date"
                required
                className="input mt-2"
              />
            </label>
          </div>
          <label className="block text-xs font-bold">
            Tipo
            <select name="kind" className="input mt-2">
              <option value="payable">Cuenta o impuesto por pagar</option>
              <option value="loan_payment">Cuota de crédito</option>
            </select>
          </label>
          <label className="flex items-start gap-3 rounded-xl bg-[#f2f2ea] p-3 text-sm">
            <input
              type="checkbox"
              name="recurring"
              checked={recurring}
              onChange={(event) => setRecurring(event.target.checked)}
              className="mt-1"
            />
            <span>
              <b>Se repite todos los meses</b>
              <span className="mt-1 block text-xs font-normal text-[#777]">
                Al pagarlo, el sistema creará el compromiso del mes siguiente.
              </span>
            </span>
          </label>
          {recurring && (
            <label className="flex items-start gap-3 rounded-xl border border-[#deded5] p-3 text-sm">
              <input type="checkbox" name="carryAmount" className="mt-1" />
              <span>
                <b>Repetir también el mismo monto</b>
                <span className="mt-1 block text-xs font-normal text-[#777]">
                  Déjalo desmarcado para IVA, luz y cuentas variables: el mes
                  siguiente aparecerán “Por calcular”.
                </span>
              </span>
            </label>
          )}
          <label className="block text-xs font-bold">
            Nota opcional
            <textarea name="note" className="input mt-2 min-h-20 py-3" />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            Guardar compromiso
          </button>
        </form>
      </div>
    </div>
  );
}

function RegistrationGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="registration-guide-title"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-2xl md:rounded-3xl md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
              Recordatorio rápido
            </p>
            <h2
              id="registration-guide-title"
              className="mt-2 text-2xl font-black"
            >
              ¿Cómo registrar correctamente?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ayuda"
            className="rounded-lg p-2 hover:bg-[#f0f0e8]"
          >
            <X />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-[#edf6e9] p-4 text-sm text-[#345443]">
          <strong>Regla principal:</strong> registra cada movimiento una sola
          vez, el mismo día en que ocurre y desde la cuenta de donde realmente
          salió el dinero.
        </div>

        <ol className="mt-5 space-y-3 text-sm text-[#4f554e]">
          <li>
            <strong className="text-[#252822]">
              1. Registra aunque falten datos.
            </strong>{" "}
            Si todavía no conoces la categoría, déjalo pendiente, pero no lo
            omitas.
          </li>
          <li>
            <strong className="text-[#252822]">2. Usa la fecha real.</strong>{" "}
            Indica monto, beneficiario, descripción y medio de pago verdadero.
          </li>
          <li>
            <strong className="text-[#252822]">3. No dupliques.</strong> Si ya
            registraste la compra, no vuelvas a ingresarla cuando aparezca en la
            cartola.
          </li>
          <li>
            <strong className="text-[#252822]">
              4. Mover dinero no es gastar.
            </strong>{" "}
            Pasar dinero entre caja, billetera y cuentas propias es una
            transferencia interna.
          </li>
          <li>
            <strong className="text-[#252822]">5. Separa los retiros.</strong>{" "}
            Un retiro personal es retiro del dueño; una compra del negocio es
            compra o gasto, aunque se pague en efectivo.
          </li>
          <li>
            <strong className="text-[#252822]">
              6. Identifica el período.
            </strong>{" "}
            En la nota indica si corresponde al mes actual, uno anterior o un
            pago anticipado.
          </li>
        </ol>

        <div className="mt-5 rounded-2xl border border-[#e2d49d] bg-[#fff9e8] p-4 text-sm text-[#67571f]">
          <strong>Al cierre:</strong> compara los movimientos del día con caja,
          comprobantes y Mercado Pago. Corrige con una explicación; nunca borres
          la historia del movimiento.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-12 w-full rounded-xl bg-[#235b45] font-black text-white"
        >
          Entendido
        </button>
      </section>
    </div>
  );
}

function todayInChile() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function OperationGroup({
  type,
  operations,
  onEdit,
}: {
  type: OperationType;
  operations: Operation[];
  onEdit: (operation: Operation) => void;
}) {
  const income = ["other_income", "owner_contribution"].includes(type);
  const total = operations.reduce((sum, operation) => sum + operation.gross, 0);
  return (
    <>
      <tr className="bg-[#edf3ea] text-[#235b45]">
        <td colSpan={6} className="p-3 font-black">
          {operationLabels[type]} · {operations.length} movimientos
        </td>
        <td className="pr-4 text-right font-black">
          {income ? "+" : "−"}
          {formatClp(total)}
        </td>
        <td />
      </tr>
      {operations.map((operation) => (
        <OperationRow
          key={operation.id}
          operation={operation}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}

function OperationRow({
  operation: o,
  onEdit,
}: {
  operation: Operation;
  onEdit: (operation: Operation) => void;
}) {
  const income = ["other_income", "owner_contribution"].includes(o.type);
  return (
    <tr>
      <td className="p-4">
        {new Date(o.date + "T12:00:00").toLocaleDateString("es-CL")}
      </td>
      <td className="font-bold">{o.description}</td>
      <td>{operationLabels[o.type]}</td>
      <td>{o.category}</td>
      <td>
        <StatusBadge status={o.financialStatus} />
      </td>
      <td>{o.ingredientName || "—"}</td>
      <td
        className={`pr-4 text-right font-black ${income ? "text-[#235b45]" : ""}`}
      >
        {income ? "+" : "−"}
        {formatClp(o.gross)}
      </td>
      <td className="text-center">
        <button
          type="button"
          onClick={() => onEdit(o)}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-bold text-[#235b45] hover:bg-[#edf3ea]"
        >
          <Pencil size={15} /> Editar
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: Operation["financialStatus"] }) {
  const labels = {
    verified: "Verificado",
    pending: "Pendiente",
    historical: "Histórico",
    historical_verified: "Histórico verificado",
  };
  const active = status === "verified";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${active ? "bg-[#e7f2e4] text-[#235b45]" : status === "pending" ? "bg-[#fff3cc] text-[#795f0d]" : "bg-[#eeeeea] text-[#70736c]"}`}
    >
      {labels[status]}
    </span>
  );
}
function Metric({
  l,
  v,
  icon,
  warning,
}: {
  l: string;
  v: number;
  icon?: "bank" | "cash";
  warning?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${warning ? "border-[#e6d397] bg-[#fff9e8]" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-[#777]">{l}</p>
        {icon === "bank" && <Landmark size={18} className="text-[#235b45]" />}
        {icon === "cash" && (
          <WalletCards size={18} className="text-[#235b45]" />
        )}
      </div>
      <p className="money mt-2 text-2xl font-black">{formatClp(v)}</p>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-CL");
}
function OperationDialog({
  ingredients,
  onClose,
  operation,
  obligation,
}: {
  ingredients: { id: string; name: string; base_unit: string }[];
  onClose: () => void;
  operation?: Operation;
  obligation?: FinancialObligation;
}) {
  const obligationCategory = obligation
    ? obligation.kind === "loan_payment"
      ? "Gastos administrativos"
      : obligation.name.toLocaleLowerCase("es").includes("arriendo")
        ? "Arriendo"
        : obligation.name.toLocaleLowerCase("es").includes("electric")
          ? "Servicios básicos"
          : "Gastos administrativos"
    : undefined;
  const [type, setType] = useState<OperationType>(
    operation?.type || (obligation ? "fixed_cost" : "purchase"),
  );
  const [ingredient, setIngredient] = useState(operation?.ingredientId || "");
  const [category, setCategory] = useState(
    operation?.category || obligationCategory || "Materias primas",
  );
  const categoriesForType: readonly string[] =
    OPERATION_CATEGORIES_BY_TYPE[type];
  const visibleFormCategories = categoriesForType.includes(category)
    ? categoriesForType
    : [...categoriesForType, category];
  const editing = !!operation;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex justify-between">
          <h2 className="text-2xl font-black">
            {editing
              ? "Editar movimiento"
              : obligation
                ? "Registrar pago pendiente"
                : "Nuevo movimiento"}
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <form
          action={async (f) => {
            if (editing) await updateOperationAction(f);
            else await saveOperationAction(f);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          {operation && <input type="hidden" name="id" value={operation.id} />}
          {obligation && (
            <input type="hidden" name="obligationId" value={obligation.id} />
          )}
          {operation?.ingredientId && (
            <input type="hidden" name="type" value={operation.type} />
          )}
          <label className="block text-xs font-bold">
            ¿Qué estás registrando?
            <select
              name="type"
              value={type}
              onChange={(e) => {
                const next = e.target.value as OperationType;
                setType(next);
                setCategory(DEFAULT_OPERATION_CATEGORY[next]);
              }}
              disabled={!!operation?.ingredientId || !!obligation}
              className="input mt-2"
            >
              {Object.entries(operationLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <p className="-mt-2 text-xs text-[#747970]">
            Elige la acción principal. Después verás únicamente los grupos que
            corresponden a esa acción.
          </p>
          <label className="block text-xs font-bold">
            Fecha
            <input
              name="date"
              type="date"
              required
              key={operation?.date}
              defaultValue={operation?.date || todayInChile()}
              className="input mt-2"
            />
          </label>
          {obligation && <input type="hidden" name="type" value={type} />}
          <label className="block text-xs font-bold">
            Descripción
            <input
              name="description"
              required
              defaultValue={operation?.description || obligation?.name}
              className="input mt-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Monto pagado/recibido
              <input
                name="amount"
                type="number"
                required
                defaultValue={
                  operation?.gross || obligation?.amount || undefined
                }
                className="input mt-2"
              />
            </label>
            <label className="text-xs font-bold">
              IVA
              <select
                name="taxMode"
                defaultValue={
                  obligation || operation?.taxRate === 0 ? "exempt" : "included"
                }
                className="input mt-2"
              >
                <option value="included">IVA incluido</option>
                <option value="exempt">Exento/sin crédito</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-bold">
            Estado financiero
            <select
              name="financialStatus"
              defaultValue={operation?.financialStatus || "verified"}
              className="input mt-2"
            >
              <option value="verified">
                Verificado: el dinero ya se movió
              </option>
              <option value="pending">
                Pendiente: todavía no afecta el saldo
              </option>
              {operation?.financialStatus.startsWith("historical") && (
                <option value={operation.financialStatus}>
                  Histórico anterior al corte
                </option>
              )}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              ¿En qué grupo va?
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input mt-2"
              >
                {visibleFormCategories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              Medio de pago
              <select
                name="paymentMethod"
                defaultValue={
                  operation?.paymentMethod || (obligation ? "transfer" : "cash")
                }
                className="input mt-2"
              >
                <option value="cash">Efectivo</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="transfer">Transferencia</option>
              </select>
            </label>
          </div>
          {type === "purchase" && !editing && (
            <>
              <label className="block text-xs font-bold">
                Actualizar precio de materia prima (opcional)
                <select
                  name="ingredientId"
                  value={ingredient}
                  onChange={(e) => setIngredient(e.target.value)}
                  className="input mt-2"
                >
                  <option value="">No vincular</option>
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              {ingredient && (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold">
                    Cantidad comprada
                    <input
                      name="purchaseQuantity"
                      type="number"
                      step="0.001"
                      required
                      className="input mt-2"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    Unidad
                    <select name="purchaseUnit" className="input mt-2">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">litros</option>
                      <option value="ml">ml</option>
                      <option value="unit">unidades</option>
                    </select>
                  </label>
                </div>
              )}
            </>
          )}
          <label className="block text-xs font-bold">
            Proveedor
            <input
              name="supplier"
              defaultValue={operation?.supplier}
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Nota
            <textarea
              name="note"
              defaultValue={operation?.note || obligation?.note}
              className="input mt-2 min-h-20 py-3"
            />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            {editing
              ? "Guardar corrección"
              : obligation
                ? "Registrar pago y descontar"
                : "Guardar movimiento"}
          </button>
        </form>
      </div>
    </div>
  );
}
