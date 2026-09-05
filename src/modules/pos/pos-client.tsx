"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  Banknote,
  Check,
  ClipboardList,
  Clock,
  HandCoins,
  Handshake,
  Layers3,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
import { CASH_WITHDRAWAL_CATEGORIES } from "@/modules/operations/categories";
import {
  calculateCashPayable,
  calculateCashRounding,
  calculateCartTotal,
  calculateLineTotal,
} from "./cart";
import { calculateCardFee, type CardFeeSettings } from "./fees";
import {
  closeCashSessionAction,
  adjustAvailabilityAction,
  openCashSessionAction,
  registerProductionBatchAction,
  updateProductionBatchAction,
  registerCashWithdrawalAction,
  registerPedidosYaOrderAction,
  registerSpecialSaleAction,
  reconcileCashSessionAction,
  registerSaleAction,
} from "./actions";
import {
  paymentLabels,
  type AvailabilityMovementType,
  type CashSession,
  type CashWithdrawal,
  type DailyAvailability,
  type DeliveryOrder,
  type PaymentMethod,
  type Product,
  type ProductionBatch,
  type ProductionFamily,
  type RecentSale,
  type SessionClosingSummary,
} from "./types";
type Cart = Record<string, number>;
type ProductTile = {
  key: string;
  category: string;
  saleUnit: "unit" | "kg";
  products: Product[];
};
export function PosClient({
  products,
  deliveryProducts,
  session,
  withdrawals,
  recentSales,
  recentDeliveryOrders,
  productionFamilies,
  productionBatches,
  latestSession,
  availability,
  closingSummary,
}: {
  products: Product[];
  deliveryProducts: Product[];
  session: CashSession | null;
  withdrawals: CashWithdrawal[];
  recentSales: RecentSale[];
  recentDeliveryOrders: DeliveryOrder[];
  productionFamilies: ProductionFamily[];
  productionBatches: ProductionBatch[];
  latestSession: CashSession | null;
  availability: DailyAvailability[];
  closingSummary: SessionClosingSummary | null;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [closing, setClosing] = useState(false);
  const [weighing, setWeighing] = useState<Product | null>(null);
  const [managingAvailability, setManagingAvailability] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [selectingGroup, setSelectingGroup] = useState<ProductTile | null>(
    null,
  );
  const [recordingProduction, setRecordingProduction] = useState(false);
  const [recordingDelivery, setRecordingDelivery] = useState(false);
  const [recordingSpecialSale, setRecordingSpecialSale] = useState(false);
  const categories = ["Todos", ...new Set(products.map((p) => p.category))];
  const visibleProducts = products.filter(
    (product) => category === "Todos" || product.category === category,
  );
  const productTiles = [...groupProductsForSale(visibleProducts).values()];
  const lines = products
    .filter((p) => cart[p.id])
    .map((p) => ({ ...p, quantity: cart[p.id] }));
  const total = calculateCartTotal(lines);
  const withdrawalTotal = withdrawals.reduce(
    (sum, withdrawal) => sum + withdrawal.amount,
    0,
  );
  const empanadaProducts = deliveryProducts.filter(
    (product) =>
      product.saleUnit === "unit" &&
      product.category.toLocaleLowerCase("es").includes("empanada"),
  );
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
  async function recordSale() {
    if (!session || !lines.length || busy) return;
    setBusy(true);
    try {
      const result = await registerSaleAction(
        session.id,
        "unclassified",
        null,
        lines.map((line) => ({
          product_id: line.id,
          quantity: line.quantity,
        })),
      );
      if (!result.ok) {
        alert(result.error);
        setBusy(false);
        return;
      }
      setCart({});
      alert("Venta registrada");
      location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo registrar");
      setBusy(false);
    }
  }
  if (!session)
    return <OpenSession latestSession={latestSession} products={products} />;
  return (
    <main className="grid min-h-[calc(100vh-64px)] min-w-0 overflow-x-hidden lg:h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1fr)_390px] lg:overflow-hidden">
      <section className="min-w-0 p-3 pb-28 sm:p-4 sm:pb-28 md:p-5 lg:overflow-y-auto lg:pb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#cbdcc6] bg-[#edf4e9] px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-lg bg-[#235b45] text-white">
              <Clock size={17} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#687467]">
                Caja activa
              </p>
              <p className="mt-0.5 text-sm font-black text-[#235b45]">
                Iniciada {formatSessionDateTime(session.openedAt)}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#687467]">
            Efectivo inicial: <b>{formatClp(session.openingCash)}</b>
          </p>
        </div>
        <div className="mb-3 rounded-xl border border-[#dfdfd5] bg-[#fffef9] p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#6f746c]">
              Últimas ventas
            </p>
            <span className="text-[10px] text-[#8a8e86]">Jornada actual</span>
          </div>
          {recentSales.length ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex min-w-[148px] flex-1 items-center justify-between gap-3 rounded-lg bg-[#f1f2e9] px-3 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#777]">
                      #{sale.saleNumber} ·{" "}
                      {new Date(sale.createdAt).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Santiago",
                      })}
                    </p>
                    <p className="truncate text-[10px] font-bold text-[#235b45]">
                      {sale.kind === "special_order" && sale.scheduledFor
                        ? `Especial · entrega ${formatCivilDate(sale.scheduledFor)}`
                        : sale.payment === "unclassified"
                          ? "Por conciliar"
                          : paymentLabels[sale.payment]}
                    </p>
                  </div>
                  <b className="money text-sm">{formatClp(sale.total)}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-[#f1f2e9] px-3 py-2 text-center text-[11px] text-[#777]">
              Todavía no hay ventas registradas en esta jornada.
            </p>
          )}
        </div>
        <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-3">
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
        {empanadaProducts.length > 0 && (
          <div className="mb-3 flex min-w-0 items-center gap-2 rounded-xl border border-[#d6dfd1] bg-[#f4f7f1] p-2">
            <p className="hidden shrink-0 pl-1 text-[10px] font-black uppercase tracking-wider text-[#687467] xl:block">
              Disponibles
            </p>
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {empanadaProducts.map((product) => {
                const available = product.availability?.availableQuantity || 0;
                return (
                  <div
                    key={product.id}
                    className="flex min-w-fit items-center gap-1.5 rounded-lg bg-white px-2 py-1 shadow-sm"
                  >
                    <span
                      className={`grid size-6 place-items-center rounded-md text-[11px] font-black ${available > 5 ? "bg-[#dfeeda] text-[#235b45]" : available > 0 ? "bg-[#fff0b7] text-[#6f5711]" : "bg-[#f6e2da] text-[#a24628]"}`}
                    >
                      {available}
                    </span>
                    <span className="max-w-28 truncate text-[11px] font-bold">
                      {product.name.replace(/^Empanada\s+(de\s+)?/i, "")}
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setManagingAvailability(true)}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#235b45] text-white"
              title="Ajustar cantidades de empanadas"
              aria-label="Ajustar cantidades de empanadas"
            >
              <Plus size={15} />
            </button>
          </div>
        )}
        {products.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-4">
            {productTiles.map((tile) => {
              if (tile.products.length > 1) {
                const selectedQuantity = tile.products.reduce(
                  (sum, product) => sum + (cart[product.id] || 0),
                  0,
                );
                const availableProducts = tile.products.filter(
                  (product) =>
                    !product.trackDailyAvailability ||
                    (product.availability?.availableQuantity || 0) >
                      (cart[product.id] || 0),
                );
                return (
                  <button
                    key={tile.key}
                    onClick={() => setSelectingGroup(tile)}
                    disabled={!availableProducts.length}
                    className="card relative min-h-[104px] overflow-hidden text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-0"
                  >
                    {selectedQuantity > 0 && (
                      <span className="absolute left-2 top-2 z-20 grid h-7 min-w-7 place-items-center rounded-full bg-[#d8f070] px-1.5 text-[10px] font-black text-[#235b45] shadow-sm">
                        {tile.saleUnit === "kg"
                          ? `${Math.round(selectedQuantity * 1000)}g`
                          : selectedQuantity}
                      </span>
                    )}
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-[#235b45] px-2 py-1 text-[9px] font-black text-white shadow-sm sm:px-2.5 sm:text-[11px]">
                      {tile.products.length} variedades
                    </span>
                    <div className="hidden h-20 place-items-center bg-[#e5eee2] text-[#235b45] sm:grid">
                      <Layers3 size={32} />
                    </div>
                    <div className="flex h-full flex-col justify-end p-3 pt-10 sm:block sm:h-auto sm:pt-3">
                      <p className="text-sm font-black leading-5 sm:min-h-10">
                        {tile.category}
                      </p>
                      <p className="money mt-2 text-base font-black text-[#235b45]">
                        Elegir variedad {tile.saleUnit === "kg" ? "/ kg" : ""}
                      </p>
                    </div>
                  </button>
                );
              }
              const p = tile.products[0];
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
                  className="card relative min-h-[104px] overflow-hidden text-left transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-55 sm:min-h-0"
                >
                  {!!cart[p.id] && (
                    <span className="absolute left-2 top-2 z-20 grid h-7 min-w-7 place-items-center rounded-full bg-[#d8f070] px-1.5 text-[10px] font-black text-[#235b45] shadow-sm">
                      {p.saleUnit === "kg"
                        ? `${Math.round(cart[p.id] * 1000)}g`
                        : cart[p.id]}
                    </span>
                  )}
                  {remaining !== null && (
                    <span
                      className={`absolute right-2 top-2 z-10 rounded-full px-2 py-1 text-[9px] font-black shadow-sm sm:px-2.5 sm:text-[11px] ${remaining === 0 ? "bg-[#a24628] text-white" : remaining <= 5 ? "bg-[#f3c94f] text-[#493b0c]" : "bg-[#235b45] text-white"}`}
                    >
                      {remaining === 0 ? "Agotado" : `${remaining} disp.`}
                    </span>
                  )}
                  <div className="hidden h-20 place-items-center bg-[#eaeae1] sm:grid">
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
                  <div className="flex h-full flex-col justify-end p-3 pt-10 sm:block sm:h-auto sm:pt-3">
                    <p className="text-sm font-black leading-5 sm:min-h-10">
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
      {mobileCartOpen && (
        <button
          aria-label="Cerrar carro"
          onClick={() => setMobileCartOpen(false)}
          className="fixed inset-0 z-30 bg-black/45 lg:hidden"
        />
      )}
      <aside
        className={`border-l border-[#dfdfd5] bg-[#fffef9] p-5 lg:h-full lg:overflow-y-auto max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[88dvh] max-lg:overflow-y-auto max-lg:rounded-t-3xl max-lg:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-18px_50px_rgba(0,0,0,.18)] ${mobileCartOpen ? "max-lg:block" : "max-lg:hidden"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Venta actual
            </p>
            <h2 className="mt-1 text-xl font-black">Carro</h2>
          </div>
          <div className="flex items-center gap-3">
            {lines.length > 0 && (
              <button
                onClick={() => setCart({})}
                className="text-xs font-bold text-[#a24628]"
              >
                Limpiar
              </button>
            )}
            <button
              onClick={() => setMobileCartOpen(false)}
              className="grid size-9 place-items-center rounded-full bg-[#f0f0e8] lg:hidden"
              aria-label="Cerrar carro"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setRecordingSpecialSale(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#235b45] bg-[#edf4e9] px-3 py-2 text-xs font-black text-[#235b45]"
          >
            <Handshake size={15} /> Venta especial
          </button>
          <button
            onClick={() => setRecordingDelivery(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#d91f4b] bg-white px-3 py-2 text-xs font-black text-[#d91f4b]"
          >
            <ShoppingBag size={15} /> PedidosYa
          </button>
          {productionFamilies.length > 0 && (
            <button
              onClick={() => setRecordingProduction(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#235b45] px-3 py-2 text-xs font-black text-white"
            >
              <Layers3 size={15} /> Pan
            </button>
          )}
          {availability.length > 0 && (
            <button
              onClick={() => setManagingAvailability(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#235b45] bg-white px-3 py-2 text-xs font-black text-[#235b45]"
            >
              <ClipboardList size={15} /> Ajustar empanadas
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
                  {formatClp(calculateLineTotal(l))}
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
            <div className="py-10 text-center text-sm text-[#888]">
              Toca un producto para agregarlo
            </div>
          )}
        </div>
        <div className="mt-5 border-t-2 border-[#222] pt-4">
          <div className="mb-4 rounded-xl bg-[#f2f2ea] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#777]">
                  Retiros de caja
                </p>
                <b className="money text-sm">{formatClp(withdrawalTotal)}</b>
              </div>
              <button
                onClick={() => setWithdrawing(true)}
                className="flex items-center gap-2 rounded-lg border border-[#d0d0c7] bg-white px-3 py-2 text-xs font-bold text-[#235b45]"
              >
                <HandCoins size={15} /> Anotar retiro
              </button>
            </div>
            {withdrawals[0] && (
              <p className="mt-2 truncate text-[11px] text-[#777]">
                Último: {formatClp(withdrawals[0].amount)} ·{" "}
                {withdrawals[0].reason}
              </p>
            )}
          </div>
          <div className="flex items-end justify-between">
            <span className="font-bold">Total</span>
            <span className="money text-3xl font-black">
              {formatClp(total)}
            </span>
          </div>
          <button
            disabled={!total || busy}
            onClick={recordSale}
            className="mt-5 h-14 w-full rounded-2xl bg-[#235b45] text-lg font-black text-white disabled:opacity-30"
          >
            {busy ? "Registrando…" : "Registrar venta"}
          </button>
          <button
            onClick={() => setClosing(true)}
            className="mt-3 w-full text-center text-xs font-bold text-[#a24628]"
          >
            Cerrar jornada de caja
          </button>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#d8d8cf] bg-[#fffef9]/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-lg lg:hidden">
        <button
          onClick={() => setMobileCartOpen(true)}
          className="flex h-14 w-full items-center justify-between rounded-2xl bg-[#235b45] px-5 text-white shadow-lg"
        >
          <span className="flex items-center gap-2 text-sm font-black">
            <ShoppingBag size={18} />
            {lines.length
              ? `${lines.length} ${lines.length === 1 ? "producto" : "productos"}`
              : "Abrir carro y gestión"}
          </span>
          <span className="money text-lg font-black">{formatClp(total)}</span>
        </button>
      </div>
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
          withdrawalTotal={withdrawalTotal}
          onClose={() => setClosing(false)}
          availability={availability}
          products={products}
          summary={closingSummary!}
          productionFamilies={productionFamilies}
          productionBatches={productionBatches}
          deliveryOrders={recentDeliveryOrders}
        />
      )}
      {managingAvailability && (
        <AvailabilityDialog
          sessionId={session.id}
          availability={availability}
          onClose={() => setManagingAvailability(false)}
        />
      )}
      {withdrawing && (
        <CashWithdrawalDialog
          sessionId={session.id}
          onClose={() => setWithdrawing(false)}
        />
      )}
      {selectingGroup && (
        <ProductGroupDialog
          group={selectingGroup}
          cart={cart}
          onClose={() => setSelectingGroup(null)}
          onSelect={(product) => {
            setSelectingGroup(null);
            add(product.id);
          }}
        />
      )}
      {recordingProduction && (
        <ProductionDialog
          sessionId={session.id}
          families={productionFamilies}
          batches={productionBatches}
          onClose={() => setRecordingProduction(false)}
        />
      )}
      {recordingDelivery && (
        <PedidosYaDialog
          sessionId={session.id}
          products={deliveryProducts}
          onClose={() => setRecordingDelivery(false)}
        />
      )}
      {recordingSpecialSale && (
        <SpecialSaleDialog
          sessionId={session.id}
          products={deliveryProducts}
          onClose={() => setRecordingSpecialSale(false)}
        />
      )}
    </main>
  );
}

function SpecialSaleDialog({
  sessionId,
  products,
  onClose,
}: {
  sessionId: string;
  products: Product[];
  onClose: () => void;
}) {
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((product) => [product.id, product.price])),
  );
  const [scheduledFor, setScheduledFor] = useState(todayInSantiago());
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const categories = [
    "Todos",
    ...new Set(products.map((product) => product.category)),
  ];
  const selected = products.filter((product) => cart[product.id]);
  const total = selected.reduce(
    (sum, product) => sum + Math.round(prices[product.id] * cart[product.id]),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-5 md:max-w-4xl md:rounded-3xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#235b45]">
              Reserva o precio acordado
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Registrar venta especial
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[#747970]">
              Para pedidos pagados, ventas mayoristas o acuerdos con un precio
              diferente. Se registra hoy y la fecha indica cuándo se entrega.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">
            Cliente (opcional)
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="input mt-2"
              placeholder="Ej: María Pérez"
            />
          </label>
          <label className="text-xs font-bold">
            Fecha de entrega
            <input
              type="date"
              required
              value={scheduledFor}
              onChange={(event) => setScheduledFor(event.target.value)}
              className="input mt-2"
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${category === item ? "bg-[#235b45] text-white" : "border bg-white"}`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {products
            .filter(
              (product) =>
                category === "Todos" || product.category === category,
            )
            .map((product) => {
              const quantity = cart[product.id] || 0;
              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border p-3 ${quantity ? "border-[#8eaf93] bg-[#edf4e9]" : "border-[#deded5] bg-white"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-sm">{product.name}</b>
                    <span className="whitespace-nowrap text-[10px] text-[#777]">
                      Normal {formatClp(product.price)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-bold uppercase text-[#777]">
                      Cantidad
                      <input
                        type="number"
                        min="0"
                        step={product.saleUnit === "kg" ? "0.001" : "1"}
                        value={quantity || ""}
                        onChange={(event) =>
                          setCart((current) => ({
                            ...current,
                            [product.id]: Number(event.target.value),
                          }))
                        }
                        className="input mt-1 h-10"
                        placeholder="0"
                      />
                    </label>
                    <label className="text-[10px] font-bold uppercase text-[#777]">
                      Precio acordado
                      <input
                        type="number"
                        min="1"
                        value={prices[product.id]}
                        onChange={(event) =>
                          setPrices((current) => ({
                            ...current,
                            [product.id]: Number(event.target.value),
                          }))
                        }
                        className="input mt-1 h-10"
                      />
                    </label>
                  </div>
                  <p className="money mt-2 text-right text-xs font-black text-[#235b45]">
                    {quantity
                      ? formatClp(Math.round(quantity * prices[product.id]))
                      : `por ${product.saleUnit === "kg" ? "kg" : "unidad"}`}
                  </p>
                </div>
              );
            })}
        </div>

        <form
          className="sticky bottom-0 mt-5 rounded-2xl border border-[#d9dfd4] bg-[#fffef9] p-4 shadow-[0_-8px_24px_rgba(35,45,35,.08)]"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const result = await registerSpecialSaleAction(
                sessionId,
                scheduledFor,
                customerName,
                note,
                selected.map((product) => ({
                  product_id: product.id,
                  quantity: cart[product.id],
                  unit_price: prices[product.id],
                })),
              );
              if (!result.ok) throw new Error(result.error);
              location.reload();
            } catch (error) {
              alert(
                error instanceof Error
                  ? error.message
                  : "No se pudo registrar la venta especial",
              );
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <label className="text-xs font-bold">
              Nota (opcional)
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="input mt-2 bg-white"
                placeholder="Ej: 28 empanadas pagadas para el día 18"
              />
            </label>
            <div className="sm:px-4 sm:pb-2 sm:text-right">
              <span className="text-[10px] font-bold uppercase text-[#777]">
                Total acordado
              </span>
              <b className="money block text-2xl">{formatClp(total)}</b>
            </div>
            <button
              disabled={busy || !total || !scheduledFor}
              className="h-12 rounded-xl bg-[#235b45] px-6 font-black text-white disabled:opacity-40"
            >
              {busy ? "Registrando…" : "Registrar pagada"}
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-[#777]">
            Esta venta quedará incluida en el cierre de hoy. Las ventas
            especiales no modifican la disponibilidad de empanadas de caja,
            porque ese contador se usa solamente para ventas presenciales.
          </p>
        </form>
      </div>
    </div>
  );
}

function PedidosYaDialog({
  sessionId,
  products,
  onClose,
}: {
  sessionId: string;
  products: Product[];
  onClose: () => void;
}) {
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      products.map((product) => [
        product.id,
        product.pedidosYaPrice || product.price,
      ]),
    ),
  );
  const [orderNumber, setOrderNumber] = useState("");
  const [netEdited, setNetEdited] = useState(false);
  const [netAmount, setNetAmount] = useState(0);
  const [busy, setBusy] = useState(false);
  const categories = [
    "Todos",
    ...new Set(products.map((product) => product.category)),
  ];
  const selected = products.filter((product) => cart[product.id]);
  const gross = selected.reduce(
    (sum, product) => sum + Math.round(prices[product.id] * cart[product.id]),
    0,
  );
  const suggestedNet = Math.round(gross * 0.762);
  const effectiveNet = netEdited ? netAmount : suggestedNet;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 md:max-w-3xl md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#d91f4b]">
              Canal externo
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Registrar pedido de PedidosYa
            </h2>
            <p className="mt-2 text-sm text-[#747970]">
              Esta venta no entra al arqueo de efectivo ni tarjetas del local.
            </p>
          </div>
          <button onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-black ${category === item ? "bg-[#d91f4b] text-white" : "border bg-white"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {products
            .filter(
              (product) =>
                category === "Todos" || product.category === category,
            )
            .map((product) => {
              const quantity = cart[product.id] || 0;
              return (
                <div
                  key={product.id}
                  className="rounded-2xl border border-[#deded5] bg-white p-3"
                >
                  <b className="block min-h-10 text-sm">{product.name}</b>
                  <label className="mt-2 block text-[10px] font-bold uppercase text-[#777]">
                    Precio plataforma
                    <input
                      type="number"
                      min="1"
                      value={prices[product.id]}
                      onChange={(event) =>
                        setPrices((current) => ({
                          ...current,
                          [product.id]: Number(event.target.value),
                        }))
                      }
                      className="input mt-1 h-10"
                    />
                  </label>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) => ({
                          ...current,
                          [product.id]: Math.max(0, quantity - 1),
                        }))
                      }
                      className="grid size-9 place-items-center rounded-lg bg-[#eee]"
                      disabled={!quantity}
                    >
                      <Minus size={15} />
                    </button>
                    <b>{quantity}</b>
                    <button
                      type="button"
                      onClick={() =>
                        setCart((current) => ({
                          ...current,
                          [product.id]: quantity + 1,
                        }))
                      }
                      className="grid size-9 place-items-center rounded-lg bg-[#ffdce5] text-[#d91f4b]"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
        <form
          className="mt-5 rounded-2xl bg-[#f3f3eb] p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const result = await registerPedidosYaOrderAction(
                sessionId,
                orderNumber,
                effectiveNet,
                selected.map((product) => ({
                  product_id: product.id,
                  quantity: cart[product.id],
                  unit_price: prices[product.id],
                })),
              );
              if (!result.ok) throw new Error(result.error);
              location.reload();
            } catch (error) {
              alert(
                error instanceof Error
                  ? error.message
                  : "No se pudo registrar el pedido",
              );
              setBusy(false);
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold">
              Número de pedido (opcional)
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="input mt-2 bg-white"
              />
            </label>
            <label className="text-xs font-bold">
              Ingreso estimado para KUMERA
              <input
                type="number"
                min="0"
                max={gross}
                value={effectiveNet || ""}
                onChange={(e) => {
                  setNetEdited(true);
                  setNetAmount(Number(e.target.value));
                }}
                className="input mt-2 bg-white"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#d9d9cf] pt-4">
            <div>
              <span className="text-xs text-[#777]">Venta al cliente</span>
              <b className="money block text-xl">{formatClp(gross)}</b>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#777]">Comisión estimada</span>
              <b className="money block text-[#d91f4b]">
                {formatClp(Math.max(0, gross - effectiveNet))}
              </b>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#777]">
            El ingreso se sugiere usando el 76,2% observado en tus pedidos
            recientes. Puedes reemplazarlo por el valor exacto mostrado por
            PedidosYa.
          </p>
          <button
            disabled={busy || !gross}
            className="mt-4 h-12 w-full rounded-xl bg-[#d91f4b] font-black text-white disabled:opacity-40"
          >
            {busy ? "Registrando…" : "Registrar pedido"}
          </button>
        </form>
      </div>
    </div>
  );
}

function groupProductsForSale(products: Product[]) {
  const groups = new Map<string, ProductTile>();
  for (const product of products) {
    const key = `${product.category}::${product.saleUnit}`;
    const current = groups.get(key);
    if (current) current.products.push(product);
    else
      groups.set(key, {
        key,
        category: product.category,
        saleUnit: product.saleUnit,
        products: [product],
      });
  }
  return groups;
}

function ProductGroupDialog({
  group,
  cart,
  onClose,
  onSelect,
}: {
  group: ProductTile;
  cart: Cart;
  onClose: () => void;
  onSelect: (product: Product) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              {group.category}
              {group.saleUnit === "kg" ? " · venta por kg" : ""}
            </p>
            <h2 className="mt-1 text-2xl font-black">Elige la variedad</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0f0e8]"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#6f746c]">
          Cada variedad conserva su propio precio, receta, costo y margen de
          contribución.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {group.products.map((product) => {
            const remaining = product.trackDailyAvailability
              ? Math.max(
                  0,
                  (product.availability?.availableQuantity || 0) -
                    (cart[product.id] || 0),
                )
              : null;
            return (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                disabled={remaining === 0}
                className="relative min-h-24 rounded-2xl border border-[#dcdcd3] bg-white p-4 text-left active:scale-[.98] disabled:opacity-45"
              >
                <b className="block pr-2 text-sm leading-5">{product.name}</b>
                <span className="money mt-3 block text-sm font-black text-[#235b45]">
                  {formatClp(product.price)}
                  {product.saleUnit === "kg" ? "/kg" : ""}
                </span>
                {remaining !== null && (
                  <span className="mt-1 block text-[10px] font-bold text-[#777]">
                    {remaining ? `${remaining} disponibles` : "Agotado"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {group.saleUnit === "kg" && (
          <div className="mt-4 rounded-xl border border-[#ead8a6] bg-[#fff7d9] p-4 text-[11px] leading-5 text-[#6f5b17]">
            <b>¿La bolsa lleva panes mezclados?</b> Registra y pesa cada
            variedad por separado. Así el sistema no inventará un costo promedio
            y los márgenes seguirán siendo confiables.
          </div>
        )}
      </div>
    </div>
  );
}

function ProductionDialog({
  sessionId,
  families,
  batches,
  onClose,
}: {
  sessionId: string;
  families: ProductionFamily[];
  batches: ProductionBatch[];
  onClose: () => void;
}) {
  const basketTareGrams = 614;
  const [familyId, setFamilyId] = useState(families[0]?.product.id || "");
  const family = families.find((item) => item.product.id === familyId);
  const [componentId, setComponentId] = useState(
    families[0]?.members[0]?.id || "",
  );
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<ProductionBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const familyBatches = batches.filter(
    (batch) => batch.familyProductId === familyId,
  );
  const produced = familyBatches.reduce(
    (sum, batch) => sum + batch.quantity,
    0,
  );
  const productionCost = familyBatches.reduce(
    (sum, batch) => sum + batch.quantity * batch.unitCost,
    0,
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Caja activa
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {editing ? "Editar producción" : "Registrar producción"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-[#f0f0e8]"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            try {
              const netWeightGrams = Number(quantity) - basketTareGrams;
              if (netWeightGrams <= 0)
                throw new Error(
                  `El peso debe ser mayor a ${basketTareGrams} g, que corresponden al canasto.`,
                );
              const quantityInKg = netWeightGrams / 1000;
              const result = editing
                ? await updateProductionBatchAction(
                    editing.id,
                    sessionId,
                    familyId,
                    componentId,
                    quantityInKg,
                    note,
                  )
                : await registerProductionBatchAction(
                    sessionId,
                    familyId,
                    componentId,
                    quantityInKg,
                    note,
                  );
              if (result.costingPending) {
                alert(
                  "Producción guardada. Esta variedad todavía no tiene una receta de costos completa; podrás completarla después sin perder los kilos ingresados.",
                );
              }
              location.reload();
            } catch (error) {
              alert(
                error instanceof Error
                  ? error.message
                  : "No se pudo guardar la producción",
              );
              setBusy(false);
            }
          }}
        >
          {families.length > 1 && (
            <label className="block text-xs font-bold">
              Familia comercial
              <select
                value={familyId}
                onChange={(event) => {
                  const next = families.find(
                    (item) => item.product.id === event.target.value,
                  );
                  setFamilyId(event.target.value);
                  setComponentId(next?.members[0]?.id || "");
                }}
                className="input mt-2"
              >
                {families.map((item) => (
                  <option key={item.product.id} value={item.product.id}>
                    {item.product.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-xs font-bold">
            Variedad producida
            <select
              required
              value={componentId}
              onChange={(event) => setComponentId(event.target.value)}
              className="input mt-2"
            >
              {family?.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Peso en la balanza con canasto (gramos)
            <input
              autoFocus
              required
              type="number"
              min={basketTareGrams + 1}
              step="1"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="input mt-2 text-xl font-black"
              placeholder="Ej. 1567"
            />
            {Number(quantity) > basketTareGrams && (
              <span className="mt-2 block rounded-xl bg-[#edf4e9] px-3 py-2 text-[11px] font-medium leading-5 text-[#53645a]">
                {Number(quantity).toLocaleString("es-CL")} g brutos −{" "}
                {basketTareGrams} g del canasto ={" "}
                <b className="text-[#235b45]">
                  {(Number(quantity) - basketTareGrams).toLocaleString("es-CL")}{" "}
                  g netos (
                  {((Number(quantity) - basketTareGrams) / 1000).toLocaleString(
                    "es-CL",
                    {
                      minimumFractionDigits: 3,
                      maximumFractionDigits: 3,
                    },
                  )}{" "}
                  kg)
                </b>
              </span>
            )}
            <span className="mt-2 block text-[10px] font-medium text-[#777]">
              El sistema descuenta automáticamente los {basketTareGrams} g del
              canasto.
            </span>
          </label>
          <label className="block text-xs font-bold">
            Nota opcional
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="input mt-2"
              placeholder="Ej. Segunda hornada"
            />
          </label>
          <button
            disabled={
              busy || !componentId || Number(quantity) <= basketTareGrams
            }
            className="h-12 w-full rounded-xl bg-[#235b45] font-black text-white disabled:opacity-40"
          >
            {busy
              ? "Guardando…"
              : editing
                ? "Guardar corrección"
                : "Registrar hornada"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setQuantity("");
                setNote("");
              }}
              className="h-11 w-full rounded-xl border border-[#d8d8cf] font-bold text-[#62675f]"
            >
              Cancelar edición
            </button>
          )}
        </form>
        <div className="mt-5 rounded-xl bg-[#f0f2e9] p-4">
          <div className="flex justify-between text-xs">
            <span>Producción acumulada</span>
            <b>
              {produced.toLocaleString("es-CL", { maximumFractionDigits: 3 })}{" "}
              kg
            </b>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span>Costo productivo registrado</span>
            <b>{formatClp(Math.round(productionCost))}</b>
          </div>
        </div>
        {familyBatches.length > 0 && (
          <div className="mt-4 space-y-2">
            {familyBatches.slice(0, 8).map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e3da] p-3 text-xs"
              >
                <span className="min-w-0 flex-1">
                  <b>{batch.componentName}</b>
                  <br />
                  {new Date(batch.createdAt).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Santiago",
                  })}
                </span>
                <span className="shrink-0 text-right">
                  <b>{batch.quantity.toLocaleString("es-CL")} kg</b>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(batch);
                      setFamilyId(batch.familyProductId);
                      setComponentId(batch.componentProductId);
                      setQuantity(
                        String(
                          Math.round(batch.quantity * 1000) + basketTareGrams,
                        ),
                      );
                      setNote(batch.note || "");
                    }}
                    className="ml-3 rounded-lg border border-[#cfd5ca] px-2.5 py-1.5 font-black text-[#235b45]"
                  >
                    Editar
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CashWithdrawalDialog({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("Compra menor del negocio");
  const [isBusinessExpense, setIsBusinessExpense] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 md:place-items-center">
      <form
        className="w-full rounded-t-3xl bg-[#fffef9] p-6 md:max-w-md md:rounded-3xl"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          try {
            await registerCashWithdrawalAction(
              sessionId,
              Math.round(Number(amount)),
              reason,
              category,
              isBusinessExpense,
            );
            location.reload();
          } catch (error) {
            alert(
              error instanceof Error
                ? error.message
                : "No se pudo registrar el retiro",
            );
            setBusy(false);
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Caja activa
            </p>
            <h2 className="mt-1 text-xl font-black">Anotar retiro</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <label className="mt-5 block text-xs font-bold">Monto retirado</label>
        <input
          autoFocus
          type="number"
          min="1"
          step="1"
          required
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="input mt-2"
          placeholder="Ej. 3500"
        />
        <label className="mt-4 block text-xs font-bold">Motivo</label>
        <input
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="input mt-2"
          placeholder="Ej. Compra de agua y bebida"
        />
        <label className="mt-4 block text-xs font-bold">Categoría</label>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setIsBusinessExpense(event.target.value !== "Retiro personal");
          }}
          className="input mt-2"
        >
          {CASH_WITHDRAWAL_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="mt-4 flex items-start gap-3 rounded-xl bg-[#f2f2ea] p-3 text-xs">
          <input
            type="checkbox"
            checked={isBusinessExpense}
            onChange={(event) => setIsBusinessExpense(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <b>Es un gasto del negocio</b>
            <span className="mt-1 block font-normal text-[#777]">
              Desmárcalo si corresponde a un retiro personal del propietario.
            </span>
          </span>
        </label>
        <p className="mt-3 text-[11px] leading-5 text-[#777]">
          El retiro disminuirá el efectivo esperado al cerrar la caja. Si fue
          una compra del negocio, regístrala también en Compras y gastos.
        </p>
        <button
          disabled={busy || !amount || !reason.trim()}
          className="mt-5 h-12 w-full rounded-xl bg-[#235b45] font-black text-white disabled:opacity-40"
        >
          {busy ? "Registrando…" : "Registrar retiro"}
        </button>
      </form>
    </div>
  );
}

function formatSessionDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
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
  withdrawalTotal,
  onClose,
  availability,
  products,
  summary,
  productionFamilies,
  productionBatches,
  deliveryOrders,
}: {
  session: CashSession;
  withdrawalTotal: number;
  onClose: () => void;
  availability: DailyAvailability[];
  products: Product[];
  summary: SessionClosingSummary;
  productionFamilies: ProductionFamily[];
  productionBatches: ProductionBatch[];
  deliveryOrders: DeliveryOrder[];
}) {
  const [busy, setBusy] = useState(false);
  const [countedCash, setCountedCash] = useState("");
  const [externalTotals, setExternalTotals] = useState({
    debit: summary.byPayment.debit,
    credit: summary.byPayment.credit,
    transfer: summary.byPayment.transfer,
  });
  const [externalTransactions, setExternalTransactions] = useState({
    debit: summary.transactionsByPayment.debit,
    credit: summary.transactionsByPayment.credit,
    transfer: summary.transactionsByPayment.transfer,
  });
  const [waste, setWaste] = useState<
    {
      product_id?: string;
      product_name: string;
      quantity: string;
      sale_unit: "unit" | "kg";
      note?: string;
    }[]
  >([]);
  const [carryover, setCarryover] = useState<
    {
      product_id?: string;
      product_name: string;
      quantity: string;
      sale_unit: "unit" | "kg";
      note?: string;
    }[]
  >([]);
  const productionMembers = productionFamilies.flatMap(
    (family) => family.members,
  );
  const wasteProducts = [...products, ...productionMembers].filter(
    (product, index, list) =>
      list.findIndex((candidate) => candidate.id === product.id) === index,
  );
  const derivedCashSales =
    Number(countedCash || 0) + withdrawalTotal - session.openingCash;
  const cardAndTransferTotal =
    externalTotals.debit + externalTotals.credit + externalTotals.transfer;
  const allocatedTotal = Math.max(0, derivedCashSales) + cardAndTransferTotal;
  const allocationDifference = allocatedTotal - summary.recordedTotal;
  const externalTransactionCount =
    externalTransactions.debit +
    externalTransactions.credit +
    externalTransactions.transfer;
  const derivedCashTransactions = Math.max(
    derivedCashSales > 0 ? 1 : 0,
    summary.recordedTransactions - externalTransactionCount,
  );
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto overscroll-contain bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[100dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-[#fffef9] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-h-[calc(100dvh-2rem)] md:max-w-md md:rounded-3xl">
        <div className="sticky -top-6 z-10 -mx-2 flex justify-between border-b border-[#ecebe4] bg-[#fffef9]/95 px-2 pb-4 pt-1 backdrop-blur-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              Fin de jornada
            </p>
            <h2 className="mt-1 text-2xl font-black">Cerrar caja</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f0f0e8]"
            aria-label="Cerrar ventana"
          >
            <X />
          </button>
        </div>
        <div className="mt-5 rounded-xl bg-[#eff0e8] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-[#62675f]">
            Cálculo automático del efectivo vendido
          </p>
          <div className="mt-3 space-y-1.5 text-[11px] text-[#62675f]">
            <div className="flex justify-between">
              <span>Efectivo inicial</span>
              <b>{formatClp(session.openingCash)}</b>
            </div>
            <div className="flex justify-between">
              <span>Retiros registrados</span>
              <b>{formatClp(withdrawalTotal)}</b>
            </div>
          </div>
          <p className="mt-3 border-t border-[#d8dcd2] pt-3 text-[10px] leading-4 text-[#777]">
            Ventas en efectivo = efectivo final + retiros − efectivo inicial.
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
        <div className="mt-4 rounded-xl border border-[#e1e1d7] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-[#777]">
            Ventas registradas
          </p>
          <div className="mt-3 space-y-2 text-xs">
            {summary.products.map((item) => (
              <div key={item.name} className="flex justify-between gap-3">
                <span>
                  {item.name} ·{" "}
                  {item.saleUnit === "kg"
                    ? `${item.quantity.toLocaleString("es-CL", { maximumFractionDigits: 3 })} kg`
                    : `${item.quantity} un.`}
                </span>
                <b>{formatClp(item.total)}</b>
              </div>
            ))}
          </div>
        </div>
        {deliveryOrders.length > 0 && (
          <div className="mt-4 rounded-xl border border-[#f2c7d2] bg-[#fff5f7] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-[#d91f4b]">
              PedidosYa de la jornada
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="block text-[10px] text-[#777]">Pedidos</span>
                <b>{deliveryOrders.length}</b>
              </div>
              <div>
                <span className="block text-[10px] text-[#777]">
                  Venta bruta
                </span>
                <b className="money">
                  {formatClp(
                    deliveryOrders.reduce(
                      (sum, order) => sum + order.grossAmount,
                      0,
                    ),
                  )}
                </b>
              </div>
              <div>
                <span className="block text-[10px] text-[#777]">
                  Ingreso estimado
                </span>
                <b className="money">
                  {formatClp(
                    deliveryOrders.reduce(
                      (sum, order) => sum + order.estimatedNetAmount,
                      0,
                    ),
                  )}
                </b>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-[#777]">
              Se muestran aparte porque PedidosYa deposita el ingreso después de
              descontar su comisión.
            </p>
          </div>
        )}
        {productionFamilies.map((family) => {
          const familyBatches = productionBatches.filter(
            (batch) => batch.familyProductId === family.product.id,
          );
          const produced = familyBatches.reduce(
            (sum, batch) => sum + batch.quantity,
            0,
          );
          const sold = summary.products
            .filter((item) => item.productId === family.product.id)
            .reduce((sum, item) => sum + item.quantity, 0);
          const memberIds = new Set(family.members.map((member) => member.id));
          const wasted = waste
            .filter((item) => item.product_id && memberIds.has(item.product_id))
            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const carried = carryover
            .filter((item) => item.product_id && memberIds.has(item.product_id))
            .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
          const difference = produced - sold - wasted - carried;
          const productionCost = familyBatches.reduce(
            (sum, batch) => sum + batch.quantity * batch.unitCost,
            0,
          );
          return (
            <div
              key={family.product.id}
              className="mt-4 rounded-xl border border-[#cbdcc6] bg-[#edf4e9] p-4"
            >
              <p className="text-xs font-black uppercase tracking-wider text-[#235b45]">
                Conciliación de {family.product.name}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <span>Producido</span>
                <b className="text-right">
                  {produced.toLocaleString("es-CL")} kg
                </b>
                <span>Vendido</span>
                <b className="text-right">{sold.toLocaleString("es-CL")} kg</b>
                <span>Merma informada</span>
                <b className="text-right">
                  {wasted.toLocaleString("es-CL")} kg
                </b>
                <span>Sobrante vendible</span>
                <b className="text-right">
                  {carried.toLocaleString("es-CL")} kg
                </b>
                <span>Diferencia pendiente</span>
                <b
                  className={`text-right ${Math.abs(difference) <= 0.01 ? "text-[#235b45]" : "text-[#a24628]"}`}
                >
                  {difference.toLocaleString("es-CL", {
                    maximumFractionDigits: 3,
                  })}{" "}
                  kg
                </b>
                <span>Costo de producción</span>
                <b className="money text-right">
                  {formatClp(Math.round(productionCost))}
                </b>
              </div>
              <p className="mt-3 text-[10px] leading-4 text-[#667067]">
                Registra como sobrante lo que pueda venderse mañana. Usa merma
                solamente para lo descartado, regalado o definitivamente
                perdido.
              </p>
            </div>
          );
        })}
        <form
          action={async (form) => {
            setBusy(true);
            await closeCashSessionAction(
              session.id,
              Number(form.get("countedCash")),
              {
                note: String(form.get("note") || ""),
                reason: String(
                  form.get("reason") || "Totales verificados al cierre",
                ),
                actual: {
                  cash: derivedCashSales,
                  debit: externalTotals.debit,
                  credit: externalTotals.credit,
                  transfer: externalTotals.transfer,
                },
                transactions: {
                  cash: derivedCashTransactions,
                  debit: externalTransactions.debit,
                  credit: externalTransactions.credit,
                  transfer: externalTransactions.transfer,
                },
                waste: waste
                  .filter((item) => Number(item.quantity) > 0)
                  .map((item) => ({
                    ...item,
                    quantity: Number(item.quantity),
                  })),
                carryover: carryover
                  .filter((item) => Number(item.quantity) > 0)
                  .map((item) => ({
                    ...item,
                    quantity: Number(item.quantity),
                  })),
              },
            );
            location.reload();
          }}
          className="mt-5 space-y-4"
        >
          <label className="block text-xs font-bold">
            Efectivo final en caja
            <input
              name="countedCash"
              required
              inputMode="numeric"
              value={countedCash}
              onChange={(event) =>
                setCountedCash(event.target.value.replace(/\D/g, ""))
              }
              className="input mt-2 text-xl font-black"
            />
            <span className="mt-2 block text-[10px] font-medium text-[#777]">
              Cuenta todo el efectivo físico que queda, incluido el monto con
              que abriste la caja.
            </span>
          </label>
          <div
            className={`flex items-center justify-between rounded-xl border p-4 text-sm ${derivedCashSales >= 0 ? "border-[#bfd3bb] bg-[#edf4e9] text-[#235b45]" : "border-[#e3b9aa] bg-[#f9e8e1] text-[#9b4025]"}`}
          >
            <span className="font-bold">Ventas en efectivo calculadas</span>
            <b className="money">
              {derivedCashSales >= 0 ? formatClp(derivedCashSales) : "Inválido"}
            </b>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-[#777]">
              Totales externos
            </p>
            <p className="mt-1 text-[10px] leading-4 text-[#777]">
              Revisa estos valores contra TUU y la cuenta bancaria. El efectivo
              se calcula automáticamente desde el conteo físico.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["debit", "credit", "transfer"] as const).map((method) => (
              <label key={method} className="block text-xs font-bold">
                {paymentLabels[method]}
                <input
                  name={`actual_${method}`}
                  required
                  inputMode="numeric"
                  value={externalTotals[method]}
                  onChange={(event) =>
                    setExternalTotals((current) => ({
                      ...current,
                      [method]: Number(event.target.value.replace(/\D/g, "")),
                    }))
                  }
                  className="input mt-2"
                />
                <span className="mt-2 block text-[10px] text-[#777]">
                  Cantidad de transacciones
                </span>
                <input
                  name={`transactions_${method}`}
                  required
                  min={0}
                  inputMode="numeric"
                  value={externalTransactions[method]}
                  onChange={(event) =>
                    setExternalTransactions((current) => ({
                      ...current,
                      [method]: Number(event.target.value.replace(/\D/g, "")),
                    }))
                  }
                  className="input mt-1"
                />
              </label>
            ))}
          </div>
          <div
            className={`rounded-xl border p-4 text-sm ${allocationDifference === 0 ? "border-[#bfd3bb] bg-[#edf4e9] text-[#235b45]" : "border-[#ead7a4] bg-[#fff8df] text-[#765c12]"}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black">
                {allocationDifference === 0
                  ? "El cierre coincide con la caja"
                  : allocationDifference > 0
                    ? "Ingresaste más pagos que ventas"
                    : "Faltan pagos por clasificar"}
              </span>
              <b className="money">
                {formatClp(Math.abs(allocationDifference))}
              </b>
            </div>
            <div className="mt-2 flex justify-between text-[10px]">
              <span>
                Ventas registradas: {formatClp(summary.recordedTotal)}
              </span>
              <span>Pagos informados: {formatClp(allocatedTotal)}</span>
            </div>
          </div>
          <label className="block text-xs font-bold">
            Fuente de los totales
            <input
              name="reason"
              required
              defaultValue="Totales verificados al cierre"
              className="input mt-2"
            />
          </label>
          <div className="rounded-xl border border-[#e1e1d7] p-4">
            <div className="flex items-center justify-between">
              <div>
                <b className="text-sm">Sobrante vendible</b>
                <p className="mt-1 text-[10px] text-[#777]">
                  Producto que queda al cierre y todavía se venderá o
                  reutilizará.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCarryover((items) => [
                    ...items,
                    { product_name: "", quantity: "", sale_unit: "unit" },
                  ])
                }
                className="text-xs font-bold text-[#235b45]"
              >
                + Agregar sobrante
              </button>
            </div>
            {carryover.map((item, index) => (
              <div key={index} className="mt-3 grid grid-cols-[1fr_90px] gap-2">
                <select
                  value={item.product_id || ""}
                  onChange={(event) => {
                    const product = wasteProducts.find(
                      (candidate) => candidate.id === event.target.value,
                    );
                    setCarryover((items) =>
                      items.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              product_id: product?.id,
                              product_name: product?.name || "",
                              sale_unit: product?.saleUnit || "unit",
                            }
                          : row,
                      ),
                    );
                  }}
                  className="input"
                >
                  <option value="">Producto</option>
                  {wasteProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Cantidad de sobrante vendible"
                  inputMode="decimal"
                  placeholder={item.sale_unit === "kg" ? "kg" : "Un."}
                  value={item.quantity}
                  onChange={(event) =>
                    setCarryover((items) =>
                      items.map((row, i) =>
                        i === index
                          ? { ...row, quantity: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="input"
                />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#e1e1d7] p-4">
            <div className="flex items-center justify-between">
              <b className="text-sm">Mermas del día</b>
              <button
                type="button"
                onClick={() =>
                  setWaste((items) => [
                    ...items,
                    { product_name: "", quantity: "", sale_unit: "unit" },
                  ])
                }
                className="text-xs font-bold text-[#235b45]"
              >
                + Agregar merma
              </button>
            </div>
            {waste.map((item, index) => (
              <div
                key={index}
                className="mt-3 grid grid-cols-[1fr_90px_70px] gap-2"
              >
                <select
                  value={item.product_id || ""}
                  onChange={(event) => {
                    const product = products.find(
                      (p) => p.id === event.target.value,
                    );
                    setWaste((items) =>
                      items.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              product_id: product?.id,
                              product_name: product?.name || "",
                              sale_unit: product?.saleUnit || "unit",
                            }
                          : row,
                      ),
                    );
                  }}
                  className="input"
                >
                  <option value="">Producto / descripción</option>
                  {wasteProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Cantidad de merma"
                  inputMode="decimal"
                  placeholder="Cantidad"
                  value={item.quantity}
                  onChange={(event) =>
                    setWaste((items) =>
                      items.map((row, i) =>
                        i === index
                          ? { ...row, quantity: event.target.value }
                          : row,
                      ),
                    )
                  }
                  className="input"
                />
                <select
                  value={item.sale_unit}
                  onChange={(event) =>
                    setWaste((items) =>
                      items.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              sale_unit: event.target.value as "unit" | "kg",
                            }
                          : row,
                      ),
                    )
                  }
                  className="input"
                >
                  <option value="unit">un.</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            ))}
          </div>
          <label className="block text-xs font-bold">
            Nota opcional
            <input name="note" className="input mt-2" />
          </label>
          <button
            disabled={busy || derivedCashSales < 0}
            className="sticky bottom-0 h-13 w-full rounded-xl bg-[#235b45] font-black text-white shadow-[0_-10px_20px_12px_#fffef9] disabled:opacity-50"
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
  cardFeeSettings,
}: {
  total: number;
  busy: boolean;
  onClose: () => void;
  onPay: (m: PaymentMethod, c: number | null) => void;
  cardFeeSettings: CardFeeSettings;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const cashPayable = calculateCashPayable(total);
  const cashRounding = calculateCashRounding(total);
  const [cash, setCash] = useState(String(cashPayable));
  const received = Number(cash) || 0;
  const fee = calculateCardFee(total, method, cardFeeSettings);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto overscroll-contain bg-black/50 md:place-items-center md:p-4">
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-3xl bg-[#fffef9] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-h-[calc(100dvh-2rem)] md:max-w-lg md:rounded-3xl">
        <div className="flex justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777]">
              {method === "cash"
                ? "Total a pagar en efectivo"
                : "Total a pagar"}
            </p>
            <p className="money mt-1 text-4xl font-black">
              {formatClp(method === "cash" ? cashPayable : total)}
            </p>
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
            {cashRounding !== 0 && (
              <div className="mb-4 rounded-xl border border-[#dfe4da] bg-[#f3f6ef] p-3 text-xs text-[#59645a]">
                Total de la venta: <b>{formatClp(total)}</b> · Redondeo legal de
                efectivo:{" "}
                <b>
                  {cashRounding > 0 ? "+" : ""}
                  {formatClp(cashRounding)}
                </b>
              </div>
            )}
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
                {formatClp(Math.max(0, received - cashPayable))}
              </b>
            </div>
          </div>
        )}
        {(method === "debit" || method === "credit") && (
          <div className="mt-5 rounded-xl bg-[#eff0e8] p-4 text-sm">
            <div className="flex justify-between">
              <span>
                Comisión {cardFeeSettings.percentage}% +{" "}
                {formatClp(cardFeeSettings.fixedAmount)}
              </span>
              <b className="money">{formatClp(fee.net)}</b>
            </div>
            <div className="mt-2 flex justify-between text-[#6f746c]">
              <span>IVA de la comisión</span>
              <b className="money">{formatClp(fee.tax)}</b>
            </div>
            <div className="mt-3 flex justify-between border-t border-[#d8ddd4] pt-3 font-black text-[#235b45]">
              <span>
                Abono esperado en {cardFeeSettings.settlementDays} día
              </span>
              <b className="money">{formatClp(fee.deposit)}</b>
            </div>
          </div>
        )}
        <button
          disabled={busy || (method === "cash" && received < cashPayable)}
          onClick={() => onPay(method, method === "cash" ? received : null)}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#235b45] text-lg font-black text-white disabled:opacity-40"
        >
          <Check /> {busy ? "Registrando..." : "Confirmar venta"}
        </button>
      </div>
    </div>
  );
}

function todayInSantiago() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatCivilDate(value: string) {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}
