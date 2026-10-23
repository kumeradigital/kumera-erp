import Link from "next/link";
import { Archive, ShieldCheck, UserRound } from "lucide-react";
import { PosShell } from "@/modules/pos/pos-shell";
import { BusinessProfileForm } from "@/modules/business/business-profile-form";
import { getBusinessProfile } from "@/modules/business/data";

export default async function BusinessPage() {
  const data = await getBusinessProfile();
  return (
    <PosShell active="business">
      <main className="mx-auto max-w-6xl p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
              Configuración
            </p>
            <h1 className="mt-2 text-3xl font-black">Datos de la empresa</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#747970]">
              Una ficha única para identificar correctamente al negocio en todo
              el ERP.
            </p>
          </div>
          <Link
            href="/puesta-en-marcha"
            prefetch={false}
            className="flex items-center gap-2 rounded-xl border border-[#235b45] px-4 py-3 text-sm font-black text-[#235b45]"
          >
            <Archive size={17} /> Ver puesta en marcha histórica
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
          <BusinessProfileForm data={data} />
          <aside className="space-y-4">
            <div className="card p-5">
              <UserRound className="text-[#235b45]" />
              <p className="mt-4 text-xs font-black uppercase tracking-wider text-[#777]">
                Administrador
              </p>
              <p className="mt-2 font-black">{data.administratorName}</p>
              <p className="mt-1 break-all text-sm text-[#747970]">
                {data.administratorEmail}
              </p>
            </div>
            <div className="card p-5">
              <ShieldCheck className="text-[#235b45]" />
              <p className="mt-4 font-black">Registro histórico protegido</p>
              <p className="mt-2 text-sm leading-6 text-[#747970]">
                {data.openingStatus === "closed"
                  ? `La puesta en marcha está cerrada${data.openingClosedAt ? ` desde el ${new Date(data.openingClosedAt).toLocaleDateString("es-CL")}` : ""}.`
                  : "La puesta en marcha aún está abierta."}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </PosShell>
  );
}
