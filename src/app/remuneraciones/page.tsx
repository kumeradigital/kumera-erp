import { PosShell } from "@/modules/pos/pos-shell";
import { PayrollApp } from "@/modules/payroll/payroll-app";
import { getPayrollPageData } from "@/modules/payroll/data";

export default async function PayrollPage() {
  const data = await getPayrollPageData();
  return (
    <PosShell active="payroll">
      <PayrollApp data={data} />
    </PosShell>
  );
}
