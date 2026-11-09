"use client";

import { useActionState } from "react";
import { provisionBusinessAction, type ProvisionState } from "./admin-actions";

const initial: ProvisionState = { ok: false, message: "" };

export function ProvisionForm() {
  const [state, action, pending] = useActionState(
    provisionBusinessAction,
    initial,
  );
  return (
    <form action={action} className="card grid gap-4 p-6 md:grid-cols-2">
      <h2 className="text-xl font-black md:col-span-2">Crear cliente beta</h2>
      <Field name="businessName" label="Nombre comercial" required />
      <Field name="legalName" label="Razón social" />
      <Field name="rut" label="RUT" />
      <Field name="ownerName" label="Nombre del propietario" required />
      <Field name="email" label="Correo de acceso" type="email" required />
      <Field
        name="temporaryPassword"
        label="Clave temporal"
        type="password"
        required
      />
      <label className="text-xs font-bold md:col-span-2">
        Plan
        <select
          name="plan"
          className="mt-2 h-12 w-full rounded-xl border border-[#d7d7ce] bg-white px-4"
        >
          <option value="costs">Kumera Costos</option>
          <option value="management">Kumera Gestión</option>
          <option value="operations">Kumera Operación</option>
        </select>
      </label>
      <fieldset className="rounded-2xl border border-[#deded4] p-4 md:col-span-2">
        <legend className="px-2 text-xs font-black uppercase tracking-wide text-[#657067]">
          Módulos habilitados
        </legend>
        <p className="mb-3 text-xs text-[#777]">
          El núcleo siempre está incluido. Para el primer beta deja únicamente
          Costeo.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["costing", "Costeo"],
            ["inventory", "Inventario"],
            ["finance", "Finanzas"],
            ["pos", "Caja"],
            ["sales", "Ventas"],
            ["production", "Producción"],
            ["payroll", "Personas"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2 rounded-xl bg-[#f5f5ee] p-3 text-sm font-bold"
            >
              <input
                type="checkbox"
                name="modules"
                value={value}
                defaultChecked={value === "costing"}
                className="size-4"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {state.message && (
        <p
          className={`rounded-xl p-3 text-sm md:col-span-2 ${state.ok ? "bg-[#eef7ec] text-[#235b45]" : "bg-[#f8e6df] text-[#a13f20]"}`}
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-xl bg-[#235b45] px-5 font-black text-white disabled:opacity-50 md:col-span-2"
      >
        {pending ? "Creando…" : "Crear empresa y credenciales"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-bold">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d7ce] px-4"
      />
    </label>
  );
}
