"use client";
import { useMemo, useState } from "react";
import { Landmark, Pencil, Plus, Search, WalletCards, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import { saveOperationAction, updateOperationAction } from "./actions";
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
  const [editing, setEditing] = useState<Operation | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [groupByType, setGroupByType] = useState(false);
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
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-3 text-sm font-black text-white"
        >
          <Plus size={17} />
          Movimiento
        </button>
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
        <Metric l="Ventas conciliadas desde el corte" v={summary.salesTotal} />
        <Metric
          l="Egresos verificados desde el corte"
          v={summary.operatingExpenses}
        />
        <Metric
          l="Compromisos aún pendientes"
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
          <h2 className="font-black">Próximos pagos</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {obligations.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#deded5] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black">{item.name}</p>
                    <p className="mt-1 text-xs text-[#777]">
                      Vence {formatDate(item.dueDate)}
                      {item.kind === "loan_payment"
                        ? " · Sólo flujo de caja"
                        : ""}
                    </p>
                  </div>
                  <p className="money font-black">{formatClp(item.amount)}</p>
                </div>
                {item.note && (
                  <p className="mt-3 text-xs text-[#777]">{item.note}</p>
                )}
              </div>
            ))}
          </div>
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
    </main>
  );
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
}: {
  ingredients: { id: string; name: string; base_unit: string }[];
  onClose: () => void;
  operation?: Operation;
}) {
  const [type, setType] = useState<OperationType>(
    operation?.type || "purchase",
  );
  const [ingredient, setIngredient] = useState(operation?.ingredientId || "");
  const [category, setCategory] = useState(
    operation?.category || "Materias primas",
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
            {editing ? "Editar movimiento" : "Nuevo movimiento"}
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
              disabled={!!operation?.ingredientId}
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
              defaultValue={
                operation?.date || new Date().toISOString().slice(0, 10)
              }
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Descripción
            <input
              name="description"
              required
              defaultValue={operation?.description}
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
                defaultValue={operation?.gross}
                className="input mt-2"
              />
            </label>
            <label className="text-xs font-bold">
              IVA
              <select
                name="taxMode"
                defaultValue={operation?.taxRate === 0 ? "exempt" : "included"}
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
                defaultValue={operation?.paymentMethod || "cash"}
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
              defaultValue={operation?.note}
              className="input mt-2 min-h-20 py-3"
            />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            {editing ? "Guardar corrección" : "Guardar movimiento"}
          </button>
        </form>
      </div>
    </div>
  );
}
