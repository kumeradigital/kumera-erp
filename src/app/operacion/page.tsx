import { PosShell } from "@/modules/pos/pos-shell";
import { getOperationsData } from "@/modules/operations/data";
import { OperationsApp } from "@/modules/operations/operations-app";
import { getCostingData } from "@/modules/costs/data";
import { getBusinessPulse } from "@/modules/pos/data";
export default async function Page() {
  const [data, costing, businessPulse] = await Promise.all([
    getOperationsData(),
    getCostingData(),
    getBusinessPulse(),
  ]);
  return (
    <PosShell active="operations">
      <OperationsApp
        {...data}
        fixedCosts={costing.fixedCosts}
        monthlyFixedCosts={costing.monthlyFixedCosts}
        costSettings={costing.settings}
        businessPulse={businessPulse}
      />
    </PosShell>
  );
}
