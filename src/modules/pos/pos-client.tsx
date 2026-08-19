"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  Banknote,
  Check,
  ClipboardList,
  Clock,
  HandCoins,
  Layers3,
  Minus,
  Plus,
  ShoppingBag,
  X,
} from "lucide-react";
import { formatClp } from "@/shared/money";
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
  reconcileCashSessionAction,
  registerSaleAction,
} from "./actions";
import {
  paymentLabels,
  type AvailabilityMovementType,
  type CashSession,
  type CashWithdrawal,
  type DailyAvailability,
  type PaymentMethod,
  type Product,
  type ProductionBatch,
  type ProductionFamily,
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
  session,
  cashSales,
  withdrawals,
  productionFamilies,
  productionBatches,
  latestSession,
  availability,
  cardFeeSettings,
  closingSummary,
}: {
  products: Product[];
  session: CashSession | null;
  cashSales: number;
  withdrawals: CashWithdrawal[];
  productionFamilies: ProductionFamily[];
  productionBatches: ProductionBatch[];
  latestSession: CashSession | null;
  availability: DailyAvailability[];
  cardFeeSettings: CardFeeSettings;
  closingSummary: SessionClosingSummary | null;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [paying, setPaying] = useState(false);
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
      <section className="p-3 pb-28 sm:p-4 sm:pb-28 md:p-6 lg:pb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cbdcc6] bg-[#edf4e9] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[#235b45] text-white">
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
          <div className="flex shrink-0 gap-2">
            {productionFamilies.length > 0 && (
              <button
                onClick={() => setRecordingProduction(true)}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-[#235b45] bg-[#235b45] px-3 py-2 text-xs font-black text-white"
              >
                <Layers3 size={16} />
                <span className="hidden sm:inline">Producción</span>
              </button>
            )}
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
        </div>
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
                    <div className="hidden h-28 place-items-center bg-[#e5eee2] text-[#235b45] sm:grid">
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
                  <div className="hidden h-28 place-items-center bg-[#eaeae1] sm:grid">
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
        className={`border-l border-[#dfdfd5] bg-[#fffef9] p-5 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:max-h-[88dvh] max-lg:overflow-y-auto max-lg:rounded-t-3xl max-lg:pb-[max(1.25rem,env(safe-area-inset-bottom))] max-lg:shadow-[0_-18px_50px_rgba(0,0,0,.18)] ${mobileCartOpen ? "max-lg:block" : "max-lg:hidden"}`}
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
            <div className="py-16 text-center text-sm text-[#888]">
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
      {paying && (
        <PaymentDialog
          total={total}
          busy={busy}
          cardFeeSettings={cardFeeSettings}
          onClose={() => setPaying(false)}
          onPay={async (method, cash) => {
            setBusy(true);
            try {
              const result = await registerSaleAction(
                session.id,
                method,
                cash,
                lines.map((l) => ({ product_id: l.id, quantity: l.quantity })),
              );
              if (!result.ok) {
                alert(result.error);
                setBusy(false);
                return;
              }
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
          expectedCash={session.openingCash + cashSales - withdrawalTotal}
          onClose={() => setClosing(false)}
          availability={availability}
          products={products}
          summary={closingSummary!}
          productionFamilies={productionFamilies}
          productionBatches={productionBatches}
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
    </main>
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
              const quantityInKg = Number(quantity) / 1000;
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
            Peso total producido (gramos)
            <input
              autoFocus
              required
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="input mt-2 text-xl font-black"
              placeholder="Ej. 1567"
            />
            {Number(quantity) > 0 && (
              <span className="mt-2 block text-[11px] font-medium text-[#697067]">
                Equivale a{" "}
                {(Number(quantity) / 1000).toLocaleString("es-CL", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                kg
              </span>
            )}
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
            disabled={busy || !componentId || Number(quantity) <= 0}
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
                      setQuantity(String(Math.round(batch.quantity * 1000)));
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
  expectedCash,
  onClose,
  availability,
  products,
  summary,
  productionFamilies,
  productionBatches,
}: {
  session: CashSession;
  expectedCash: number;
  onClose: () => void;
  availability: DailyAvailability[];
  products: Product[];
  summary: SessionClosingSummary;
  productionFamilies: ProductionFamily[];
  productionBatches: ProductionBatch[];
}) {
  const [busy, setBusy] = useState(false);
  const [waste, setWaste] = useState<
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
          <div className="flex justify-between text-sm">
            <span>Efectivo esperado</span>
            <b className="money">{formatClp(expectedCash)}</b>
          </div>
          <p className="mt-1 text-[11px] text-[#777]">
            Efectivo inicial + ventas en efectivo − retiros de caja
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
          const difference = produced - sold - wasted;
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
                Registra abajo todo el pan restante como merma por variedad para
                conciliar la producción del día.
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
                  cash: Number(form.get("actual_cash")),
                  debit: Number(form.get("actual_debit")),
                  credit: Number(form.get("actual_credit")),
                  transfer: Number(form.get("actual_transfer")),
                },
                transactions: {
                  cash: Number(form.get("transactions_cash")),
                  debit: Number(form.get("transactions_debit")),
                  credit: Number(form.get("transactions_credit")),
                  transfer: Number(form.get("transactions_transfer")),
                },
                waste: waste
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
            Efectivo contado
            <input
              name="countedCash"
              required
              inputMode="numeric"
              defaultValue={expectedCash}
              className="input mt-2"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["cash", "debit", "credit", "transfer"] as PaymentMethod[]).map(
              (method) => (
                <label key={method} className="block text-xs font-bold">
                  {paymentLabels[method]}
                  <input
                    name={`actual_${method}`}
                    required
                    inputMode="numeric"
                    defaultValue={summary.byPayment[method]}
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
                    defaultValue={summary.transactionsByPayment[method]}
                    className="input mt-1"
                  />
                </label>
              ),
            )}
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
            disabled={busy}
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
