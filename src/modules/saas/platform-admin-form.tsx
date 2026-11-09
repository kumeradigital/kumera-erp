"use client";

import { useActionState } from "react";
import {
  createPlatformAdminAction,
  type ProvisionState,
} from "./admin-actions";

const initial: ProvisionState = { ok: false, message: "" };

export function PlatformAdminForm() {
  const [state, action, pending] = useActionState(
    createPlatformAdminAction,
    initial,
  );
  return (
    <form action={action} className="card grid gap-4 p-6 md:grid-cols-3">
      <div className="md:col-span-3">
        <h2 className="text-xl font-black">Cuenta de administración</h2>
        <p className="mt-1 text-sm text-[#747970]">
          Administra la plataforma sin pertenecer a GOYA SPA ni a otro cliente.
        </p>
      </div>
      <Field name="displayName" label="Nombre" required />
      <Field name="email" label="Correo" type="email" required />
      <Field
        name="temporaryPassword"
        label="Clave temporal"
        type="password"
        required
      />
      {state.message && (
        <p
          className={`rounded-xl p-3 text-sm md:col-span-3 ${state.ok ? "bg-[#eef7ec] text-[#235b45]" : "bg-[#f8e6df] text-[#a13f20]"}`}
        >
          {state.message}
        </p>
      )}
      <button
        disabled={pending}
        className="h-12 rounded-xl bg-[#235b45] px-5 font-black text-white disabled:opacity-50 md:col-span-3"
      >
        {pending ? "Creando…" : "Crear administrador independiente"}
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
        minLength={type === "password" ? 10 : undefined}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d7ce] px-4"
      />
    </label>
  );
}
