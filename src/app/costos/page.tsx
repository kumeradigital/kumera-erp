import { getCostingData } from "@/modules/costs/data";
import { CostsApp, type CostTab } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";
import { requireModule } from "@/server/saas/access";

const validTabs: CostTab[] = [
  "business",
  "own",
  "resale",
  "supplies",
  "ingredients",
  "recipes",
  "products",
];

export default async function CostsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireModule("costing");
  const params = await searchParams;
  const requestedTab = params.tab as CostTab;
  const data = await getCostingData();
  const initialTab = validTabs.includes(requestedTab) ? requestedTab : "own";
  return (
    <PosShell active="costs">
      <CostsApp
        ingredients={data.ingredients}
        recipes={data.recipes}
        recipeCosts={data.recipeCosts}
        analyses={data.analyses}
        fixedCosts={data.fixedCosts}
        monthlyFixedCosts={data.monthlyFixedCosts}
        settings={data.settings}
        schedule={data.schedule}
        initialTab={initialTab}
      />
    </PosShell>
  );
}
