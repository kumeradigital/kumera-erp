import Link from "next/link";
import {
  BookOpen,
  Boxes,
  History,
  LayoutDashboard,
  LineChart,
  ShoppingCart,
  ReceiptText,
  Warehouse,
} from "lucide-react";
import { signOutAction } from "@/modules/auth/actions";
export function PosShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active:
    | "sales"
    | "closures"
    | "pos"
    | "products"
    | "costs"
    | "operations"
    | "inventory";
}) {
  return (
    <div className="min-h-screen bg-[#f7f6ee]">
      <header className="flex h-16 items-center gap-2 border-b border-[#dfdfd5] bg-[#fffef9] px-3 md:px-7">
        <Link
          href="/caja"
          className="flex shrink-0 items-center gap-2 md:hidden"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-[#d8f070] font-black text-[#235b45]">
            K
          </span>
          <span className="font-black text-[#235b45]">ERP KUMERA</span>
        </Link>
        <Link href="/" className="hidden shrink-0 items-center gap-2 md:flex">
          <span className="grid size-9 place-items-center rounded-xl bg-[#d8f070] font-black text-[#235b45]">
            K
          </span>
          <span className="hidden font-black text-[#235b45] md:inline">
            ERP KUMERA
          </span>
        </Link>
        <nav className="scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs font-bold md:flex md:justify-center">
          <Nav
            href="/"
            label="Puesta en marcha"
            icon={<BookOpen size={16} />}
          />
          <Nav
            href="/operacion"
            label="Compras y gastos"
            active={active === "operations"}
            icon={<ReceiptText size={16} />}
          />
          <Nav
            href="/inventario"
            label="Inventario"
            active={active === "inventory"}
            icon={<Warehouse size={16} />}
          />
          <Nav
            href="/ventas"
            label="Ventas"
            active={active === "sales"}
            icon={<LayoutDashboard size={16} />}
          />
          <Nav
            href="/cierres"
            label="Historial de cierres"
            active={active === "closures"}
            icon={<History size={16} />}
          />
          <Nav
            href="/caja"
            label="Iniciar caja"
            active={active === "pos"}
            icon={<ShoppingCart size={16} />}
          />
          <Nav
            href="/productos"
            label="Productos"
            active={active === "products"}
            icon={<Boxes size={16} />}
          />
          <Nav
            href="/costos"
            label="Costos"
            active={active === "costs"}
            icon={<LineChart size={16} />}
          />
        </nav>
        <form action={signOutAction} className="ml-auto shrink-0 md:ml-0">
          <button className="rounded-lg border border-[#d7d7ce] px-3 py-2 text-xs font-bold text-[#777] hover:text-[#a33d20] md:border-0 md:px-0">
            Cerrar sesión
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
function Nav({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 ${active ? "bg-[#235b45] text-white" : "text-[#62675f] hover:bg-[#eeeFe6]"}`}
    >
      {icon}
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}
