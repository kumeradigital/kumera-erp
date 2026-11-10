import { getCostingData } from "@/modules/costs/data";
import { CostsApp, type CostTab } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";
import { getArchivedProducts, getProducts } from "@/modules/pos/data";
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
  searchParams: Promise<{ tab?: string; view?: string }>;
}) {
  await requireModule("costing");
  const params = await searchParams;
  const requestedTab = params.tab as CostTab;
  const [data, catalogProducts, archivedProducts] = await Promise.all([
    getCostingData(),
    getProducts(true),
    getArchivedProducts(),
  ]);
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
        initialProductView={params.view === "catalog" ? "catalog" : "costing"}
        catalogProducts={catalogProducts}
        archivedProducts={archivedProducts}
      />
    </PosShell>
  );
}
