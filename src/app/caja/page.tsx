import {
  getCashSalesTotal,
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
  return (
    <PosShell active="pos">
      <PosClient
        products={products}
        session={session}
        cashSales={cashSales}
        latestSession={latestSession}
      />
    </PosShell>
  );
}
