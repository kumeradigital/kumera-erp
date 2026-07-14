"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  ArrowDownToLine,
  BookOpen,
  CircleDollarSign,
  Copy,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { calculateTax, formatClp, type TaxMode } from "@/shared/money";
import { summarize } from "./calculations";
import {
  defaultCategories,
  entryLabels,
  type EntryType,
  type OpeningEntry,
} from "./types";
import {
  duplicateEntryAction,
  saveEntryAction,
  voidEntryAction,
} from "./actions";

const today = new Date().toISOString().slice(0, 10);
const seed: OpeningEntry[] = [
  {
    id: "capital",
    date: "2026-07-01",
    description: "Capital inicial disponible",
    category: "",
    type: "initial_capital",
    taxMode: "exempt",
    taxRate: 0,
    net: 5123000,
    tax: 0,
    total: 5123000,
    estimated: false,
    status: "active",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rent",
    date: "2026-07-02",
    description: "Primer mes de arriendo",
    category: "Arriendo",
    type: "expense",
    taxMode: "exempt",
    taxRate: 0,
    net: 675000,
    tax: 0,
    total: 675000,
    estimated: false,
    receipt: "Contrato.pdf",
    status: "active",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "deposit",
    date: "2026-07-02",
    description: "Mes de garantía del local",
    category: "Garantía",
    type: "deposit",
    taxMode: "exempt",
    taxRate: 0,
    net: 675000,
    tax: 0,
    total: 675000,
    estimated: false,
    receipt: "Contrato.pdf",
    status: "active",
    updatedAt: new Date().toISOString(),
  },
];

type Draft = {
  date: string;
  description: string;
  category: string;
  type: EntryType;
  taxMode: TaxMode;
  amount: string;
  estimated: boolean;
  note: string;
  receipt?: string;
  receiptFile?: File;
};
const emptyDraft: Draft = {
  date: today,
  description: "",
  category: "",
  type: "expense",
  taxMode: "included",
  amount: "",
  estimated: false,
  note: "",
};

export function OpeningApp({
  initialEntries = seed,
  initialCategories = defaultCategories,
  businessName = "Kumera Panadería",
  connected = false,
}: {
  initialEntries?: OpeningEntry[];
  initialCategories?: string[];
  businessName?: string;
  connected?: boolean;
}) {
  const [entries, setEntries] = useState<OpeningEntry[]>(initialEntries);
  const [categories, setCategories] = useState(initialCategories);
  const [view, setView] = useState<"dashboard" | "ledger" | "costs">(
    "dashboard",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EntryType | "all">("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<string>();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [showTax, setShowTax] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (connected) {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      const saved = localStorage.getItem("kumera-opening");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setEntries(data.entries || seed);
          setCategories(data.categories || defaultCategories);
        } catch {}
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [connected]);
  useEffect(() => {
    if (ready && !connected)
      localStorage.setItem(
        "kumera-opening",
        JSON.stringify({ entries, categories }),
      );
  }, [entries, categories, ready, connected]);
  const summary = useMemo(() => summarize(entries), [entries]);
  const visible = summary.active.filter(
    (e) =>
      (filter === "all" || e.type === filter) &&
      e.description.toLowerCase().includes(search.toLowerCase()),
  );
  const chart = useMemo(
    () =>
      summary.active
        .filter((e) => ["expense", "asset", "deposit"].includes(e.type))
        .sort((a, b) => a.date.localeCompare(b.date))
        .reduce<{ date: string; total: number }[]>((rows, e) => {
          const previous = rows.at(-1)?.total || 0;
          return [
            ...rows,
            {
              date: new Date(`${e.date}T12:00:00`).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
              }),
              total: previous + e.total,
            },
          ];
        }, []),
    [summary.active],
  );

  function openNew() {
    setEditing(undefined);
    setDraft({ ...emptyDraft, date: today });
    setDialog(true);
  }
  function openEdit(entry: OpeningEntry) {
    setEditing(entry.id);
    setDraft({
      date: entry.date,
      description: entry.description,
      category: entry.category,
      type: entry.type,
      taxMode: entry.taxMode,
      amount: String(entry.taxMode === "added" ? entry.net : entry.total),
      estimated: entry.estimated,
      note: entry.note || "",
      receipt: entry.receipt,
    });
    setDialog(true);
  }
  async function save() {
    const amount = Number(draft.amount.replace(/\D/g, ""));
    if (!draft.description.trim() || !amount) return;
    if (connected) {
      const form = new FormData();
      if (editing) form.set("id", editing);
      form.set("date", draft.date);
      form.set("description", draft.description);
      form.set("category", draft.category);
      form.set("type", draft.type);
      form.set("taxMode", draft.taxMode);
      form.set("amount", String(amount));
      form.set("estimated", String(draft.estimated));
      form.set("note", draft.note);
      if (draft.receiptFile) form.set("receipt", draft.receiptFile);
      await saveEntryAction(form);
      location.reload();
      return;
    }
    const tax =
      draft.type === "initial_capital" ||
      draft.type === "income" ||
      draft.type === "refund"
        ? calculateTax(amount, "exempt", 0)
        : calculateTax(amount, draft.taxMode, 19);
    const value: OpeningEntry = {
      id: editing || crypto.randomUUID(),
      date: draft.date,
      description: draft.description.trim(),
      category: draft.category,
      type: draft.type,
      taxMode: draft.taxMode,
      taxRate: draft.taxMode === "exempt" ? 0 : 19,
      ...tax,
      estimated: draft.estimated,
      note: draft.note,
      receipt: draft.receipt,
      status: "active",
      updatedAt: new Date().toISOString(),
    };
    setEntries((old) =>
      editing
        ? old.map((e) => (e.id === editing ? value : e))
        : [value, ...old],
    );
    setDialog(false);
  }
  async function duplicate(entry: OpeningEntry) {
    if (connected) {
      await duplicateEntryAction(entry.id);
      location.reload();
      return;
    }
    setEntries((old) => [
      {
        ...entry,
        id: crypto.randomUUID(),
        description: `${entry.description} (copia)`,
        updatedAt: new Date().toISOString(),
      },
      ...old,
    ]);
  }
  async function toggleVoid(id: string) {
    if (connected) {
      await voidEntryAction(id);
      location.reload();
      return;
    }
    setEntries((old) =>
      old.map((e) =>
        e.id === id
          ? {
              ...e,
              status: e.status === "active" ? "void" : "active",
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
  }
  function exportCsv() {
    const rows = [
      ["Fecha", "Descripción", "Categoría", "Tipo", "Neto", "IVA", "Total"],
      ...summary.active.map((e) => [
        e.date,
        e.description,
        e.category,
        entryLabels[e.type],
        e.net,
        e.tax,
        e.total,
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv" }),
    );
    a.download = "apertura-kumera.csv";
    a.click();
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[238px] shrink-0 border-r border-[#dfdfd5] bg-[#f0f0e7] p-5 lg:flex lg:flex-col">
        <Logo />
        <div className="mt-8 rounded-xl border border-[#ddddd2] bg-[#f9f8f1] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b8e85]">
            Negocio activo
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-[#235b45] text-xs font-bold text-white">
              K
            </div>
            <div>
              <p className="text-sm font-bold">{businessName}</p>
              <p className="text-[11px] text-[#777b72]">Etapa de apertura</p>
            </div>
          </div>
        </div>
        <nav className="mt-7 space-y-1 text-sm">
          <Nav
            active={view === "dashboard"}
            onClick={() => setView("dashboard")}
            icon={<LayoutDashboard size={17} />}
            label="Resumen"
          />
          <Nav
            active={view === "ledger"}
            onClick={() => setView("ledger")}
            icon={<BookOpen size={17} />}
            label="Libro de apertura"
          />
          <Nav
            active={view === "costs"}
            onClick={() => setView("costs")}
            icon={<CircleDollarSign size={17} />}
            label="Costos"
            badge="Pronto"
          />
        </nav>
        <div className="mt-auto">
          <Nav icon={<Settings size={17} />} label="Configuración" />
          <div className="mt-4 flex items-center gap-3 border-t border-[#d9d9cf] pt-4">
            <div className="grid size-9 place-items-center rounded-full bg-[#d8f070] text-xs font-bold">
              JF
            </div>
            <div>
              <p className="text-xs font-bold">Administrador</p>
              <p className="text-[11px] text-[#777b72]">admin@kumera.cl</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#e2e2d9] bg-[#f7f6ee]/90 px-5 backdrop-blur md:px-8">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="hidden lg:block">
            <p className="text-xs text-[#7a7d75]">
              ERP KUMERA /{" "}
              <span className="text-[#30332f]">
                {view === "dashboard"
                  ? "Resumen"
                  : view === "ledger"
                    ? "Libro de apertura"
                    : "Costos"}
              </span>
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 rounded-xl bg-[#235b45] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#194735]"
          >
            <Plus size={17} /> Nuevo movimiento
          </button>
        </header>
        {view === "dashboard" && (
          <Dashboard
            summary={summary}
            chart={chart}
            entries={summary.active}
            onSeeAll={() => setView("ledger")}
            onNew={openNew}
          />
        )}
        {view === "ledger" && (
          <Ledger
            entries={visible}
            search={search}
            setSearch={setSearch}
            filter={filter}
            setFilter={setFilter}
            showTax={showTax}
            setShowTax={setShowTax}
            onEdit={openEdit}
            onDuplicate={duplicate}
            onVoid={toggleVoid}
            onExport={exportCsv}
            onNew={openNew}
          />
        )}
        {view === "costs" && <CostsSoon />}
      </main>
      <nav className="fixed bottom-3 left-3 right-3 z-30 flex justify-around rounded-2xl border border-[#dddcd2] bg-[#fffef9]/95 p-2 shadow-xl backdrop-blur lg:hidden">
        <Nav
          active={view === "dashboard"}
          onClick={() => setView("dashboard")}
          icon={<LayoutDashboard size={18} />}
          label="Resumen"
        />
        <Nav
          active={view === "ledger"}
          onClick={() => setView("ledger")}
          icon={<BookOpen size={18} />}
          label="Movimientos"
        />
        <Nav
          active={view === "costs"}
          onClick={() => setView("costs")}
          icon={<CircleDollarSign size={18} />}
          label="Costos"
        />
      </nav>
      {dialog && (
        <EntryDialog
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          setCategories={setCategories}
          editing={!!editing}
          onClose={() => setDialog(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 rotate-3 place-items-center rounded-[11px] bg-[#d8f070] text-lg font-black text-[#235b45]">
        K
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.19em] text-[#777b72]">
          ERP
        </p>
        <p className="-mt-1 text-lg font-black tracking-tight text-[#235b45]">
          KUMERA
        </p>
      </div>
    </div>
  );
}
function Nav({
  icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[#235b45] font-bold text-white" : "text-[#5f645d] hover:bg-[#e5e6dc]"}`}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-[#d8f070] px-2 py-0.5 text-[9px] font-bold uppercase text-[#35513f]">
          {badge}
        </span>
      )}
    </button>
  );
}

function Dashboard({
  summary,
  chart,
  entries,
  onSeeAll,
  onNew,
}: {
  summary: ReturnType<typeof summarize>;
  chart: { date: string; total: number }[];
  entries: OpeningEntry[];
  onSeeAll: () => void;
  onNew: () => void;
}) {
  const categoryData = Object.entries(
    entries
      .filter((e) => e.type === "expense")
      .reduce<Record<string, number>>((a, e) => {
        a[e.category || "Sin categoría"] =
          (a[e.category || "Sin categoría"] || 0) + e.total;
        return a;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mx-auto max-w-[1440px] p-5 pb-28 md:p-8">
      <div className="rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            Tu apertura, de un vistazo
          </p>
          <h1 className="text-3xl font-black tracking-[-.04em] md:text-4xl">
            Buenos días, Javier.
          </h1>
          <p className="mt-2 text-sm text-[#71766e]">
            Así se está moviendo el dinero de tu negocio.
          </p>
        </div>
        <div className="rounded-xl border border-[#dfdfd5] bg-[#fffef9] px-4 py-2 text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8a8d85]">
            Última actualización
          </p>
          <p className="text-xs font-semibold">Ahora mismo</p>
        </div>
      </div>
      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Saldo disponible"
          value={summary.balance}
          accent
          sub="Dinero que aún puedes usar"
        />
        <Stat
          label="Capital e ingresos"
          value={summary.initialCapital + summary.otherIncome}
          sub={`${summary.otherIncome ? formatClp(summary.otherIncome) : "Sin"} aportes adicionales`}
        />
        <Stat
          label="Gasto consumido"
          value={summary.expenses}
          sub="Gastos de la apertura"
        />
        <Stat
          label="Activos + depósitos"
          value={summary.assets + summary.deposits}
          sub={`${formatClp(summary.deposits)} recuperables`}
        />
      </section>
      <section className="mt-4 grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="card min-h-[330px] p-5 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-bold">Evolución de las salidas</h2>
              <p className="mt-1 text-xs text-[#7d8179]">
                Gastos, activos y depósitos acumulados
              </p>
            </div>
            <span className="rounded-lg bg-[#f0f1e8] px-2.5 py-1 text-[11px] font-bold">
              CLP
            </span>
          </div>
          <div className="mt-7 h-[220px]">
            {chart.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#235b45"
                        stopOpacity={0.22}
                      />
                      <stop offset="100%" stopColor="#235b45" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#ebeae1" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#82867d" }}
                  />
                  <Tooltip
                    formatter={(v) => formatClp(Number(v))}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #deded5",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#235b45"
                    strokeWidth={3}
                    fill="url(#fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty onNew={onNew} />
            )}
          </div>
        </div>
        <div className="card p-5 md:p-6">
          <h2 className="font-bold">Gastos por categoría</h2>
          <p className="mt-1 text-xs text-[#7d8179]">
            Dónde se ha ido el dinero
          </p>
          <div className="mt-6 space-y-5">
            {categoryData.slice(0, 5).map(([name, value], i) => (
              <div key={name}>
                <div className="mb-2 flex justify-between text-xs">
                  <span className="font-semibold">{name}</span>
                  <span className="money font-bold">{formatClp(value)}</span>
                </div>
                <div className="h-2 rounded-full bg-[#ecece4]">
                  <div
                    className={`h-full rounded-full ${i === 0 ? "bg-[#e56b3f]" : "bg-[#235b45]"}`}
                    style={{
                      width: `${Math.max(8, (value / (categoryData[0]?.[1] || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#e8e7df] p-5">
          <div>
            <h2 className="font-bold">Últimos movimientos</h2>
            <p className="mt-1 text-xs text-[#7d8179]">
              Tu actividad más reciente
            </p>
          </div>
          <button
            onClick={onSeeAll}
            className="text-xs font-bold text-[#235b45] hover:underline"
          >
            Ver todos →
          </button>
        </div>
        <MiniRows entries={entries.slice(0, 5)} />
      </section>
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card rise p-5 ${accent ? "!border-[#235b45] !bg-[#235b45] text-white" : ""}`}
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-[.13em] ${accent ? "text-[#c8dbc9]" : "text-[#7e827a]"}`}
      >
        {label}
      </p>
      <p className="money mt-3 text-2xl font-black tracking-tight md:text-[28px]">
        {formatClp(value)}
      </p>
      <p
        className={`mt-2 text-[11px] ${accent ? "text-[#cbd8cf]" : "text-[#898d85]"}`}
      >
        {sub}
      </p>
    </div>
  );
}
function MiniRows({ entries }: { entries: OpeningEntry[] }) {
  return (
    <div className="divide-y divide-[#ecebe4]">
      {entries.map((e) => (
        <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
          <TypeDot type={e.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{e.description}</p>
            <p className="text-[11px] text-[#858980]">
              {e.category || "Sin categoría"} ·{" "}
              {new Date(`${e.date}T12:00`).toLocaleDateString("es-CL")}
            </p>
          </div>
          <p
            className={`money text-sm font-bold ${["income", "refund", "initial_capital"].includes(e.type) ? "text-[#235b45]" : ""}`}
          >
            {["income", "refund", "initial_capital"].includes(e.type)
              ? "+"
              : "−"}
            {formatClp(e.total)}
          </p>
        </div>
      ))}
    </div>
  );
}
function TypeDot({ type }: { type: EntryType }) {
  const income = ["income", "refund", "initial_capital"].includes(type);
  return (
    <div
      className={`grid size-9 shrink-0 place-items-center rounded-xl ${income ? "bg-[#e0edd8] text-[#235b45]" : type === "deposit" ? "bg-[#fff0c9] text-[#966b00]" : "bg-[#f7e5de] text-[#c35431]"}`}
    >
      {income ? "+" : "−"}
    </div>
  );
}

function Ledger({
  entries,
  search,
  setSearch,
  filter,
  setFilter,
  showTax,
  setShowTax,
  onEdit,
  onDuplicate,
  onVoid,
  onExport,
  onNew,
}: {
  entries: OpeningEntry[];
  search: string;
  setSearch: (v: string) => void;
  filter: EntryType | "all";
  setFilter: (v: EntryType | "all") => void;
  showTax: boolean;
  setShowTax: (v: boolean) => void;
  onEdit: (e: OpeningEntry) => void;
  onDuplicate: (e: OpeningEntry) => void;
  onVoid: (id: string) => void;
  onExport: () => void;
  onNew: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1500px] p-5 pb-28 md:p-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
          Apertura
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-[-.04em]">
          Libro de movimientos
        </h1>
        <p className="mt-2 text-sm text-[#73776f]">
          Todo lo que entra y sale, en un solo lugar.
        </p>
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-[#8c9088]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar movimiento..."
            className="h-10 w-full rounded-xl border border-[#dcdcd3] bg-[#fffef9] pl-9 pr-3 text-sm outline-none focus:border-[#235b45]"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EntryType | "all")}
          className="rounded-xl border border-[#dcdcd3] bg-[#fffef9] px-3 text-xs font-bold"
        >
          <option value="all">Todos los tipos</option>
          {Object.entries(entryLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowTax(!showTax)}
          className="flex items-center gap-2 rounded-xl border border-[#dcdcd3] bg-[#fffef9] px-3 text-xs font-bold"
        >
          <SlidersHorizontal size={15} />
          {showTax ? "Ocultar IVA" : "Mostrar IVA"}
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-2 rounded-xl border border-[#dcdcd3] bg-[#fffef9] px-3 text-xs font-bold"
        >
          <ArrowDownToLine size={15} /> CSV
        </button>
      </div>
      <div className="card scrollbar mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#e5e4dd] bg-[#f4f4ec] text-[10px] font-bold uppercase tracking-wider text-[#787c74]">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Tipo</th>
              {showTax && (
                <>
                  <th className="px-4 py-3 text-right">Neto</th>
                  <th className="px-4 py-3 text-right">IVA</th>
                </>
              )}
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Comprobante</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ecebe4]">
            {entries.map((e) => (
              <tr key={e.id} className="group hover:bg-[#fbfbf5]">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-[#676c64]">
                  {new Date(`${e.date}T12:00`).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onEdit(e)}
                    className="text-left text-sm font-bold hover:text-[#235b45]"
                  >
                    {e.description}
                  </button>
                  {e.estimated && (
                    <span className="ml-2 rounded bg-[#fff0c9] px-1.5 py-0.5 text-[9px] font-bold text-[#856000]">
                      ESTIMADO
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-[#696e66]">
                  {e.category || (
                    <span className="italic text-[#a0a39c]">Sin categoría</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap rounded-lg bg-[#eeeeE7] px-2 py-1 text-[10px] font-bold">
                    {entryLabels[e.type]}
                  </span>
                </td>
                {showTax && (
                  <>
                    <td className="money px-4 py-3 text-right text-xs">
                      {formatClp(e.net)}
                    </td>
                    <td className="money px-4 py-3 text-right text-xs text-[#858981]">
                      {formatClp(e.tax)}
                    </td>
                  </>
                )}
                <td className="money px-4 py-3 text-right text-sm font-black">
                  {formatClp(e.total)}
                </td>
                <td className="px-4 py-3">
                  {e.receipt ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-[#235b45]">
                      <FileText size={13} />
                      {e.receipt}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#aaa]">—</span>
                  )}
                </td>
                <td className="px-3">
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <button
                      title="Duplicar"
                      onClick={() => onDuplicate(e)}
                      className="rounded-lg p-2 hover:bg-[#e8e9df]"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      title="Anular"
                      onClick={() =>
                        confirm(
                          "¿Anular este movimiento? Se conservará en el historial.",
                        ) && onVoid(e.id)
                      }
                      className="rounded-lg p-2 hover:bg-[#f6e2dc]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!entries.length && <Empty onNew={onNew} />}
      </div>
    </div>
  );
}

function EntryDialog({
  draft,
  setDraft,
  categories,
  setCategories,
  editing,
  onClose,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  categories: string[];
  setCategories: (c: string[]) => void;
  editing: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}) {
  const calculated = calculateTax(
    Number(draft.amount.replace(/\D/g, "")),
    draft.taxMode,
  );
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#17211b]/45 p-0 backdrop-blur-[2px] md:items-center md:p-5"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rise max-h-[94vh] w-full overflow-y-auto rounded-t-[24px] bg-[#fffef9] shadow-2xl md:max-w-[620px] md:rounded-[24px]">
        <div className="flex items-start justify-between border-b border-[#e7e6de] p-5 md:p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#6f746c]">
              {editing ? "Editar registro" : "Nuevo registro"}
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              {editing ? "Actualizar movimiento" : "¿En qué gastaste?"}
            </h2>
            <p className="mt-1 text-xs text-[#81857d]">
              Solo descripción y monto son obligatorios.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-[#deded5] p-2 hover:bg-[#efefe7]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-5 p-5 md:p-6">
          <label className="block">
            <span className="text-xs font-bold">Descripción *</span>
            <input
              autoFocus
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              placeholder="Ej: Compra de horno industrial"
              className="mt-2 h-12 w-full rounded-xl border border-[#d8d8cf] bg-white px-4 text-sm outline-none focus:border-[#235b45]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha">
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Tipo">
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft({ ...draft, type: e.target.value as EntryType })
                }
                className="input"
              >
                {Object.entries(entryLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoría (opcional)">
              <div className="flex gap-2">
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const c = prompt("Nombre de la nueva categoría");
                    if (c && !categories.includes(c)) {
                      setCategories([...categories, c]);
                      setDraft({ ...draft, category: c });
                    }
                  }}
                  className="rounded-xl border border-[#d8d8cf] px-3"
                >
                  <Plus size={16} />
                </button>
              </div>
            </Field>
            <Field label="Tratamiento del IVA">
              <select
                value={draft.taxMode}
                onChange={(e) =>
                  setDraft({ ...draft, taxMode: e.target.value as TaxMode })
                }
                className="input"
              >
                <option value="included">IVA incluido en el monto</option>
                <option value="added">Agregar IVA al monto</option>
                <option value="exempt">Exento / sin IVA</option>
              </select>
            </Field>
          </div>
          <Field
            label={draft.taxMode === "added" ? "Monto neto *" : "Monto total *"}
          >
            <div className="relative">
              <span className="absolute left-4 top-3.5 font-bold text-[#73786f]">
                $
              </span>
              <input
                inputMode="numeric"
                value={draft.amount}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    amount: e.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="0"
                className="h-13 w-full rounded-xl border-2 border-[#b8c2b8] bg-white pl-9 pr-4 text-xl font-black outline-none focus:border-[#235b45]"
              />
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#f0f1e8] p-3 text-center">
            <SmallMoney label="Neto" value={calculated.net} />
            <SmallMoney label="IVA" value={calculated.tax} />
            <SmallMoney label="Total" value={calculated.total} strong />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex h-12 items-center gap-3 rounded-xl border border-[#d8d8cf] px-4 text-xs font-bold">
              <input
                type="checkbox"
                checked={draft.estimated}
                onChange={(e) =>
                  setDraft({ ...draft, estimated: e.target.checked })
                }
                className="accent-[#235b45]"
              />
              Este monto es estimado
            </label>
            <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#bfc2b9] px-4 text-xs font-bold hover:bg-[#f6f6ee]">
              <FileText size={17} />
              <span className="truncate">
                {draft.receipt || "Adjuntar comprobante"}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setDraft({
                    ...draft,
                    receipt: file?.name,
                    receiptFile: file,
                  });
                }}
              />
            </label>
          </div>
          <Field label="Nota (opcional)">
            <input
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="Agrega algún detalle útil"
              className="input"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e7e6de] p-5">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#d7d7ce] px-5 py-3 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!draft.description.trim() || !Number(draft.amount)}
            className="rounded-xl bg-[#235b45] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editing ? "Guardar cambios" : "Agregar movimiento"}
          </button>
        </div>
      </div>
      <style jsx>{`
        .input {
          height: 48px;
          width: 100%;
          border: 1px solid #d8d8cf;
          border-radius: 12px;
          background: white;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }
        .input:focus {
          border-color: #235b45;
        }
      `}</style>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold">{label}</span>
      {children}
    </label>
  );
}
function SmallMoney({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className={strong ? "border-l border-[#d6d7ce]" : ""}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#858980]">
        {label}
      </p>
      <p
        className={`money mt-1 text-xs ${strong ? "font-black" : "font-semibold"}`}
      >
        {formatClp(value)}
      </p>
    </div>
  );
}
function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="grid min-h-[210px] place-items-center p-6 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf0e5] text-[#235b45]">
          <Sparkles size={21} />
        </div>
        <p className="mt-3 text-sm font-bold">
          Todavía no hay movimientos aquí
        </p>
        <button
          onClick={onNew}
          className="mt-2 text-xs font-bold text-[#235b45] hover:underline"
        >
          Agregar el primero
        </button>
      </div>
    </div>
  );
}
function CostsSoon() {
  return (
    <div className="grid min-h-[calc(100vh-64px)] place-items-center p-6 pb-28">
      <div className="card max-w-xl p-8 text-center md:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d8f070] text-[#235b45]">
          <CircleDollarSign size={27} />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[.17em] text-[#6e746c]">
          Próxima etapa
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Costos, márgenes y punto de equilibrio
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#747970]">
          Cuando termines tu apertura, aquí podrás costear ingredientes y
          productos, registrar tus costos fijos y descubrir cuánto necesitas
          vender.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-[#eff0e8] px-3 py-2">
            Costos fijos
          </span>
          <span className="rounded-full bg-[#eff0e8] px-3 py-2">Recetas</span>
          <span className="rounded-full bg-[#eff0e8] px-3 py-2">Márgenes</span>
          <span className="rounded-full bg-[#eff0e8] px-3 py-2">
            Escenarios
          </span>
        </div>
      </div>
    </div>
  );
}
