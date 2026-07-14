import Link from "next/link";
import { BookOpen, Boxes, LayoutDashboard, ShoppingCart } from "lucide-react";
import { signOutAction } from "@/modules/auth/actions";
export function PosShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: "sales" | "pos" | "products";
}) {
  return (
    <div className="min-h-screen bg-[#f7f6ee]">
      <header className="flex h-16 items-center justify-between border-b border-[#dfdfd5] bg-[#fffef9] px-4 md:px-7">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#d8f070] font-black text-[#235b45]">
            K
          </span>
          <span className="font-black text-[#235b45]">ERP KUMERA</span>
        </Link>
        <nav className="flex items-center gap-1 text-xs font-bold">
          <Nav href="/" label="Apertura" icon={<BookOpen size={16} />} />
          <Nav
            href="/ventas"
            label="Ventas"
            active={active === "sales"}
            icon={<LayoutDashboard size={16} />}
          />
          <Nav
            href="/caja"
            label="Caja"
            active={active === "pos"}
            icon={<ShoppingCart size={16} />}
          />
          <Nav
            href="/productos"
            label="Productos"
            active={active === "products"}
            icon={<Boxes size={16} />}
          />
        </nav>
        <form action={signOutAction}>
          <button className="text-xs font-bold text-[#777] hover:text-[#a33d20]">
            Salir
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
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 ${active ? "bg-[#235b45] text-white" : "text-[#62675f] hover:bg-[#eeeFe6]"}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
