import { getCostingData } from "@/modules/costs/data";
import { CostsApp } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";

export default async function CostsPage() {
  const data = await getCostingData();
  return (
    <PosShell active="costs">
      <CostsApp {...data} />
    </PosShell>
  );
}
