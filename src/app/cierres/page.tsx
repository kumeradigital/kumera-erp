import { getCashClosureHistory } from "@/modules/pos/data";
import { CashClosureHistory } from "@/modules/pos/cash-closure-history";
import { PosShell } from "@/modules/pos/pos-shell";

export default async function CashClosuresPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string }>;
}) {
  const requested = Number((await searchParams).limit || 30);
  const limit = Number.isInteger(requested)
    ? Math.min(200, Math.max(30, requested))
    : 30;
  const closures = await getCashClosureHistory(limit);
  return (
    <PosShell active="closures">
      <CashClosureHistory
        closures={closures}
        hasMore={closures.length === limit && limit < 200}
        nextLimit={Math.min(200, limit + 30)}
      />
    </PosShell>
  );
}
