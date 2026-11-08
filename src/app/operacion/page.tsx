import { PosShell } from "@/modules/pos/pos-shell";
import { getOperationsData } from "@/modules/operations/data";
import { OperationsApp } from "@/modules/operations/operations-app";
import { getCostingData } from "@/modules/costs/data";
import { getBusinessPulse, getBusinessPulseMonths } from "@/modules/pos/data";
export default async function Page() {
  const dataPromise = getOperationsData();
  const costingPromise = getCostingData();
  const globalPulsePromise = getBusinessPulse("global");
  const months = await getBusinessPulseMonths();
  const monthlyBusinessPulses = await Promise.all(
    months.map(async (month) => ({
      month,
      pulse: await getBusinessPulse({ month }),
    })),
  );
  const [data, costing, globalBusinessPulse] = await Promise.all([
    dataPromise,
    costingPromise,
    globalPulsePromise,
  ]);
  const businessPulse = monthlyBusinessPulses[0].pulse;
  return (
    <PosShell active="operations">
      <OperationsApp
        {...data}
        fixedCosts={costing.fixedCosts}
        monthlyFixedCosts={costing.monthlyFixedCosts}
        costSettings={costing.settings}
        businessPulse={businessPulse}
        globalBusinessPulse={globalBusinessPulse}
        monthlyBusinessPulses={monthlyBusinessPulses}
      />
    </PosShell>
  );
}
