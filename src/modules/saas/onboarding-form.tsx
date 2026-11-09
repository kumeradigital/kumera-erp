"use client";

import { useActionState, useState } from "react";
import {
  completeOnboardingAction,
  type OnboardingState,
} from "./onboarding-actions";

const initial: OnboardingState = { ok: false, message: "" };
const steps = [
  "Seguridad",
  "Tu empresa",
  "Local",
  "Cómo operas",
  "Ventas",
  "Primer producto",
];

export function OnboardingForm({
  defaults,
}: {
  defaults: { name: string; legalName: string; rut: string };
}) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initial,
  );
  return (
    <form action={action} className="card mx-auto max-w-2xl p-6 md:p-8">
      <div className="flex gap-2">
        {steps.map((label, index) => (
          <span
            key={label}
            title={label}
            className={`h-2 flex-1 rounded-full ${index <= step ? "bg-[#235b45]" : "bg-[#e2e3da]"}`}
          />
        ))}
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-[.14em] text-[#657067]">
        Paso {step + 1} de {steps.length} · {steps[step]}
      </p>
      <div className={step === 0 ? "block" : "hidden"}>
        <Panel
          title="Protege tu acceso"
          detail="Reemplaza la clave temporal que recibiste."
        >
          <Field
            name="password"
            label="Nueva contraseña"
            type="password"
            required
            minLength={10}
          />
        </Panel>
      </div>
      <div className={step === 1 ? "block" : "hidden"}>
        <Panel
          title="Identifica tu empresa"
          detail="Estos datos aparecerán en el ERP."
        >
          <Field
            name="name"
            label="Nombre comercial"
            defaultValue={defaults.name}
            required
          />
          <Field
            name="legalName"
            label="Razón social"
            defaultValue={defaults.legalName}
            required
          />
          <Field name="rut" label="RUT" defaultValue={defaults.rut} required />
          <Field name="activity" label="Giro o actividad" />
        </Panel>
      </div>
      <div className={step === 2 ? "block" : "hidden"}>
        <Panel
          title="Tu local principal"
          detail="Podrás añadir más locales en una etapa posterior."
        >
          <Field
            name="locationName"
            label="Nombre del local"
            defaultValue="Local principal"
            required
          />
          <Field name="address" label="Dirección" required />
          <Field name="commune" label="Comuna" required />
          <Field name="city" label="Ciudad" defaultValue="Santiago" required />
        </Panel>
      </div>
      <div className={step === 3 ? "block" : "hidden"}>
        <Panel
          title="¿Cómo opera tu negocio?"
          detail="Puedes elegir ambas opciones."
        >
          <Check
            name="businessModel"
            value="resale"
            label="Compro productos para revender"
          />
          <Check
            name="businessModel"
            value="manufactured"
            label="Elaboro mis propios productos"
          />
        </Panel>
      </div>
      <div className={step === 4 ? "block" : "hidden"}>
        <Panel
          title="Ventas y pagos"
          detail="Esto prepara los cálculos de comisión."
        >
          <Check name="salesChannels" value="store" label="Venta en local" />
          <Check
            name="salesChannels"
            value="delivery"
            label="Delivery o aplicaciones"
          />
          <Check name="paymentMethods" value="cash" label="Efectivo" />
          <Check name="paymentMethods" value="debit" label="Débito" />
          <Check name="paymentMethods" value="credit" label="Crédito" />
          <Check name="paymentMethods" value="transfer" label="Transferencia" />
        </Panel>
      </div>
      <div className={step === 5 ? "block" : "hidden"}>
        <Panel
          title="Ya tenemos lo esencial"
          detail="Entrarás a Costeo para crear tu primer producto con la guía correspondiente a reventa o elaboración."
        >
          <div className="rounded-2xl bg-[#eef7ec] p-4 text-sm leading-6 text-[#235b45]">
            Tu configuración queda guardada y podrás completarla
            progresivamente, sin enfrentar un ERP lleno de secciones vacías.
          </div>
        </Panel>
      </div>
      {state.message && (
        <p className="mt-4 rounded-xl bg-[#f8e6df] p-3 text-sm text-[#a13f20]">
          {state.message}
        </p>
      )}
      <div className="mt-7 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="rounded-xl border border-[#d7d7ce] px-5 py-3 font-black disabled:opacity-30"
        >
          Atrás
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="rounded-xl bg-[#235b45] px-5 py-3 font-black text-white"
          >
            Continuar
          </button>
        ) : (
          <button
            disabled={pending}
            className="rounded-xl bg-[#235b45] px-5 py-3 font-black text-white disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Entrar a Kumera Costos"}
          </button>
        )}
      </div>
    </form>
  );
}

function Panel({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 grid gap-4">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        <p className="mt-1 text-sm text-[#747970]">{detail}</p>
      </div>
      {children}
    </section>
  );
}
function Field(props: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
}) {
  const { label, ...input } = props;
  return (
    <label className="text-xs font-bold">
      {label}
      <input
        {...input}
        className="mt-2 h-12 w-full rounded-xl border border-[#d7d7ce] px-4"
      />
    </label>
  );
}
function Check({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-[#deded4] p-4 text-sm font-bold">
      <input type="checkbox" name={name} value={value} className="size-5" />
      {label}
    </label>
  );
}
