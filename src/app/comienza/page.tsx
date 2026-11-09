import { getCostingData } from "@/modules/costs/data";
import { CostingRoadmap } from "@/modules/costs/costs-app";
import { PosShell } from "@/modules/pos/pos-shell";
import { requireModule } from "@/server/saas/access";

export const dynamic = "force-dynamic";

export default async function GettingStartedPage() {
  await requireModule("costing");
  const data = await getCostingData();
  return (
    <PosShell active="getting-started">
      <main className="mx-auto max-w-6xl p-5 pb-24 md:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#6e746c]">
            Comienza
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Configura Kumera paso a paso
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#747970]">
            Esta guía estará disponible durante tus primeros 30 días. Puedes
            avanzar a tu ritmo y volver cuando necesites recordar el siguiente
            paso.
          </p>
        </div>
        <CostingRoadmap
          fixedCosts={data.fixedCosts}
          ingredients={data.ingredients}
          recipes={data.recipes}
          analyses={data.analyses}
        />
      </main>
    </PosShell>
  );
}
