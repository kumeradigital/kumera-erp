import { getCostingData } from "@/modules/costs/data";
import { CostsApp, type CostTab } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";
import { getBusinessPulse } from "@/modules/pos/data";

const validTabs: CostTab[] = [
  "ingredients",
  "recipes",
  "products",
  "fixed",
  "projections",
];

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const requestedTab = (await searchParams).tab as CostTab;
  const initialTab = validTabs.includes(requestedTab)
    ? requestedTab
    : "ingredients";
  const [data, businessPulse] = await Promise.all([
    getCostingData(),
    getBusinessPulse(),
  ]);
  return (
    <PosShell active="costs">
      <CostsApp
        {...data}
        businessPulse={businessPulse}
        initialTab={initialTab}
      />
    </PosShell>
  );
}
