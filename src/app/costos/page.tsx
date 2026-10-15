import { getCostingData } from "@/modules/costs/data";
import { CostsApp, type CostTab } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";

const validTabs: CostTab[] = ["ingredients", "recipes", "products"];

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const requestedTab = (await searchParams).tab as CostTab;
  const initialTab = validTabs.includes(requestedTab)
    ? requestedTab
    : "ingredients";
  const data = await getCostingData();
  return (
    <PosShell active="costs">
      <CostsApp
        ingredients={data.ingredients}
        recipes={data.recipes}
        recipeCosts={data.recipeCosts}
        analyses={data.analyses}
        initialTab={initialTab}
      />
    </PosShell>
  );
}
