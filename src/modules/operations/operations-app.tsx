"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import { saveOperationAction } from "./actions";
import { OPERATION_CATEGORIES } from "./categories";
import { operationLabels, type Operation, type OperationType } from "./types";
export function OperationsApp({
  operations,
  ingredients,
  ledger,
  summary,
}: {
  operations: Operation[];
  ingredients: { id: string; name: string; base_unit: string }[];
  ledger: { status: string; closed_at: string | null } | null;
  summary: {
    salesTotal: number;
    operatingIncome: number;
    operatingExpenses: number;
    operatingFlow: number;
    investment: number;
    recovered: number;
    pending: number;
  };
}) {
  const [open, setOpen] = useState(false);
  return (
    <main className="mx-auto max-w-7xl p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
            Operación diaria
          </p>
          <h1 className="mt-2 text-3xl font-black">Compras y gastos</h1>
          <p className="mt-2 text-sm text-[#747970]">
            Pagos e ingresos reales posteriores a la puesta en marcha.
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
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric l="Ventas cobradas" v={summary.salesTotal} />
        <Metric l="Egresos operacionales" v={summary.operatingExpenses} />
        <Metric l="Flujo operacional" v={summary.operatingFlow} />
        <Metric l="Inversión inicial" v={summary.investment} />
        <Metric l="Inversión recuperada" v={summary.recovered} />
        <Metric l="Inversión pendiente" v={summary.pending} />
      </div>
      {ledger?.status !== "closed" && (
        <p className="mt-4 rounded-xl bg-[#fff4d4] p-4 text-sm text-[#795f0d]">
          Cierra primero la Puesta en marcha para fijar oficialmente la
          inversión por recuperar.
        </p>
      )}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b bg-[#f2f2ea] text-xs uppercase text-[#777]">
            <tr>
              <th className="p-4">Fecha</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Materia prima</th>
              <th className="text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {operations.map((o) => (
              <tr key={o.id}>
                <td className="p-4">
                  {new Date(o.date + "T12:00:00").toLocaleDateString("es-CL")}
                </td>
                <td className="font-bold">{o.description}</td>
                <td>{operationLabels[o.type]}</td>
                <td>{o.category}</td>
                <td>{o.ingredientName || "—"}</td>
                <td
                  className={`pr-4 text-right font-black ${["other_income", "owner_contribution"].includes(o.type) ? "text-[#235b45]" : ""}`}
                >
                  {["other_income", "owner_contribution"].includes(o.type)
                    ? "+"
                    : "−"}
                  {formatClp(o.gross)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!operations.length && (
          <p className="p-10 text-center text-sm text-[#777]">
            Todavía no hay movimientos operacionales.
          </p>
        )}
      </div>
      {open && (
        <OperationDialog
          ingredients={ingredients}
          onClose={() => setOpen(false)}
        />
      )}
    </main>
  );
}
function Metric({ l, v }: { l: string; v: number }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold uppercase text-[#777]">{l}</p>
      <p className="money mt-2 text-2xl font-black">{formatClp(v)}</p>
    </div>
  );
}
function OperationDialog({
  ingredients,
  onClose,
}: {
  ingredients: { id: string; name: string; base_unit: string }[];
  onClose: () => void;
}) {
  const [type, setType] = useState<OperationType>("purchase");
  const [ingredient, setIngredient] = useState("");
  const [category, setCategory] = useState("Materias primas");
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex justify-between">
          <h2 className="text-2xl font-black">Nuevo movimiento</h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <form
          action={async (f) => {
            await saveOperationAction(f);
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Tipo
            <select
              name="type"
              value={type}
              onChange={(e) => {
                const next = e.target.value as OperationType;
                setType(next);
                setCategory(
                  next === "fixed_cost"
                    ? "Servicios básicos"
                    : next === "owner_withdrawal"
                      ? "Retiros personales"
                      : next === "purchase"
                        ? "Materias primas"
                        : "Otros",
                );
              }}
              className="input mt-2"
            >
              {Object.entries(operationLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Fecha
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Descripción
            <input name="description" required className="input mt-2" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Monto pagado/recibido
              <input
                name="amount"
                type="number"
                required
                className="input mt-2"
              />
            </label>
            <label className="text-xs font-bold">
              IVA
              <select name="taxMode" className="input mt-2">
                <option value="included">IVA incluido</option>
                <option value="exempt">Exento/sin crédito</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">
              Categoría
              <select
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="input mt-2"
              >
                {OPERATION_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold">
              Medio de pago
              <select name="paymentMethod" className="input mt-2">
                <option value="cash">Efectivo</option>
                <option value="debit">Débito</option>
                <option value="credit">Crédito</option>
                <option value="transfer">Transferencia</option>
              </select>
            </label>
          </div>
          {type === "purchase" && (
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
            <input name="supplier" className="input mt-2" />
          </label>
          <label className="block text-xs font-bold">
            Nota
            <textarea name="note" className="input mt-2 min-h-20 py-3" />
          </label>
          <button className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white">
            Guardar movimiento
          </button>
        </form>
      </div>
    </div>
  );
}
