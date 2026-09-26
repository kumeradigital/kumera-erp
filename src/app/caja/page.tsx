import {
  getLatestCashSession,
  getPosCatalog,
  getPosSessionSnapshot,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [catalog, latestSession] = await Promise.all([
    getPosCatalog(),
    getLatestCashSession(),
  ]);
  const session = latestSession?.status === "open" ? latestSession : null;
  const snapshot = session ? await getPosSessionSnapshot(session.id) : null;
  const withdrawals = snapshot?.withdrawals || [];
  const recentSales = snapshot?.recentSales || [];
  const recentDeliveryOrders = snapshot?.deliveryOrders || [];
  const productionBatches = snapshot?.productionBatches || [];
  const closingSummary = snapshot?.closingSummary || null;
  const availability = snapshot?.availability || [];
  const productsWithAvailability = catalog.products.map((product) => ({
    ...product,
    availability: availability.find((row) => row.productId === product.id),
  }));
  return (
    <PosShell active="pos">
      <PosClient
        products={productsWithAvailability}
        deliveryProducts={catalog.deliveryProducts.map((product) => ({
          ...product,
          availability: availability.find(
            (row) => row.productId === product.id,
          ),
        }))}
        availability={availability}
        session={session}
        withdrawals={withdrawals}
        recentSales={recentSales}
        recentDeliveryOrders={recentDeliveryOrders}
        productionFamilies={catalog.productionFamilies}
        productionBatches={productionBatches}
        latestSession={latestSession}
        closingSummary={closingSummary}
      />
    </PosShell>
  );
}
