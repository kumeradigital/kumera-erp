import { PosShell } from "@/modules/pos/pos-shell";
import { getOperationsData } from "@/modules/operations/data";
import { OperationsApp } from "@/modules/operations/operations-app";
import { getCostingData } from "@/modules/costs/data";
import { getBusinessPulse } from "@/modules/pos/data";
export default async function Page() {
  const [data, costing, businessPulse, globalBusinessPulse] = await Promise.all(
    [
      getOperationsData(),
      getCostingData(),
      getBusinessPulse("current_month"),
      getBusinessPulse("global"),
    ],
  );
  return (
    <PosShell active="operations">
      <OperationsApp
        {...data}
        fixedCosts={costing.fixedCosts}
        monthlyFixedCosts={costing.monthlyFixedCosts}
        costSettings={costing.settings}
        businessPulse={businessPulse}
        globalBusinessPulse={globalBusinessPulse}
      />
    </PosShell>
  );
}
