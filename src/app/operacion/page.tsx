import { PosShell } from "@/modules/pos/pos-shell";
import { getOperationsData } from "@/modules/operations/data";
import { OperationsApp } from "@/modules/operations/operations-app";
export default async function Page() {
  const data = await getOperationsData();
  return (
    <PosShell active="operations">
      <OperationsApp {...data} />
    </PosShell>
  );
}
