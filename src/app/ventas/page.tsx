import { getSalesSummary } from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { SalesDashboard } from "@/modules/pos/sales-dashboard";
export default async function SalesPage() {
  const data = await getSalesSummary();
  return (
    <PosShell active="sales">
      <SalesDashboard {...data} />
    </PosShell>
  );
}
