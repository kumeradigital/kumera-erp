import { PosShell } from "@/modules/pos/pos-shell";
import { PayrollApp } from "@/modules/payroll/payroll-app";
import { getPayrollPageData } from "@/modules/payroll/data";
import { requireModule } from "@/server/saas/access";

export default async function PayrollPage() {
  await requireModule("payroll");
  const data = await getPayrollPageData();
  return (
    <PosShell active="payroll">
      <PayrollApp data={data} />
    </PosShell>
  );
}
