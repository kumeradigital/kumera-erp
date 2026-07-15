"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Banknote, Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  closeCashSessionAction,
  openCashSessionAction,
  registerSaleAction,
} from "./actions";
import {
  paymentLabels,
  type CashSession,
  type PaymentMethod,
  type Product,
} from "./types";
type Cart = Record<string, number>;
export function PosClient({
  products,
  session,
  cashSales,
  latestSession,
}: {
  products: Product[];
  session: CashSession | null;
  cashSales: number;
  latestSession: CashSession | null;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [closing, setClosing] = useState(false);
  const [weighing, setWeighing] = useState<Product | null>(null);
  const categories = ["Todos", ...new Set(products.map((p) => p.category))];
  const lines = products
    .filter((p) => cart[p.id])
    .map((p) => ({ ...p, quantity: cart[p.id] }));
  const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
  function add(id: string) {
    const product = products.find((item) => item.id === id);
    if (product?.saleUnit === "kg") {
      setWeighing(product);
      return;
    }
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function change(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] || 0) + delta) };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  if (!session) return <OpenSession latestSession={latestSession} />;
  return (
    <main className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[1fr_390px]">
      <section className="p-4 md:p-6">
        <div className="flex gap-2 overflow-x-auto pb-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${category === c ? "bg-[#235b45] text-white" : "bg-white text-[#666]"}`}
            >
              {c}
            </button>
          ))}
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products
              .filter((p) => category === "Todos" || p.category === category)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p.id)}
                  className="card overflow-hidden text-left transition active:scale-[.98]"
                >
                  <div className="grid h-28 place-items-center bg-[#eaeae1]">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ShoppingBag className="text-[#9da198]" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="min-h-10 text-sm font-black leading-5">
                      {p.name}
                    </p>
                    <p className="money mt-2 text-base font-black text-[#235b45]">
                      {formatClp(p.price)} {p.saleUnit === "kg" ? "/ kg" : ""}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <p className="font-bold">No hay productos activos</p>
            <a
              href="/productos"
              className="mt-2 inline-block text-sm text-[#235b45] underline"
            >
              Crear productos
            </a>
          </div>
        )}
      </section>
      <aside className="border-l border-[#dfdfd5] bg-[#fffef9] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Venta actual
            </p>
            <h2 className="mt-1 text-xl font-black">Carro</h2>
          </div>
          {lines.length > 0 && (
            <button
              onClick={() => setCart({})}
              className="text-xs font-bold text-[#a24628]"
            >
              Limpiar
            </button>
          )}
        </div>
        <div className="mt-5 space-y-3">
          {lines.map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-3 border-b border-[#ecebe4] pb-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.name}</p>
                <p className="money text-xs text-[#777]">
                  {formatClp(l.price * l.quantity)}
                </p>
                {l.saleUnit === "kg" && (
                  <p className="text-[11px] text-[#777]">
                    {Math.round(l.quantity * 1000)} g · {formatClp(l.price)}/kg
                  </p>
                )}
              </div>
              {l.saleUnit === "unit" ? (
                <>
                  <button
                    onClick={() => change(l.id, -1)}
                    className="grid size-8 place-items-center rounded-lg bg-[#eeeFe7]"
                  >
                    <Minus size={14} />
                  </button>
                  <b className="w-5 text-center">{l.quantity}</b>
                  <button
                    onClick={() => change(l.id, 1)}
                    className="grid size-8 place-items-center rounded-lg bg-[#d8f070]"
                  >
                    <Plus size={14} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => change(l.id, -l.quantity)}
                  className="text-xs font-bold text-[#a24628]"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          {!lines.length && (
            <div className="py-16 text-center text-sm text-[#888]">
              Toca un producto para agregarlo
            </div>
          )}
        </div>
        <div className="mt-5 border-t-2 border-[#222] pt-4">
          <div className="flex items-end justify-between">
            <span className="font-bold">Total</span>
            <span className="money text-3xl font-black">
              {formatClp(total)}
            </span>
          </div>
          <button
            disabled={!total}
            onClick={() => setPaying(true)}
            className="mt-5 h-14 w-full rounded-2xl bg-[#235b45] text-lg font-black text-white disabled:opacity-30"
          >
            Cobrar
          </button>
          <button
            onClick={() => setClosing(true)}
            className="mt-3 w-full text-center text-xs font-bold text-[#a24628]"
          >
            Cerrar jornada de caja
          </button>
        </div>
      </aside>
      {paying && (
        <PaymentDialog
          total={total}
          busy={busy}
          onClose={() => setPaying(false)}
          onPay={async (method, cash) => {
            setBusy(true);
            try {
              await registerSaleAction(
                session.id,
                method,
                cash,
                lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
              );
              setCart({});
              setPaying(false);
              alert("Venta registrada");
              location.reload();
            } catch (e) {
              alert(e instanceof Error ? e.message : "No se pudo registrar");
              setBusy(false);
            }
          }}
        />
      )}
      {weighing && (
        <WeightDialog
          product={weighing}
          onClose={() => setWeighing(null)}
          onConfirm={(kilograms) => {
            setCart((current) => ({
              ...current,
              [weighing.id]: Number(
                ((current[weighing.id] || 0) + kilograms).toFixed(3),
              ),
            }));
            setWeighing(null);
          }}
        />
      )}
      {closing && (
        <CloseSessionDialog
          session={session}
          expectedCash={session.openingCash + cashSales}
          onClose={() => setClosing(false)}
        />
      )}
    </main>
  );
}

function WeightDialog({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (kilograms: number) => void;
}) {
  const [grams, setGrams] = useState("");
  const value = Number(grams) || 0;
  const total = Math.round((product.price * value) / 1000);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-md md:rounded-3xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Venta por peso
            </p>
            <h2 className="mt-1 text-2xl font-black">{product.name}</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="mt-3 text-sm text-[#747970]">
          Precio: {formatClp(product.price)} por kilogramo
        </p>
        <label className="mt-5 block text-xs font-bold">
          Peso en gramos
          <input
            autoFocus
            value={grams}
            onChange={(event) =>
              setGrams(event.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            placeholder="Ej: 350"
            className="input mt-2 text-2xl font-black"
          />
        </label>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#eff0e8] p-4">
          <span className="font-bold">Subtotal</span>
          <b className="money text-2xl">{formatClp(total)}</b>
        </div>
        <button
          disabled={value <= 0}
          onClick={() => onConfirm(value / 1000)}
          className="mt-5 h-14 w-full rounded-xl bg-[#235b45] text-lg font-black text-white disabled:opacity-40"
        >
          Agregar al carro
        </button>
      </div>
    </div>
  );
}

function CloseSessionDialog({
  session,
  expectedCash,
  onClose,
}: {
  session: CashSession;
  expectedCash: number;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-md md:rounded-3xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Fin de jornada
            </p>
            <h2 className="mt-1 text-2xl font-black">Cerrar caja</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-5 rounded-xl bg-[#eff0e8] p-4">
          <div className="flex justify-between text-sm">
            <span>Efectivo esperado</span>
            <b className="money">{formatClp(expectedCash)}</b>
          </div>
          <p className="mt-1 text-[11px] text-[#777]">
            Efectivo inicial + ventas en efectivo
          </p>
        </div>
        <form
          action={async (form) => {
            setBusy(true);
            await closeCashSessionAction(
              session.id,
              Number(form.get("countedCash")),
              String(form.get("note") || ""),
            );
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Efectivo contado
            <input
              name="countedCash"
              required
              inputMode="numeric"
              defaultValue={expectedCash}
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Nota opcional
            <input name="note" className="input mt-2" />
          </label>
          <button
            disabled={busy}
            className="h-13 w-full rounded-xl bg-[#235b45] font-black text-white disabled:opacity-50"
          >
            {busy ? "Cerrando..." : "Confirmar cierre"}
          </button>
        </form>
      </div>
    </div>
  );
}
function OpenSession({ latestSession }: { latestSession: CashSession | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-[calc(100vh-64px)] place-items-center p-5">
      <div className="card w-full max-w-md p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d8f070] text-[#235b45]">
          <Banknote />
        </div>
        <h1 className="mt-5 text-2xl font-black">Abrir jornada de caja</h1>
        <p className="mt-2 text-sm text-[#747970]">
          Indica cuánto efectivo hay al comenzar.
        </p>
        {latestSession?.autoClosed && (
          <div className="mt-5 rounded-xl border border-[#e7d8a5] bg-[#fff8dc] p-4 text-left text-xs text-[#6f5b17]">
            <b>La jornada anterior se cerró automáticamente.</b>
            <p className="mt-1">
              El cierre quedó registrado sin efectivo contado porque no fue
              confirmado manualmente.
            </p>
          </div>
        )}
        <form
          action={async (form) => {
            setBusy(true);
            await openCashSessionAction(
              Number(form.get("openingCash")),
              String(form.get("note") || ""),
            );
            location.reload();
          }}
          className="mt-6 space-y-4 text-left"
        >
          <label className="block text-xs font-bold">
            Efectivo inicial
            <input
              name="openingCash"
              inputMode="numeric"
              defaultValue="0"
              required
              className="input mt-2"
            />
          </label>
          <label className="block text-xs font-bold">
            Nota opcional
            <input name="note" className="input mt-2" />
          </label>
          <button
            disabled={busy}
            className="h-13 w-full rounded-xl bg-[#235b45] font-black text-white"
          >
            {busy ? "Abriendo..." : "Comenzar a vender"}
          </button>
        </form>
      </div>
    </main>
  );
}
function PaymentDialog({
  total,
  busy,
  onClose,
  onPay,
}: {
  total: number;
  busy: boolean;
  onClose: () => void;
  onPay: (m: PaymentMethod, c: number | null) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cash, setCash] = useState(String(total));
  const received = Number(cash) || 0;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-lg md:rounded-3xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Total a pagar
            </p>
            <p className="money mt-1 text-4xl font-black">{formatClp(total)}</p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`h-14 rounded-xl border text-sm font-bold ${method === m ? "border-[#235b45] bg-[#e8f0e6] text-[#235b45]" : "border-[#ddd]"}`}
            >
              {paymentLabels[m]}
            </button>
          ))}
        </div>
        {method === "cash" && (
          <div className="mt-5">
            <label className="text-xs font-bold">
              Efectivo recibido
              <input
                value={cash}
                onChange={(e) => setCash(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className="input mt-2 text-xl font-black"
              />
            </label>
            <div className="mt-3 flex justify-between rounded-xl bg-[#eff0e8] p-4">
              <span className="font-bold">Vuelto</span>
              <b className="money text-xl">
                {formatClp(Math.max(0, received - total))}
              </b>
            </div>
          </div>
        )}
        <button
          disabled={busy || (method === "cash" && received < total)}
          onClick={() => onPay(method, method === "cash" ? received : null)}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#235b45] text-lg font-black text-white disabled:opacity-40"
        >
          <Check /> {busy ? "Registrando..." : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}
