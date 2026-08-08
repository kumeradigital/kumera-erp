"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  Banknote,
  Check,
  ClipboardList,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import {
  closeCashSessionAction,
  adjustAvailabilityAction,
  openCashSessionAction,
  reconcileCashSessionAction,
  registerSaleAction,
} from "./actions";
import {
  paymentLabels,
  type AvailabilityMovementType,
  type CashSession,
  type DailyAvailability,
  type PaymentMethod,
  type Product,
} from "./types";
type Cart = Record<string, number>;
export function PosClient({
  products,
  session,
  cashSales,
  latestSession,
  availability,
}: {
  products: Product[];
  session: CashSession | null;
  cashSales: number;
  latestSession: CashSession | null;
  availability: DailyAvailability[];
}) {
  const [cart, setCart] = useState<Cart>({});
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [closing, setClosing] = useState(false);
  const [weighing, setWeighing] = useState<Product | null>(null);
  const [managingAvailability, setManagingAvailability] = useState(false);
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
    if (
      product?.trackDailyAvailability &&
      (product.availability?.availableQuantity || 0) <= (cart[id] || 0)
    )
      return;
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }
  function change(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c, [id]: Math.max(0, (c[id] || 0) + delta) };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  if (!session)
    return <OpenSession latestSession={latestSession} products={products} />;
  return (
    <main className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[1fr_390px]">
      <section className="p-4 md:p-6">
        <div className="flex items-start justify-between gap-3 pb-4">
          <div className="flex gap-2 overflow-x-auto">
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
          {availability.length > 0 && (
            <button
              onClick={() => setManagingAvailability(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-[#235b45] bg-white px-3 py-2 text-xs font-black text-[#235b45]"
            >
              <ClipboardList size={16} />
              <span className="hidden sm:inline">Disponibilidad</span>
            </button>
          )}
        </div>
        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {products
              .filter((p) => category === "Todos" || p.category === category)
              .map((p) => {
                const remaining = p.trackDailyAvailability
                  ? Math.max(
                      0,
                      (p.availability?.availableQuantity || 0) -
                        (cart[p.id] || 0),
                    )
                  : null;
                const soldOut = remaining === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => add(p.id)}
                    disabled={soldOut}
                    className="card relative overflow-hidden text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {remaining !== null && (
                      <span
                        className={`absolute right-2 top-2 z-10 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm ${remaining === 0 ? "bg-[#a24628] text-white" : remaining <= 5 ? "bg-[#f3c94f] text-[#493b0c]" : "bg-[#235b45] text-white"}`}
                      >
                        {remaining === 0
                          ? "Agotado"
                          : `${remaining} disponibles`}
                      </span>
                    )}
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
                );
              })}
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
                    disabled={
                      l.trackDailyAvailability &&
                      l.quantity >= (l.availability?.availableQuantity || 0)
                    }
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
          availability={availability}
        />
      )}
      {managingAvailability && (
        <AvailabilityDialog
          sessionId={session.id}
          availability={availability}
          onClose={() => setManagingAvailability(false)}
        />
      )}
    </main>
  );
}

function AvailabilityDialog({
  sessionId,
  availability,
  onClose,
}: {
  sessionId: string;
  availability: DailyAvailability[];
  onClose: () => void;
}) {
  const [adjusting, setAdjusting] = useState<DailyAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-2xl md:rounded-3xl">
        <div className="flex justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Jornada actual
            </p>
            <h2 className="mt-1 text-2xl font-black">Disponibilidad del día</h2>
            <p className="mt-2 text-sm text-[#747970]">
              Agrega producción o registra mermas, consumo y correcciones.
            </p>
          </div>
          <button onClick={onClose} className="self-start">
            <X />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {availability.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-4 rounded-2xl border border-[#e2e2d8] p-4"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-xl text-lg font-black ${item.availableQuantity === 0 ? "bg-[#f6e2da] text-[#a24628]" : item.availableQuantity <= 5 ? "bg-[#fff0b7] text-[#6f5711]" : "bg-[#e6f0e4] text-[#235b45]"}`}
              >
                {item.availableQuantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black">{item.productName}</p>
                <p className="mt-1 text-[11px] text-[#777]">
                  Inicio {item.openingQuantity} · Producción +
                  {item.producedQuantity} · Vendidas {item.soldQuantity} ·
                  Ajustes {item.adjustedQuantity > 0 ? "+" : ""}
                  {item.adjustedQuantity}
                </p>
              </div>
              <button
                onClick={() => setAdjusting(item)}
                className="shrink-0 rounded-xl bg-[#235b45] px-3 py-2 text-xs font-black text-white"
              >
                Ajustar
              </button>
            </div>
          ))}
        </div>
        {adjusting && (
          <form
            action={async (form) => {
              setBusy(true);
              try {
                const operation = String(form.get("operation"));
                const quantity = Number(form.get("quantity"));
                const kind = operation.replace(
                  /_(add|remove)$/,
                  "",
                ) as AvailabilityMovementType;
                const positive =
                  operation === "production" || operation.endsWith("_add");
                await adjustAvailabilityAction(
                  sessionId,
                  adjusting.productId,
                  kind,
                  positive ? quantity : -quantity,
                  String(form.get("reason") || ""),
                );
                location.reload();
              } catch (error) {
                alert(
                  error instanceof Error
                    ? error.message
                    : "No se pudo ajustar la disponibilidad",
                );
                setBusy(false);
              }
            }}
            className="mt-5 rounded-2xl bg-[#f1f3ec] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-[#777]">
                  Ajustar
                </p>
                <h3 className="font-black">{adjusting.productName}</h3>
              </div>
              <button type="button" onClick={() => setAdjusting(null)}>
                <X size={19} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Motivo del movimiento
                <select name="operation" className="input mt-2">
                  <option value="production">Nueva producción (+)</option>
                  <option value="waste">Merma o producto dañado (−)</option>
                  <option value="consumption">Consumo interno (−)</option>
                  <option value="correction_add">
                    Corrección: agregar (+)
                  </option>
                  <option value="correction_remove">
                    Corrección: restar (−)
                  </option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Cantidad
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="input mt-2"
                />
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold">
              Nota breve *
              <input
                name="reason"
                maxLength={200}
                required
                className="input mt-2 bg-white"
                placeholder="Ej: Segunda hornada o unidad dañada"
              />
            </label>
            <button
              disabled={busy}
              className="mt-4 h-12 w-full rounded-xl bg-[#235b45] font-black text-white disabled:opacity-50"
            >
              {busy ? "Guardando..." : "Guardar movimiento"}
            </button>
          </form>
        )}
      </div>
    </div>
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
  availability,
}: {
  session: CashSession;
  expectedCash: number;
  onClose: () => void;
  availability: DailyAvailability[];
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
        {availability.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#e1e1d7] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-[#777]">
              Disponibilidad final teórica
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
              {availability.map((item) => (
                <div
                  key={item.productId}
                  className="flex justify-between gap-2"
                >
                  <span className="truncate">{item.productName}</span>
                  <b>{item.availableQuantity}</b>
                </div>
              ))}
            </div>
          </div>
        )}
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
function OpenSession({
  latestSession,
  products,
}: {
  latestSession: CashSession | null;
  products: Product[];
}) {
  const [busy, setBusy] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const trackedProducts = products.filter(
    (product) => product.trackDailyAvailability && product.saleUnit === "unit",
  );
  return (
    <main className="grid min-h-[calc(100vh-64px)] place-items-center p-5">
      <div className="card w-full max-w-2xl p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d8f070] text-[#235b45]">
          <Banknote />
        </div>
        <h1 className="mt-5 text-2xl font-black">Abrir jornada de caja</h1>
        <p className="mt-2 text-sm text-[#747970]">
          Indica el efectivo inicial y los productos frescos disponibles.
        </p>
        {latestSession?.autoClosed && (
          <div className="mt-5 rounded-xl border border-[#e7d8a5] bg-[#fff8dc] p-4 text-left text-xs text-[#6f5b17]">
            <b>La jornada anterior se cerró automáticamente.</b>
            {latestSession.countedCash == null ? (
              <>
                <p className="mt-1">
                  El cierre quedó registrado sin efectivo contado. Puedes
                  informarlo ahora sin reabrir la jornada.
                </p>
                {!reconciling ? (
                  <button
                    onClick={() => setReconciling(true)}
                    className="mt-3 rounded-lg bg-[#6f5b17] px-3 py-2 font-bold text-white"
                  >
                    Completar cierre pendiente
                  </button>
                ) : (
                  <form
                    action={async (form) => {
                      setBusy(true);
                      try {
                        await reconcileCashSessionAction(
                          latestSession.id,
                          Number(form.get("countedCash")),
                          String(form.get("reconciliationNote") || ""),
                        );
                        location.reload();
                      } catch (error) {
                        alert(
                          error instanceof Error
                            ? error.message
                            : "No se pudo regularizar",
                        );
                        setBusy(false);
                      }
                    }}
                    className="mt-4 space-y-3"
                  >
                    <label className="block font-bold">
                      Efectivo real contado
                      <input
                        name="countedCash"
                        required
                        inputMode="numeric"
                        className="input mt-1 bg-white"
                      />
                    </label>
                    <label className="block font-bold">
                      Nota opcional
                      <input
                        name="reconciliationNote"
                        className="input mt-1 bg-white"
                        placeholder="Ej: Conteo realizado al día siguiente"
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        className="rounded-lg bg-[#235b45] px-3 py-2 font-bold text-white disabled:opacity-50"
                      >
                        {busy ? "Guardando..." : "Guardar efectivo real"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setReconciling(false)}
                        className="px-3 py-2 font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <p className="mt-1">
                El efectivo real ya fue informado posteriormente.
              </p>
            )}
          </div>
        )}
        <form
          action={async (form) => {
            setBusy(true);
            await openCashSessionAction(
              Number(form.get("openingCash")),
              String(form.get("note") || ""),
              trackedProducts.map((product) => ({
                product_id: product.id,
                quantity: Number(form.get(`availability-${product.id}`) || 0),
              })),
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
          {trackedProducts.length > 0 && (
            <fieldset className="rounded-2xl border border-[#dfe3d8] bg-[#f4f6ef] p-4">
              <legend className="px-2 text-xs font-black uppercase tracking-wider text-[#235b45]">
                Disponibilidad al abrir
              </legend>
              <p className="mb-4 text-xs font-normal leading-5 text-[#70766e]">
                Indica las unidades listas para vender. Puedes agregar nuevas
                hornadas durante la jornada.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {trackedProducts.map((product) => (
                  <label
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 text-sm font-bold"
                  >
                    <span className="min-w-0 truncate">{product.name}</span>
                    <input
                      name={`availability-${product.id}`}
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      defaultValue="0"
                      required
                      className="h-11 w-24 rounded-lg border border-[#d8d8cf] px-3 text-right text-lg font-black outline-none focus:border-[#235b45]"
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}
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
