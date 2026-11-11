import Link from "next/link";
import {
  Building2,
  ChevronRight,
  History,
  House,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  ReceiptText,
  ShoppingCart,
  Sparkles,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { signOutAction } from "@/modules/auth/actions";
import { getWorkspaceContext } from "@/server/saas/access";
import type { ModuleKey } from "@/server/saas/types";

type ActiveArea =
  | "sales"
  | "closures"
  | "pos"
  | "products"
  | "costs"
  | "operations"
  | "inventory"
  | "getting-started"
  | "home"
  | "business"
  | "payroll";

type NavigationItem = {
  href: string;
  label: string;
  active: ActiveArea;
  module?: ModuleKey;
  icon: React.ReactNode;
};

export async function PosShell({
  children,
  active,
  kiosk = false,
}: {
  children: React.ReactNode;
  kiosk?: boolean;
  active: ActiveArea;
}) {
  const workspace = await getWorkspaceContext();
  const enabled = (module?: ModuleKey) =>
    !module || (workspace?.modules.includes(module) ?? true);
  const showGettingStarted = workspace?.showGettingStarted ?? false;
  const businessName = workspace?.businessName || "Tu negocio";
  const items: NavigationItem[] = [
    { href: "/", label: "Inicio", active: "home", icon: <House size={19} /> },
    ...(showGettingStarted
      ? [
          {
            href: "/comienza",
            label: "Comienza",
            active: "getting-started" as const,
            icon: <ListChecks size={19} />,
          },
        ]
      : []),
    {
      href: "/costos",
      label: "Costeo y precios",
      active: "costs",
      module: "costing",
      icon: <LineChart size={19} />,
    },
    {
      href: "/inventario",
      label: "Inventario",
      active: "inventory",
      module: "inventory",
      icon: <Warehouse size={19} />,
    },
    {
      href: "/operacion",
      label: "Finanzas",
      active: "operations",
      module: "finance",
      icon: <ReceiptText size={19} />,
    },
    {
      href: "/ventas",
      label: "Ventas",
      active: "sales",
      module: "sales",
      icon: <LayoutDashboard size={19} />,
    },
    {
      href: "/caja",
      label: "Caja",
      active: "pos",
      module: "pos",
      icon: <ShoppingCart size={19} />,
    },
    {
      href: "/cierres",
      label: "Cierres de caja",
      active: "closures",
      module: "pos",
      icon: <History size={19} />,
    },
    {
      href: "/remuneraciones",
      label: "Personas y remuneraciones",
      active: "payroll",
      module: "payroll",
      icon: <UsersRound size={19} />,
    },
    {
      href: "/empresa",
      label: "Empresa",
      active: "business",
      icon: <Building2 size={19} />,
    },
  ];

  if (kiosk) {
    return (
      <div className="h-[100dvh] min-w-0 overflow-hidden bg-[#f7f6ee]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f6ee] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#dfe1d8] bg-[#fffef9] p-4 lg:flex">
        <Brand businessName={businessName} />
        <p className="mt-7 px-3 text-[9px] font-black uppercase tracking-[.16em] text-[#8a8f87]">
          Tu ERP
        </p>
        <nav className="scrollbar mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map((item) =>
            enabled(item.module) ? (
              <SidebarLink
                key={`${item.href}-${item.label}`}
                item={item}
                active={active === item.active}
              />
            ) : (
              <LockedModule key={`${item.href}-${item.label}`} item={item} />
            ),
          )}
        </nav>
        <div className="mt-3 rounded-2xl bg-[#eef4eb] p-3">
          <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#66766c]">
            Plan actual
          </p>
          <p className="mt-1 text-xs font-bold text-[#235b45]">
            {workspace?.subscriptionStatus === "legacy"
              ? "Kumera completo"
              : "Módulos contratados"}
          </p>
        </div>
        <SignOut compact={false} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-16 items-center border-b border-[#dfdfd5] bg-[#fffef9]/95 px-3 backdrop-blur lg:hidden">
          <Brand businessName={businessName} compact />
          <details className="group relative ml-auto">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl bg-[#235b45] px-3 text-sm font-black text-white [&::-webkit-details-marker]:hidden">
              <Menu size={19} /> Menú
            </summary>
            <nav className="scrollbar absolute right-0 top-[calc(100%+0.6rem)] z-50 max-h-[75vh] w-72 overflow-y-auto rounded-2xl border border-[#deded4] bg-[#fffef9] p-2 shadow-[0_18px_45px_rgba(31,45,37,.2)]">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8a8f87]">
                {businessName}
              </div>
              {items.map((item) =>
                enabled(item.module) ? (
                  <SidebarLink
                    key={`${item.href}-${item.label}`}
                    item={item}
                    active={active === item.active}
                  />
                ) : (
                  <LockedModule
                    key={`${item.href}-${item.label}`}
                    item={item}
                  />
                ),
              )}
              <SignOut compact />
            </nav>
          </details>
        </header>
        {children}
      </div>
    </div>
  );
}

function Brand({
  businessName,
  compact = false,
}: {
  businessName: string;
  compact?: boolean;
}) {
  return (
    <Link href="/" prefetch={false} className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d8f070] text-lg font-black text-[#235b45]">
        K
      </span>
      <span className="min-w-0">
        <b className="block text-sm text-[#235b45]">ERP KUMERA</b>
        {!compact && (
          <span className="block truncate text-[11px] text-[#7b8079]">
            {businessName}
          </span>
        )}
      </span>
    </Link>
  );
}

function SidebarLink({
  item,
  active,
}: {
  item: NavigationItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${
        active
          ? "bg-[#235b45] text-white shadow-sm"
          : "text-[#59615a] hover:bg-[#eef1e8] hover:text-[#235b45]"
      }`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {active && <ChevronRight size={15} />}
    </Link>
  );
}

function LockedModule({ item }: { item: NavigationItem }) {
  return (
    <details className="group/locked relative">
      <summary
        title="Mejora tu plan para acceder a este módulo"
        className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#92968f] hover:bg-[#f3f1e8] [&::-webkit-details-marker]:hidden"
      >
        <span className="shrink-0 opacity-70">{item.icon}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <LockKeyhole size={14} className="text-[#a37c25]" />
      </summary>
      <div className="mx-2 mb-2 rounded-xl border border-[#e6d9ae] bg-[#fff8df] p-3 text-xs leading-5 text-[#675a31] shadow-sm">
        <p className="flex items-center gap-2 font-black text-[#765d16]">
          <Sparkles size={14} /> Disponible en un plan superior
        </p>
        <p className="mt-1">
          Mejora tu plan para acceder a {item.label} y ampliar las capacidades
          de tu ERP.
        </p>
      </div>
    </details>
  );
}

function SignOut({ compact }: { compact: boolean }) {
  return (
    <form action={signOutAction} className={compact ? "mt-2" : "mt-3"}>
      <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#777] hover:bg-[#fff0e9] hover:text-[#a33d20]">
        <LogOut size={18} /> Cerrar sesión
      </button>
    </form>
  );
}
