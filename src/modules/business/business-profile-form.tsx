"use client";

import { useActionState } from "react";
import { Building2, CheckCircle2, Save } from "lucide-react";
import {
  saveBusinessProfileAction,
  type BusinessProfileActionState,
} from "./actions";
import type { BusinessProfile } from "./types";

const initialState: BusinessProfileActionState = { ok: false, message: "" };

export function BusinessProfileForm({ data }: { data: BusinessProfile }) {
  const [state, action, pending] = useActionState(
    saveBusinessProfileAction,
    initialState,
  );
  return (
    <form action={action} className="card p-5 md:p-7">
      <div className="flex items-start gap-4 border-b border-[#e2e2d9] pb-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7efe2] text-[#235b45]">
          <Building2 size={23} />
        </span>
        <div>
          <h2 className="text-xl font-black">Identificación de la empresa</h2>
          <p className="mt-1 text-sm leading-6 text-[#747970]">
            Estos datos representan al negocio dentro del ERP y servirán como
            base para documentos e informes.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field
          label="Nombre comercial"
          name="name"
          value={data.name}
          required
        />
        <Field
          label="Razón social"
          name="legalName"
          value={data.legalName}
          required
        />
        <Field label="RUT empresa" name="rut" value={data.rut} required />
        <Field
          label="Giro o actividad"
          name="businessActivity"
          value={data.businessActivity}
        />
        <Field
          label="Dirección comercial"
          name="address"
          value={data.address}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Comuna" name="commune" value={data.commune} />
          <Field label="Ciudad" name="city" value={data.city} />
        </div>
        <Field
          label="Correo de contacto"
          name="contactEmail"
          value={data.contactEmail}
          type="email"
        />
        <Field label="Teléfono" name="phone" value={data.phone} type="tel" />
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-[#f3f4ec] p-4 text-sm sm:grid-cols-2">
        <div>
          <span className="block text-xs font-black uppercase tracking-wider text-[#777]">
            Moneda
          </span>
          <b className="mt-1 block">{data.currency}</b>
        </div>
        <div>
          <span className="block text-xs font-black uppercase tracking-wider text-[#777]">
            Zona horaria
          </span>
          <b className="mt-1 block">{data.timezone}</b>
        </div>
      </div>

      {state.message && (
        <p
          role="status"
          className={`mt-5 flex items-center gap-2 rounded-xl border p-3 text-sm font-bold ${state.ok ? "border-[#b9d7bc] bg-[#eef7ec] text-[#235b45]" : "border-[#dfaaa0] bg-[#fff0ed] text-[#8a2f24]"}`}
        >
          {state.ok && <CheckCircle2 size={17} />}
          {state.message}
        </p>
      )}

      <button
        disabled={pending}
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#235b45] px-5 font-black text-white disabled:cursor-wait disabled:opacity-60 sm:ml-auto sm:w-auto"
      >
        <Save size={18} /> {pending ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-xs font-black text-[#4f554f]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={value}
        className="input mt-2"
      />
    </label>
  );
}
