import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { PosShell } from "@/modules/pos/pos-shell";
import { getTodaySalesTotal, getBusinessPulse } from "@/modules/pos/data";
import { getOperationsData } from "@/modules/operations/data";
import { createClient } from "@/server/supabase/server";
import { formatClp } from "@/shared/money";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!membership) return <MissingBusiness />;

  const [{ data: business }, { data: profile }, operations, pulse, today] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("name")
        .eq("id", membership.business_id)
        .single(),
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single(),
      getOperationsData(),
      getBusinessPulse(),
      getTodaySalesTotal(),
    ]);

  const firstName = profile?.display_name?.split(" ")[0] || "Javier";
  const summary = operations.summary;
  const projectedResult = pulse.projectedMonthlyOperatingResult;
  const pendingControls = operations.provisions.filter(
    (item) =>
      item.status !== "reconciled" &&
      item.status !== "cancelled" &&
      item.trackingMode === "fixed_target",
  ).length;

  return (
    <PosShell active="home">
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        <section className="overflow-hidden rounded-[30px] bg-[#1f6048] px-6 py-7 text-white shadow-sm md:px-9 md:py-9">
          <div className="flex flex-wrap items-start justify-between gap-7">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-[#d8f070]">
                <Sparkles size={16} /> Centro de control
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
                Buenos días, {firstName}.
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/75 md:text-base">
                Esta es la operación real de {business?.name || "tu negocio"},
                no el registro histórico de su apertura.
              </p>
            </div>
            <Link
              href="/caja"
              prefetch={false}
              className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#d8f070] px-5 font-black text-[#194735] transition hover:-translate-y-0.5"
            >
              <ShoppingCart size={20} /> Ir a Caja <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <HomeMetric
            label="Venta de hoy"
            value={today.total}
            detail={`Actualizado ${today.updatedAt}`}
            icon={<CircleDollarSign size={21} />}
            accent
          />
          <HomeMetric
            label="Liquidez disponible"
            value={summary.availableLiquidity}
            detail="Después de compromisos exigibles"
            icon={<WalletCards size={21} />}
          />
          <HomeMetric
            label="IVA en formación"
            value={summary.estimatedVatPayable}
            detail="Referencia para el próximo F29"
            icon={<Landmark size={21} />}
            warning
          />
          <HomeMetric
            label="Resultado mensual proyectado"
            value={projectedResult}
            detail={`${pulse.observedDays} jornadas reales observadas`}
            icon={<ChartNoAxesCombined size={21} />}
            danger={projectedResult < 0}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
          <div className="card p-5 md:p-6">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#657067]">
              Trabajo diario
            </p>
            <h2 className="mt-2 text-2xl font-black">Accesos principales</h2>
            <p className="mt-1 text-sm text-[#747970]">
              Cada tarea apunta ahora al módulo vigente del ERP.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <QuickLink
                href="/ventas"
                title="Ventas"
                detail="Resumen, medios de pago y productos"
                icon={<ChartNoAxesCombined />}
              />
              <QuickLink
                href="/ventas?view=planning"
                title="Producción"
                detail="Plan sugerido desde ventas reales"
                icon={<PackageSearch />}
              />
              <QuickLink
                href="/operacion"
                title="Finanzas"
                detail="Liquidez, gastos y provisiones"
                icon={<ReceiptText />}
              />
              <QuickLink
                href="/costos"
                title="Costeo"
                detail="Materias primas, recetas y márgenes"
                icon={<Calculator />}
              />
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <p className="text-xs font-black uppercase tracking-[.14em] text-[#657067]">
              Por revisar
            </p>
            <h2 className="mt-2 text-2xl font-black">Control del negocio</h2>
            <div className="mt-5 space-y-3">
              <StatusRow
                label="Provisiones con saldo"
                value={`${pendingControls}`}
                href="/operacion"
              />
              <StatusRow
                label="Venta diaria promedio"
                value={formatClp(pulse.averageDailySales)}
                href="/ventas"
              />
              <StatusRow
                label="Datos de la empresa"
                value="Revisar"
                href="/empresa"
              />
            </div>
            <p className="mt-5 rounded-xl bg-[#f2f3eb] p-3 text-xs leading-5 text-[#676d65]">
              La puesta en marcha sigue disponible como archivo histórico desde
              la ficha de empresa.
            </p>
          </div>
        </section>
      </main>
    </PosShell>
  );
}

function HomeMetric({
  label,
  value,
  detail,
  icon,
  accent = false,
  warning = false,
  danger = false,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  accent?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${accent ? "border-[#b9d7bc] bg-[#eef7ec]" : warning ? "border-[#e6d397] bg-[#fff9e8]" : danger ? "border-[#e5b4aa] bg-[#fff0ed]" : "border-[#e1e1d7] bg-[#fffef9]"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[.1em] text-[#646b64]">
          {label}
        </p>
        <span className="text-[#235b45]">{icon}</span>
      </div>
      <p className="money mt-4 text-3xl font-black">{formatClp(value)}</p>
      <p className="mt-2 text-xs text-[#777]">{detail}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  detail,
  icon,
}: {
  href: string;
  title: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-4 rounded-2xl border border-[#dfdfd5] bg-[#faf9f4] p-4 transition hover:border-[#a8c2ac] hover:bg-[#f0f6ed]"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e6eddf] text-[#235b45]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block">{title}</b>
        <span className="mt-1 block text-xs leading-5 text-[#777]">
          {detail}
        </span>
      </span>
      <ArrowRight
        size={17}
        className="text-[#8a8e86] transition group-hover:translate-x-1"
      />
    </Link>
  );
}

function StatusRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex items-center justify-between gap-4 rounded-xl border border-[#e2e2d8] px-4 py-3 text-sm hover:bg-[#f5f6ef]"
    >
      <span className="text-[#676d65]">{label}</span>
      <b className="text-right text-[#235b45]">{value}</b>
    </Link>
  );
}

function MissingBusiness() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f6ee] p-6">
      <div className="card max-w-lg p-8 text-center">
        <Building2 className="mx-auto text-[#235b45]" />
        <h1 className="mt-4 text-2xl font-black">Sin negocio asignado</h1>
        <p className="mt-3 text-sm text-[#747970]">
          Un administrador debe asociar este usuario a una empresa.
        </p>
      </div>
    </main>
  );
}
