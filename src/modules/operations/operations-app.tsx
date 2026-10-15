"use client";
import { useMemo, useState } from "react";
import {
  CircleHelp,
  Calculator,
  Landmark,
  LayoutDashboard,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Target,
  WalletCards,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import { FixedCostsView, ProjectionsView } from "@/modules/costs/costs-app";
import type { CostSettings, FixedCost } from "@/modules/costs/types";
import type { BusinessPulse } from "@/modules/pos/types";
import {
  saveFinancialReconciliationAction,
  saveObligationAction,
  saveOperationAction,
  saveProvisionAction,
  updateOperationAction,
} from "./actions";
import {
  DEFAULT_OPERATION_CATEGORY,
  OPERATION_CATEGORIES_BY_TYPE,
} from "./categories";
import {
  operationLabels,
  type CashCycleSummary,
  type FinancialCutoff,
  type FinancialObligation,
  type ExpenseProvision,
  type Operation,
  type OperationType,
} from "./types";
export function OperationsApp({
  operations,
  ingredients,
  ledger,
  cutoff,
  obligations,
  provisions,
  summary,
  fixedCosts,
  monthlyFixedCosts,
  costSettings,
  businessPulse,
}: {
  operations: Operation[];
  ingredients: { id: string; name: string; base_unit: string }[];
  ledger: { status: string; closed_at: string | null } | null;
  cutoff: FinancialCutoff;
  obligations: FinancialObligation[];
  provisions: ExpenseProvision[];
  fixedCosts: FixedCost[];
  monthlyFixedCosts: number;
  costSettings: CostSettings;
  businessPulse: BusinessPulse;
  summary: {
    openingBalance: number;
    expectedBank: number;
    expectedCash: number;
    expectedTotal: number;
    salesTotal: number;
    netSalesAfterVat: number;
    operatingIncome: number;
    operatingExpenses: number;
    monthlyEconomicExpenses: number;
    provisionedExpenses: number;
    monthlyBusinessCashWithdrawals: number;
    monthlyPurchases: number;
    monthlyFixedPayments: number;
    monthlyVariableExpenses: number;
    cardFees: number;
    monthlyCardFees: number;
    withdrawals: number;
    monthlyOwnerWithdrawals: number;
    pendingObligations: number;
    salesTaxDebit: number;
    recoverableTaxCredit: number;
    estimatedVatPayable: number;
    availableLiquidity: number;
    cashCycle: CashCycleSummary;
  };
}) {
  const [open, setOpen] = useState(false);
  const [financeView, setFinanceView] = useState<
    "overview" | "structure" | "provisions" | "projection"
  >("overview");
  const [quickOpen, setQuickOpen] = useState(false);
  const [showMobileDashboard, setShowMobileDashboard] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [addingObligation, setAddingObligation] = useState(false);
  const [addingProvision, setAddingProvision] = useState(false);
  const [reconcilingBalances, setReconcilingBalances] = useState(false);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [payingObligation, setPayingObligation] =
    useState<FinancialObligation | null>(null);
  const [payingProvision, setPayingProvision] =
    useState<ExpenseProvision | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupByType, setGroupByType] = useState(false);
  const currentMonth = todayInChile().slice(0, 7);
  const currentMonthLabel = new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  }).format(new Date(`${currentMonth}-15T12:00:00`));
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
  const effectiveMonthlyCosts =
    summary.provisionedExpenses > 0
      ? summary.provisionedExpenses
      : monthlyFixedCosts;
  const projectedOperatingResult =
    businessPulse.projectedMonthlyContribution -
    businessPulse.projectedMonthlyWasteReserve -
    effectiveMonthlyCosts;
  const otherPaidExpenses =
    summary.monthlyFixedPayments +
    summary.monthlyVariableExpenses +
    summary.monthlyBusinessCashWithdrawals;
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
        <div className="mt-4 rounded-2xl border border-[#e6d397] bg-[#fff9e8] p-4">
          <p className="text-xs font-black uppercase tracking-[.12em] text-[#795f0d]">
            Reserva tributaria del mes
          </p>
          <p className="money mt-2 text-2xl font-black">
            {formatClp(summary.estimatedVatPayable)}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6d6450]">
            No considerar como dinero disponible. Liquidez libre estimada:{" "}
            <strong>{formatClp(summary.availableLiquidity)}</strong>.
          </p>
        </div>
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
        <div className="mb-6 hidden gap-2 overflow-x-auto pb-1 md:flex">
          {[
            {
              id: "overview" as const,
              label: "Realidad financiera",
              icon: <LayoutDashboard size={16} />,
            },
            {
              id: "structure" as const,
              label: "Gastos planificados",
              icon: <Calculator size={16} />,
            },
            {
              id: "provisions" as const,
              label: "Provisiones",
              icon: <ReceiptText size={16} />,
            },
            {
              id: "projection" as const,
              label: "Viabilidad y proyección",
              icon: <Target size={16} />,
            },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setFinanceView(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-black ${financeView === item.id ? "bg-[#235b45] text-white" : "border border-[#deddd4] bg-[#fffef9] text-[#62675f]"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        {financeView === "structure" && (
          <FixedCostsView
            costs={fixedCosts}
            monthly={monthlyFixedCosts}
            settings={costSettings}
          />
        )}
        {financeView === "projection" && (
          <ProjectionsView
            fixedCosts={effectiveMonthlyCosts}
            businessPulse={businessPulse}
            estimatedVatPayable={summary.estimatedVatPayable}
            vatRate={costSettings.vatRate}
          />
        )}
        {financeView === "provisions" && (
          <ProvisionsView
            provisions={provisions}
            onAdd={() => setAddingProvision(true)}
            onPay={setPayingProvision}
          />
        )}
        {financeView === "overview" && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
                  Control financiero
                </p>
                <h1 className="mt-2 text-3xl font-black">Finanzas reales</h1>
                <p className="mt-2 text-sm text-[#747970]">
                  Operación de {currentMonthLabel} y saldos desde el último
                  corte conciliado.
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
                {formatClp(cutoff.openingCash)} en efectivo. Los pagos
                posteriores, incluido el impuesto ya pagado, se descuentan sólo
                cuando están verificados.
              </p>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-12">
              <div
                className={`rounded-2xl border p-6 xl:col-span-7 ${summary.availableLiquidity < 0 ? "border-[#e2b9aa] bg-[#fff0ea]" : "border-[#b9d0b8] bg-[#e8f0e6]"}`}
              >
                <p className="text-xs font-black uppercase tracking-[.14em] text-[#59635b]">
                  Dinero realmente disponible
                </p>
                <p
                  className={`money mt-3 text-4xl font-black ${summary.availableLiquidity < 0 ? "text-[#9a3f22]" : "text-[#235b45]"}`}
                >
                  {formatClp(summary.availableLiquidity)}
                </p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#59635b]">
                  Es la liquidez estimada después de apartar el IVA y los
                  compromisos conocidos. Este es el monto útil para decidir si
                  puedes comprar, invertir o retirar sin ocupar dinero ajeno.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniAmount
                    label="Banco esperado"
                    value={summary.expectedBank}
                  />
                  <MiniAmount
                    label="Efectivo esperado"
                    value={summary.expectedCash}
                  />
                  <MiniAmount
                    label="Saldo total esperado"
                    value={summary.expectedTotal}
                  />
                </div>
              </div>

              <div
                className={`rounded-2xl border p-6 xl:col-span-5 ${projectedOperatingResult >= 0 ? "border-[#c9d8c5] bg-[#f2f7ef]" : "border-[#e6d397] bg-[#fff9e8]"}`}
              >
                <p className="text-xs font-black uppercase tracking-[.14em] text-[#59635b]">
                  Salud operativa proyectada
                </p>
                <p className="money mt-3 text-3xl font-black">
                  {formatClp(Math.round(projectedOperatingResult))}
                </p>
                <p className="mt-2 text-sm font-black text-[#235b45]">
                  {projectedOperatingResult < 0
                    ? "El negocio no alcanza a cubrir su estructura"
                    : businessPulse.projectedMonthlySales > 0 &&
                        projectedOperatingResult /
                          businessPulse.projectedMonthlySales <
                          0.1
                      ? "Resultado positivo, pero todavía ajustado"
                      : "Resultado operativo saludable"}
                </p>
                <p className="mt-3 text-xs leading-5 text-[#666]">
                  Proyección automática con ventas conciliadas, recetas,
                  comisiones, merma adicional y provisiones del mes. No es el
                  saldo bancario ni incluye impuesto a la renta.
                </p>
                <button
                  type="button"
                  onClick={() => setFinanceView("projection")}
                  className="mt-5 rounded-xl border border-[#235b45] bg-white px-4 py-2.5 text-xs font-black text-[#235b45]"
                >
                  Ver cálculo completo
                </button>
              </div>

              <section className="card p-5 xl:col-span-8">
                <h2 className="font-black">En qué se usó el dinero este mes</h2>
                <p className="mt-1 text-xs leading-5 text-[#777]">
                  Pagos efectivamente registrados. Separamos los insumos que
                  producen lo vendido del resto de los egresos.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <SpendCard
                    title="Insumos y mercadería"
                    value={summary.monthlyPurchases}
                    detail="Materias primas y compras destinadas a producción."
                    primary
                  />
                  <SpendCard
                    title="Otros gastos del negocio"
                    value={otherPaidExpenses}
                    detail="Gastos fijos y variables pagados, incluidos desembolsos menores desde caja."
                  />
                  <SpendCard
                    title="Comisiones de tarjetas"
                    value={summary.monthlyCardFees}
                    detail="Costo financiero estimado de las ventas con tarjeta."
                  />
                  <SpendCard
                    title="Retiros personales"
                    value={summary.monthlyOwnerWithdrawals}
                    detail="Salida de caja personal: reduce liquidez, no la rentabilidad del negocio."
                    warning
                  />
                </div>
              </section>

              <section className="card p-5 xl:col-span-4">
                <h2 className="font-black">Dinero apartado</h2>
                <p className="mt-1 text-xs leading-5 text-[#777]">
                  No necesariamente salió todavía del banco, pero ya tiene un
                  destino y no debe tratarse como disponible.
                </p>
                <div className="mt-4 space-y-3">
                  <ReservedRow
                    label="IVA estimado acumulado"
                    value={summary.estimatedVatPayable}
                  />
                  <ReservedRow
                    label="Compromisos pendientes"
                    value={summary.pendingObligations}
                  />
                  <ReservedRow
                    label="Costos provisionados del mes"
                    value={summary.provisionedExpenses}
                  />
                </div>
              </section>

              <section className="card p-5 xl:col-span-12">
                <h2 className="font-black">Lectura de ventas del mes</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniAmount
                    label="Ventas brutas conciliadas"
                    value={summary.salesTotal}
                  />
                  <MiniAmount
                    label="Ventas sin IVA"
                    value={summary.netSalesAfterVat}
                  />
                  <MiniAmount
                    label="Gastos operacionales reconocidos"
                    value={summary.operatingExpenses}
                  />
                </div>
                <p className="mt-4 text-xs leading-5 text-[#777]">
                  Las ventas brutas incluyen IVA. Para medir rentabilidad el
                  sistema trabaja con la venta sin IVA; para medir caja, reserva
                  el IVA estimado hasta pagarlo en el F29.
                </p>
              </section>
            </div>
            <div className="mt-4 rounded-2xl border border-[#e6d397] bg-[#fff9e8] p-5 text-sm text-[#6d6450]">
              <strong className="text-[#5d4b12]">
                Reserva tributaria automática.
              </strong>{" "}
              De {formatClp(summary.salesTaxDebit)} de IVA estimado en ventas se
              descuentan {formatClp(summary.recoverableTaxCredit)} de crédito
              por compras y comisiones registradas. Esta reserva no es un gasto:
              es dinero que debe permanecer disponible para el F29.
            </div>
            <CashCyclePanel cycle={summary.cashCycle} />
            <div className="mt-4 rounded-2xl bg-[#f4f2e9] p-5 text-sm text-[#65685f]">
              <strong className="text-[#252822]">
                Esto controla dinero real, no calcula rentabilidad.
              </strong>{" "}
              La viabilidad se calcula en la pestaña “Viabilidad y proyección”
              con recetas, comisiones y gastos planificados. El IVA de
              septiembre debe registrarse como compromiso: reducirá la liquidez
              de octubre, pero no falseará la rentabilidad operacional de
              octubre. Un compromiso pendiente no baja el saldo bancario hasta
              que se paga.
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
          </>
        )}
      </div>
      {quickOpen && (
        <QuickOperationDialog onClose={() => setQuickOpen(false)} />
      )}
      {open && (
        <OperationDialog
          ingredients={ingredients}
          provisions={provisions}
          onClose={() => setOpen(false)}
        />
      )}
      {editing && (
        <OperationDialog
          operation={editing}
          ingredients={ingredients}
          provisions={provisions}
          onClose={() => setEditing(null)}
        />
      )}
      {payingObligation && (
        <OperationDialog
          obligation={payingObligation}
          ingredients={ingredients}
          provisions={provisions}
          onClose={() => setPayingObligation(null)}
        />
      )}
      {payingProvision && (
        <OperationDialog
          provision={payingProvision}
          provisions={provisions}
          ingredients={ingredients}
          onClose={() => setPayingProvision(null)}
        />
      )}
      {showGuide && <RegistrationGuide onClose={() => setShowGuide(false)} />}
      {addingObligation && (
        <ObligationDialog onClose={() => setAddingObligation(false)} />
      )}
      {addingProvision && (
        <ProvisionDialog onClose={() => setAddingProvision(false)} />
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
          <input
            type="hidden"
            name="economicMonth"
            value={todayInChile().slice(0, 7)}
          />
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

function ProvisionsView({
  provisions,
  onAdd,
  onPay,
}: {
  provisions: ExpenseProvision[];
  onAdd: () => void;
  onPay: (provision: ExpenseProvision) => void;
}) {
  const currentMonth = todayInChile().slice(0, 7);
  const current = provisions.filter(
    (item) => item.economicMonth.slice(0, 7) === currentMonth,
  );
  const outstandingFromPriorMonths = provisions.filter(
    (item) =>
      item.economicMonth.slice(0, 7) < currentMonth &&
      item.status !== "reconciled" &&
      item.status !== "cancelled",
  );
  const visible = [...outstandingFromPriorMonths, ...current];
  const expected = current
    .filter((item) => item.affectsProfitability && item.status !== "cancelled")
    .reduce((total, item) => total + item.expectedAmount, 0);
  const paid = current.reduce((total, item) => total + item.paidAmount, 0);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
            Contabilidad de gestión
          </p>
          <h1 className="mt-2 text-3xl font-black">Provisiones del mes</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#747970]">
            Aquí se reconoce el costo en el mes al que pertenece, aunque el
            dinero salga después. Cada pago real reduce el saldo pendiente sin
            duplicar el gasto. Los anticipos y pagos parciales permanecen
            visibles hasta completar el saldo.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-black text-white"
        >
          <Plus size={17} /> Nueva provisión
        </button>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric l="Costo económico provisionado" v={expected} />
        <Metric l="Pagado y conciliado" v={paid} />
        <Metric
          l="Saldo pendiente de pago"
          v={Math.max(0, expected - paid)}
          warning
        />
      </div>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b bg-[#f2f2ea] text-xs uppercase text-[#777]">
            <tr>
              <th className="p-4">Concepto</th>
              <th>Categoría</th>
              <th>Vencimiento</th>
              <th className="text-right">Costo del mes</th>
              <th className="text-right">Pagado</th>
              <th className="text-right">Pendiente</th>
              <th className="text-center">Estado</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((item) => (
              <tr key={item.id}>
                <td className="p-4">
                  <p className="font-black">{item.name}</p>
                  {item.note && (
                    <p className="mt-1 max-w-md text-xs text-[#777]">
                      {item.note}
                    </p>
                  )}
                </td>
                <td>{item.category}</td>
                <td>{item.dueDate ? formatDate(item.dueDate) : "—"}</td>
                <td className="text-right font-black">
                  {formatClp(item.expectedAmount)}
                </td>
                <td className="text-right">{formatClp(item.paidAmount)}</td>
                <td className="text-right font-black">
                  {formatClp(item.outstandingAmount)}
                </td>
                <td className="text-center">
                  <ProvisionStatus status={item.status} />
                </td>
                <td className="p-3 text-right">
                  {item.status !== "reconciled" &&
                    item.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => onPay(item)}
                        className="rounded-lg border border-[#235b45] px-3 py-2 font-black text-[#235b45]"
                      >
                        Registrar abono o pago
                      </button>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <p className="p-10 text-center text-sm text-[#777]">
            No hay provisiones para este mes.
          </p>
        )}
      </div>
    </section>
  );
}

function ProvisionStatus({ status }: { status: ExpenseProvision["status"] }) {
  const labels = {
    estimated: "Estimado",
    partial: "Pago parcial",
    reconciled: "Conciliado",
    cancelled: "Cancelado",
  };
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${status === "reconciled" ? "bg-[#e7f2e4] text-[#235b45]" : status === "partial" ? "bg-[#fff3cc] text-[#795f0d]" : "bg-[#eeeeea] text-[#70736c]"}`}
    >
      {labels[status]}
    </span>
  );
}

function ProvisionDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
              Costo económico
            </p>
            <h2 className="mt-1 text-2xl font-black">Nueva provisión</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <form
          action={async (form) => {
            await saveProvisionAction(form);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Concepto
            <input
              name="name"
              required
              className="input mt-2"
              placeholder="Ej. Remuneración octubre"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Monto económico
              <input
                name="amount"
                type="number"
                min="0"
                required
                className="input mt-2"
              />
            </label>
            <label className="text-xs font-bold">
              Mes al que pertenece
              <input
                name="economicMonth"
                type="month"
                required
                defaultValue={todayInChile().slice(0, 7)}
                className="input mt-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Categoría
              <select
                name="category"
                defaultValue="Servicios básicos"
                className="input mt-2"
              >
                {OPERATION_CATEGORIES_BY_TYPE.fixed_cost.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              Fecha estimada de pago
              <input name="dueDate" type="date" className="input mt-2" />
            </label>
          </div>
          <label className="flex items-start gap-3 rounded-xl bg-[#f2f2ea] p-3 text-sm">
            <input
              type="checkbox"
              name="affectsProfitability"
              defaultChecked
              className="mt-1"
            />
            <span>
              <b>Incluir en rentabilidad</b>
              <span className="mt-1 block text-xs font-normal text-[#777]">
                Desmárcalo para impuestos o capital de un crédito.
              </span>
            </span>
          </label>
          <label className="block text-xs font-bold">
            Nota
            <textarea
              name="note"
              maxLength={500}
              className="input mt-2 min-h-20 py-3"
            />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            Guardar provisión
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
                  {item.kind === "loan_payment"
                    ? " · Capital sólo afecta caja"
                    : ""}
                </p>
              </div>
              <p className="money font-black">
                {item.amount == null ? "Por calcular" : formatClp(item.amount)}
              </p>
            </div>
            {item.kind === "loan_payment" && item.amount != null && (
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#f2f2ea] p-3 text-xs">
                <span>
                  Capital{" "}
                  <b className="block">{formatClp(item.principalAmount)}</b>
                </span>
                <span>
                  Intereses{" "}
                  <b className="block">{formatClp(item.interestAmount)}</b>
                </span>
                <span>
                  Cargos{" "}
                  <b className="block">{formatClp(item.chargesAmount)}</b>
                </span>
              </div>
            )}
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
  const [kind, setKind] = useState<"payable" | "loan_payment">("payable");
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
            <select
              name="kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "payable" | "loan_payment")
              }
              className="input mt-2"
            >
              <option value="payable">Cuenta o impuesto por pagar</option>
              <option value="loan_payment">Cuota de crédito</option>
            </select>
          </label>
          {kind === "loan_payment" && (
            <fieldset className="rounded-2xl border border-[#d8dfd5] bg-[#f7faf5] p-4">
              <legend className="px-2 text-xs font-black uppercase tracking-[.12em] text-[#235b45]">
                Desglose obligatorio de la cuota
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-xs font-bold">
                  Capital
                  <input
                    name="principalAmount"
                    type="number"
                    min="0"
                    required
                    className="input mt-2"
                  />
                </label>
                <label className="text-xs font-bold">
                  Intereses
                  <input
                    name="interestAmount"
                    type="number"
                    min="0"
                    required
                    className="input mt-2"
                  />
                </label>
                <label className="text-xs font-bold">
                  Cargos
                  <input
                    name="chargesAmount"
                    type="number"
                    min="0"
                    required
                    className="input mt-2"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-[#62675f]">
                Los tres valores deben sumar la cuota. Capital afecta solamente
                la caja; intereses y cargos afectan la rentabilidad.
              </p>
            </fieldset>
          )}
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

function CashCyclePanel({ cycle }: { cycle: CashCycleSummary }) {
  return (
    <section className="mt-4 rounded-2xl border border-[#cbd8c8] bg-[#f3f8f1] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.14em] text-[#235b45]">
            Ciclo de liquidez · día 5 al día 4
          </p>
          <h2 className="mt-1 text-xl font-black">
            {formatDate(cycle.start)} → {formatDate(cycle.end)}
          </h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[#667067]">
          Esta vista sigue cuándo entra y sale el dinero. La rentabilidad
          continúa calculándose por mes calendario.
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric l="Ventas cobradas" v={cycle.sales} />
        <Metric l="Otros ingresos" v={cycle.otherIncome} />
        <Metric l="Pagos realizados" v={cycle.paidOutflows} />
        <Metric l="Retiros personales" v={cycle.ownerWithdrawals} />
        <Metric l="Pagos aún pendientes" v={cycle.pendingPayments} warning />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4">
        <span className="text-sm font-bold text-[#596159]">
          Disponible proyectado después de compromisos e IVA reservado
        </span>
        <strong className="money text-2xl">
          {formatClp(cycle.projectedAvailable)}
        </strong>
      </div>
    </section>
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
  tone,
}: {
  l: string;
  v: number;
  icon?: "bank" | "cash";
  warning?: boolean;
  tone?: "available" | "danger";
}) {
  return (
    <div
      className={`card p-5 ${warning ? "border-[#e6d397] bg-[#fff9e8]" : ""} ${tone === "available" ? "border-[#b8d7bc] bg-[#eef7ec]" : ""} ${tone === "danger" ? "border-[#e5b4aa] bg-[#fff0ed]" : ""}`}
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

function MiniAmount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-[#777]">
        {label}
      </p>
      <p className="money mt-2 text-lg font-black">{formatClp(value)}</p>
    </div>
  );
}

function SpendCard({
  title,
  value,
  detail,
  primary = false,
  warning = false,
}: {
  title: string;
  value: number;
  detail: string;
  primary?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${primary ? "border-[#bfd2bc] bg-[#eef5eb]" : warning ? "border-[#ead8a6] bg-[#fff9e8]" : "border-[#e6e5dc] bg-[#faf9f4]"}`}
    >
      <p className="text-xs font-black text-[#59635b]">{title}</p>
      <p className="money mt-2 text-2xl font-black">{formatClp(value)}</p>
      <p className="mt-2 text-[11px] leading-4 text-[#777]">{detail}</p>
    </div>
  );
}

function ReservedRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fff9e8] px-4 py-3">
      <span className="text-xs font-bold text-[#6d6450]">{label}</span>
      <b className="money shrink-0 text-sm">{formatClp(value)}</b>
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
  provision,
  provisions = [],
}: {
  ingredients: { id: string; name: string; base_unit: string }[];
  onClose: () => void;
  operation?: Operation;
  obligation?: FinancialObligation;
  provision?: ExpenseProvision;
  provisions?: ExpenseProvision[];
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
    operation?.type || (obligation || provision ? "fixed_cost" : "purchase"),
  );
  const [ingredient, setIngredient] = useState(operation?.ingredientId || "");
  const [category, setCategory] = useState(
    operation?.category ||
      provision?.category ||
      obligationCategory ||
      "Materias primas",
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
              : obligation || provision
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
          {provision && (
            <input type="hidden" name="provisionId" value={provision.id} />
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
              disabled={
                !!operation?.ingredientId || !!obligation || !!provision
              }
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
          <label className="block text-xs font-bold">
            Mes económico al que pertenece
            <input
              name="economicMonth"
              type="month"
              required
              defaultValue={
                operation?.economicMonth?.slice(0, 7) ||
                provision?.economicMonth?.slice(0, 7) ||
                todayInChile().slice(0, 7)
              }
              className="input mt-2"
            />
            <span className="mt-1 block font-normal text-[#777]">
              Puede ser distinto al mes del pago; por ejemplo, un sueldo de
              octubre pagado en noviembre.
            </span>
          </label>
          {obligation && <input type="hidden" name="type" value={type} />}
          {provision && <input type="hidden" name="type" value={type} />}
          <label className="block text-xs font-bold">
            Descripción
            <input
              name="description"
              required
              defaultValue={
                operation?.description || obligation?.name || provision?.name
              }
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
                  operation?.gross ||
                  obligation?.amount ||
                  provision?.outstandingAmount ||
                  undefined
                }
                className="input mt-2"
              />
            </label>
            <label className="text-xs font-bold">
              IVA
              <select
                name="taxMode"
                defaultValue={
                  obligation || provision || operation?.taxRate === 0
                    ? "exempt"
                    : "included"
                }
                className="input mt-2"
              >
                <option value="included">IVA incluido</option>
                <option value="exempt">Exento/sin crédito</option>
              </select>
            </label>
          </div>
          {obligation?.kind === "loan_payment" && (
            <fieldset className="rounded-2xl border border-[#d8dfd5] bg-[#f7faf5] p-4">
              <legend className="px-2 text-xs font-black uppercase tracking-[.12em] text-[#235b45]">
                Desglose de esta cuota
              </legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="text-xs font-bold">
                  Capital
                  <input
                    name="principalAmount"
                    type="number"
                    min="0"
                    required
                    defaultValue={obligation.principalAmount || undefined}
                    className="input mt-2"
                  />
                </label>
                <label className="text-xs font-bold">
                  Intereses
                  <input
                    name="interestAmount"
                    type="number"
                    min="0"
                    required
                    defaultValue={obligation.interestAmount || 0}
                    className="input mt-2"
                  />
                </label>
                <label className="text-xs font-bold">
                  Cargos
                  <input
                    name="chargesAmount"
                    type="number"
                    min="0"
                    required
                    defaultValue={obligation.chargesAmount || 0}
                    className="input mt-2"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-[#62675f]">
                Deben sumar el monto pagado. Solamente intereses y cargos se
                reconocerán como gasto.
              </p>
            </fieldset>
          )}
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
          {!provision &&
            provisions.length > 0 &&
            ["fixed_cost", "expense"].includes(type) && (
              <label className="block text-xs font-bold">
                Conciliar con provisión (opcional)
                <select
                  name="provisionId"
                  defaultValue={operation?.provisionId || ""}
                  className="input mt-2"
                >
                  <option value="">Sin provisión</option>
                  {provisions
                    .filter(
                      (item) =>
                        item.status !== "reconciled" &&
                        item.status !== "cancelled",
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · pendiente{" "}
                        {formatClp(item.outstandingAmount)}
                      </option>
                    ))}
                </select>
              </label>
            )}
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
              defaultValue={
                operation?.note || obligation?.note || provision?.note
              }
              className="input mt-2 min-h-20 py-3"
            />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            {editing
              ? "Guardar corrección"
              : obligation || provision
                ? "Registrar pago y descontar"
                : "Guardar movimiento"}
          </button>
        </form>
      </div>
    </div>
  );
}
