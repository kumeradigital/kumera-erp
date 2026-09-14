import {
  getCashWithdrawals,
  getDailyAvailability,
  getLatestCashSession,
  getRecentDeliveryOrders,
  getPosCatalog,
  getProductionBatches,
  getRecentSessionSales,
  getSessionClosingSummary,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [catalog, latestSession] = await Promise.all([
    getPosCatalog(),
    getLatestCashSession(),
  ]);
  const session = latestSession?.status === "open" ? latestSession : null;
  const [
    withdrawals,
    recentSales,
    recentDeliveryOrders,
    productionBatches,
    closingSummary,
    availability,
  ] = session
    ? await Promise.all([
        getCashWithdrawals(session.id),
        getRecentSessionSales(session.id, 3),
        getRecentDeliveryOrders(session.id, 1000),
        getProductionBatches(session.id),
        getSessionClosingSummary(session.id),
        getDailyAvailability(session.id),
      ])
    : [[], [], [], [], null, []];
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
