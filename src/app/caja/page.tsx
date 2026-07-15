import {
  getCashSalesTotal,
  getOpenCashSession,
  getProducts,
} from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { PosClient } from "@/modules/pos/pos-client";
export default async function PosPage() {
  const [products, session] = await Promise.all([
    getProducts(),
    getOpenCashSession(),
  ]);
  const cashSales = session ? await getCashSalesTotal(session.id) : 0;
  return (
    <PosShell active="pos">
      <PosClient products={products} session={session} cashSales={cashSales} />
    </PosShell>
  );
}
