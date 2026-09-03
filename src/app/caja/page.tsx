import {
  getCashWithdrawals,
  getDailyAvailability,
  getDeliveryProducts,
  getLatestCashSession,
  getRecentDeliveryOrders,
  getOpenCashSession,
  getProductionBatches,
  getProductionFamilies,
  getProducts,
  getRecentSessionSales,
  getSessionClosingSummary,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [
    products,
    deliveryProducts,
    session,
    latestSession,
    productionFamilies,
  ] = await Promise.all([
    getProducts(),
    getDeliveryProducts(),
    getOpenCashSession(),
    getLatestCashSession(),
    getProductionFamilies(),
  ]);
  const withdrawals = session ? await getCashWithdrawals(session.id) : [];
  const recentSales = session ? await getRecentSessionSales(session.id, 3) : [];
  const recentDeliveryOrders = session
    ? await getRecentDeliveryOrders(session.id, 5)
    : [];
  const productionBatches = session
    ? await getProductionBatches(session.id)
    : [];
  const closingSummary = session
    ? await getSessionClosingSummary(session.id)
    : null;
  const availability = session ? await getDailyAvailability(session.id) : [];
  const productsWithAvailability = products.map((product) => ({
    ...product,
    availability: availability.find((row) => row.productId === product.id),
  }));
  return (
    <PosShell active="pos">
      <PosClient
        products={productsWithAvailability}
        deliveryProducts={deliveryProducts.map((product) => ({
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
        productionFamilies={productionFamilies}
        productionBatches={productionBatches}
        latestSession={latestSession}
        closingSummary={closingSummary}
      />
    </PosShell>
  );
}
