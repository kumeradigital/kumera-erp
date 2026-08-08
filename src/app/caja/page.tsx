import {
  getCashSalesTotal,
  getDailyAvailability,
  getLatestCashSession,
  getOpenCashSession,
  getProducts,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [products, session, latestSession] = await Promise.all([
    getProducts(),
    getOpenCashSession(),
    getLatestCashSession(),
  ]);
  const cashSales = session ? await getCashSalesTotal(session.id) : 0;
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
        latestSession={latestSession}
      />
    </PosShell>
  );
}
