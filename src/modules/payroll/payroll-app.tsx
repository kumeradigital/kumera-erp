"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Calculator,
  CheckCircle2,
  FileText,
  Printer,
  Save,
  UsersRound,
} from "lucide-react";
import { savePayrollSlipAction } from "./actions";
import { calculatePayroll } from "./calculations";
import type {
  PayrollCalculation,
  PayrollEmployee,
  PayrollInput,
  PayrollPageData,
} from "./types";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const emptyInput: PayrollInput = {
  workedDays: 30,
  contractualDays: 30,
  otherTaxableEarnings: 0,
  otherNonTaxableEarnings: 0,
  advances: 0,
  otherDeductions: 0,
};

export function PayrollApp({ data }: { data: PayrollPageData }) {
  const [employeeId, setEmployeeId] = useState(data.employees[0]?.id || "");
  const employee = data.employees.find((item) => item.id === employeeId)!;
  const saved = data.slips.find((item) => item.employeeId === employeeId);
  const [drafts, setDrafts] = useState<Record<string, PayrollInput>>(() =>
    Object.fromEntries(
      data.employees.map((item) => {
        const slip = data.slips.find(
          (candidate) => candidate.employeeId === item.id,
        );
        return [
          item.id,
          slip
            ? {
                workedDays: slip.workedDays,
                contractualDays: slip.contractualDays,
                otherTaxableEarnings: slip.otherTaxableEarnings,
                otherNonTaxableEarnings: slip.otherNonTaxableEarnings,
                advances: slip.advances,
                otherDeductions: slip.otherDeductions,
              }
            : emptyInput,
        ];
      }),
    ),
  );
  const input = drafts[employeeId] || emptyInput;
  const calculation = useMemo(
    () => calculatePayroll(employee, input),
    [employee, input],
  );
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function update(field: keyof PayrollInput, value: number) {
    setDrafts((current) => ({
      ...current,
      [employeeId]: { ...input, [field]: Math.max(0, value || 0) },
    }));
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      const result = await savePayrollSlipAction({
        employeeId,
        period: "2026-10-01",
        ...input,
        paymentStatus: "paid",
        paidOn: saved?.paidOn || "2026-11-01",
        notes: saved?.notes || "Liquidación de octubre de 2026.",
      });
      setMessage(result.message);
    });
  }

  if (!employee) return null;
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
            Personas y remuneraciones
          </p>
          <h1 className="mt-2 text-3xl font-black">Liquidaciones de sueldo</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#747970]">
            El contrato registra el sueldo base bruto. El sistema calcula la
            gratificación, descuentos previsionales y líquido final.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-[#235b45] px-4 text-sm font-black text-[#235b45]"
          >
            <Printer size={18} /> Imprimir liquidación
          </button>
          <button
            onClick={save}
            disabled={!data.databaseReady || isPending}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-[#235b45] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save size={18} /> {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>

      {!data.databaseReady && (
        <p className="no-print mt-5 rounded-xl border border-[#e7c76f] bg-[#fff8dc] p-4 text-sm font-bold text-[#6d5614]">
          El ejercicio funciona con los datos precargados. Falta aplicar la
          migración de remuneraciones para guardar cambios en la base de datos.
        </p>
      )}
      {message && (
        <p className="no-print mt-5 flex items-center gap-2 rounded-xl border border-[#b9d7bc] bg-[#eef7ec] p-3 text-sm font-bold text-[#235b45]">
          <CheckCircle2 size={17} /> {message}
        </p>
      )}

      <div className="no-print mt-6 grid gap-3 sm:grid-cols-2">
        {data.employees.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setEmployeeId(item.id);
              setMessage("");
            }}
            className={`card flex items-center gap-4 p-4 text-left ${item.id === employeeId ? "ring-2 ring-[#235b45]" : ""}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7efe2] text-[#235b45]">
              <UsersRound size={21} />
            </span>
            <span>
              <b className="block">{item.fullName}</b>
              <small className="mt-1 block text-[#747970]">
                {item.jobTitle} · Base {money.format(item.baseSalary)}
              </small>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[370px_1fr]">
        <section className="no-print card h-fit p-5">
          <div className="flex items-center gap-3 border-b border-[#e2e2d9] pb-4">
            <Calculator className="text-[#235b45]" />
            <div>
              <h2 className="font-black">Variables de octubre</h2>
              <p className="mt-1 text-xs text-[#747970]">
                Modifica los datos y el cálculo se actualiza de inmediato.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <NumberField
              label="Días trabajados de 30"
              value={input.workedDays}
              max={30}
              onChange={(value) => update("workedDays", value)}
            />
            <ReadOnlyField
              label="Sueldo base contractual"
              value={employee.baseSalary}
            />
            <NumberField
              label="Otros haberes imponibles"
              value={input.otherTaxableEarnings}
              onChange={(value) => update("otherTaxableEarnings", value)}
            />
            <NumberField
              label="Otros haberes no imponibles"
              value={input.otherNonTaxableEarnings}
              onChange={(value) => update("otherNonTaxableEarnings", value)}
            />
            <NumberField
              label="Anticipos ya pagados"
              value={input.advances}
              onChange={(value) => update("advances", value)}
            />
            <NumberField
              label="Otros descuentos autorizados"
              value={input.otherDeductions}
              onChange={(value) => update("otherDeductions", value)}
            />
          </div>
          <div className="mt-5 rounded-xl bg-[#f3f4ec] p-4 text-sm leading-6">
            <b>Líquido mensual normal:</b>{" "}
            {money.format(calculatePayroll(employee, emptyInput).netPay)}
            <br />
            <b>Líquido devengado:</b>{" "}
            {money.format(calculation.netBeforeAdvances)}
            <br />
            <b>Saldo después de anticipos:</b>{" "}
            {money.format(calculation.netPay)}
          </div>
        </section>

        <Payslip
          data={data}
          employee={employee}
          input={input}
          calculation={calculation}
          notes={saved?.notes}
        />
      </div>
    </main>
  );
}

function Payslip({
  data,
  employee,
  input,
  calculation,
  notes,
}: {
  data: PayrollPageData;
  employee: PayrollEmployee;
  input: PayrollInput;
  calculation: PayrollCalculation;
  notes?: string;
}) {
  return (
    <article className="payroll-print card overflow-hidden bg-white">
      <header className="border-b-4 border-[#235b45] p-6 md:p-8">
        <div className="flex flex-wrap justify-between gap-5">
          <div>
            <p className="text-2xl font-black text-[#235b45]">
              {data.business.legalName}
            </p>
            <p className="mt-1 text-sm">RUT {data.business.rut}</p>
            <p className="text-sm">
              {data.business.address}, {data.business.commune}
            </p>
          </div>
          <div className="text-left md:text-right">
            <FileText className="mb-2 inline text-[#235b45]" />
            <h2 className="text-xl font-black">Liquidación de sueldo</h2>
            <p className="mt-1 font-bold">Octubre 2026</p>
          </div>
        </div>
      </header>

      <div className="p-6 md:p-8">
        <div className="grid gap-3 rounded-xl bg-[#f3f4ec] p-4 text-sm sm:grid-cols-2">
          <Detail label="Trabajador" value={employee.fullName} />
          <Detail label="RUT" value={employee.rut} />
          <Detail label="Cargo" value={employee.jobTitle} />
          <Detail label="Días trabajados" value={`${input.workedDays} de 30`} />
          <Detail
            label="AFP"
            value={`${employee.afpName} ${(employee.afpRate * 100).toFixed(2)}%`}
          />
          <Detail
            label="Salud"
            value={`${employee.healthSystem} ${(employee.healthRate * 100).toFixed(0)}%`}
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Breakdown
            title="Haberes"
            rows={[
              ["Sueldo base devengado", calculation.baseEarned],
              ["Gratificación artículo 50", calculation.gratification],
              ["Otros imponibles", input.otherTaxableEarnings],
              ["Colación", calculation.mealAllowance],
              ["Movilización", calculation.transportAllowance],
              ["Otros no imponibles", input.otherNonTaxableEarnings],
            ]}
            totalLabel="Total haberes"
            total={calculation.totalEarnings}
          />
          <Breakdown
            title="Descuentos"
            rows={[
              [`AFP ${employee.afpName}`, calculation.afpDeduction],
              [employee.healthSystem, calculation.healthDeduction],
              [
                "Seguro de cesantía trabajador",
                calculation.unemploymentDeduction,
              ],
              ["Impuesto único", calculation.incomeTax],
              ["Anticipos", input.advances],
              ["Otros descuentos", input.otherDeductions],
            ]}
            totalLabel="Total descuentos"
            total={calculation.totalDeductions}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#235b45] p-5 text-white">
          <span className="font-black">Líquido a pagar</span>
          <strong className="money text-3xl">
            {money.format(calculation.netPay)}
          </strong>
        </div>
        {input.advances > 0 && (
          <p className="mt-3 text-sm text-[#666]">
            Líquido devengado antes de anticipos:{" "}
            {money.format(calculation.netBeforeAdvances)}.
          </p>
        )}
        {notes && (
          <p className="mt-4 text-sm text-[#666]">Observación: {notes}</p>
        )}
        <div className="mt-16 grid grid-cols-2 gap-10 text-center text-sm">
          <div className="border-t border-[#333] pt-2">Firma trabajador</div>
          <div className="border-t border-[#333] pt-2">Firma empleador</div>
        </div>
      </div>
    </article>
  );
}

function Breakdown({
  title,
  rows,
  totalLabel,
  total,
}: {
  title: string;
  rows: Array<[string, number]>;
  totalLabel: string;
  total: number;
}) {
  return (
    <section>
      <h3 className="border-b-2 border-[#235b45] pb-2 font-black">{title}</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]: [string, number]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-[#666]">{label}</dt>
            <dd className="money font-bold">{money.format(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t pt-3 font-black">
          <dt>{totalLabel}</dt>
          <dd className="money">{money.format(total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] font-black uppercase tracking-wider text-[#777]">
        {label}
      </span>
      <b className="mt-1 block">{value}</b>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <label className="text-xs font-black text-[#4f554f]">
      {label}
      <input
        className="input money mt-2"
        type="number"
        min="0"
        max={max}
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: number }) {
  return (
    <label className="text-xs font-black text-[#4f554f]">
      {label}
      <span className="input money mt-2 flex items-center bg-[#f4f4ef]">
        {money.format(value)}
      </span>
    </label>
  );
}
