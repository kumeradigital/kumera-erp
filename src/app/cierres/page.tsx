import { getCashClosureHistory } from "@/modules/pos/data";
import { CashClosureHistory } from "@/modules/pos/cash-closure-history";
import { PosShell } from "@/modules/pos/pos-shell";

export default async function CashClosuresPage() {
  const closures = await getCashClosureHistory();
  return (
    <PosShell active="closures">
      <CashClosureHistory closures={closures} />
    </PosShell>
  );
}
