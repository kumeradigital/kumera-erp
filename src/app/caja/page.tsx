import {
  getCashSalesTotal,
  getCashWithdrawals,
  getCardFeeSettings,
  getDailyAvailability,
  getLatestCashSession,
  getOpenCashSession,
  getProductionBatches,
  getProductionFamilies,
  getProducts,
  getSessionClosingSummary,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [
    products,
    session,
    latestSession,
    cardFeeSettings,
    productionFamilies,
  ] = await Promise.all([
    getProducts(),
    getOpenCashSession(),
    getLatestCashSession(),
    getCardFeeSettings(),
    getProductionFamilies(),
  ]);
  const cashSales = session ? await getCashSalesTotal(session.id) : 0;
  const withdrawals = session ? await getCashWithdrawals(session.id) : [];
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
        availability={availability}
        session={session}
        cashSales={cashSales}
        withdrawals={withdrawals}
        productionFamilies={productionFamilies}
        productionBatches={productionBatches}
        latestSession={latestSession}
        cardFeeSettings={cardFeeSettings}
        closingSummary={closingSummary}
      />
    </PosShell>
  );
}
