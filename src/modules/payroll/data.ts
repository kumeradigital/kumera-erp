import { createClient } from "@/server/supabase/server";
import { calculatePayroll } from "./calculations";
import type {
  PayrollEmployee,
  PayrollPageData,
  PayrollSavedSlip,
} from "./types";

const fallbackEmployees: PayrollEmployee[] = [
  {
    id: "hector-demo",
    fullName: "Héctor Lorenzo Cerda Lumán",
    rut: "9.617.854-9",
    jobTitle: "Maestro Panadero",
    afpName: "Capital",
    afpRate: 0.1144,
    healthSystem: "FONASA",
    healthRate: 0.07,
    baseSalary: 853359,
    mealAllowance: 20000,
    transportAllowance: 30000,
  },
  {
    id: "javiera-demo",
    fullName: "Javiera del Pilar Maureira Bravo",
    rut: "19.483.888-3",
    jobTitle: "Pastelera",
    afpName: "PlanVital",
    afpRate: 0.1116,
    healthSystem: "FONASA",
    healthRate: 0.07,
    baseSalary: 557185,
    mealAllowance: 20000,
    transportAllowance: 30000,
  },
];

function fallbackSlips(): PayrollSavedSlip[] {
  return fallbackEmployees.map((employee) => {
    const isJaviera = employee.rut === "19.483.888-3";
    const input = {
      workedDays: isJaviera ? 21 : 30,
      contractualDays: 30,
      otherTaxableEarnings: 0,
      otherNonTaxableEarnings: 0,
      advances: isJaviera ? 83000 : 0,
      otherDeductions: 0,
    };
    return {
      employeeId: employee.id,
      period: "2026-10-01",
      ...input,
      ...calculatePayroll(employee, input),
      paymentStatus: "paid" as const,
      paidOn: "2026-11-01",
      notes: isJaviera
        ? "21 días trabajados y anticipo previo de $83.000, según historial financiero."
        : "Mes completo pagado.",
    };
  });
}

export async function getPayrollPageData(): Promise<PayrollPageData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");
  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!membership) throw new Error("Sin negocio asignado");

  const [businessResult, employeesResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("legal_name,rut,address,commune")
      .eq("id", membership.business_id)
      .single(),
    supabase
      .from("employees")
      .select(
        "id,full_name,rut,job_title,afp_name,afp_rate,health_system,health_rate,base_salary,meal_allowance,transport_allowance",
      )
      .eq("business_id", membership.business_id)
      .eq("active", true)
      .order("full_name"),
  ]);
  const business = businessResult.data;
  if (employeesResult.error || !employeesResult.data) {
    return {
      business: {
        legalName: business?.legal_name || "GOYA SpA",
        rut: business?.rut || "78.460.151-K",
        address: business?.address || "Rosita Renard 1525, Local 2",
        commune: business?.commune || "Ñuñoa",
      },
      employees: fallbackEmployees,
      slips: fallbackSlips(),
      databaseReady: false,
    };
  }
  const employees: PayrollEmployee[] = employeesResult.data.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    rut: row.rut,
    jobTitle: row.job_title,
    afpName: row.afp_name,
    afpRate: Number(row.afp_rate),
    healthSystem: row.health_system,
    healthRate: Number(row.health_rate),
    baseSalary: Number(row.base_salary),
    mealAllowance: Number(row.meal_allowance),
    transportAllowance: Number(row.transport_allowance),
  }));
  const { data: slipRows } = await supabase
    .from("payroll_slips")
    .select("*")
    .eq("business_id", membership.business_id)
    .eq("period", "2026-10-01");
  const slips: PayrollSavedSlip[] = (slipRows || []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    period: row.period,
    workedDays: row.worked_days,
    contractualDays: row.contractual_days,
    baseEarned: Number(row.base_earned),
    gratification: Number(row.gratification),
    otherTaxableEarnings: Number(row.other_taxable_earnings),
    taxableEarnings:
      Number(row.base_earned) +
      Number(row.gratification) +
      Number(row.other_taxable_earnings),
    mealAllowance: Number(row.meal_allowance),
    transportAllowance: Number(row.transport_allowance),
    otherNonTaxableEarnings: Number(row.other_non_taxable_earnings),
    nonTaxableEarnings:
      Number(row.meal_allowance) +
      Number(row.transport_allowance) +
      Number(row.other_non_taxable_earnings),
    totalEarnings:
      Number(row.base_earned) +
      Number(row.gratification) +
      Number(row.other_taxable_earnings) +
      Number(row.meal_allowance) +
      Number(row.transport_allowance) +
      Number(row.other_non_taxable_earnings),
    afpDeduction: Number(row.afp_deduction),
    healthDeduction: Number(row.health_deduction),
    unemploymentDeduction: Number(row.unemployment_deduction),
    incomeTax: Number(row.income_tax),
    advances: Number(row.advances),
    otherDeductions: Number(row.other_deductions),
    legalDeductions:
      Number(row.afp_deduction) +
      Number(row.health_deduction) +
      Number(row.unemployment_deduction) +
      Number(row.income_tax),
    totalDeductions:
      Number(row.afp_deduction) +
      Number(row.health_deduction) +
      Number(row.unemployment_deduction) +
      Number(row.income_tax) +
      Number(row.advances) +
      Number(row.other_deductions),
    netBeforeAdvances: Number(row.net_pay) + Number(row.advances),
    netPay: Number(row.net_pay),
    paymentStatus: row.payment_status,
    paidOn: row.paid_on || undefined,
    notes: row.notes || undefined,
  }));
  return {
    business: {
      legalName: business?.legal_name || "GOYA SpA",
      rut: business?.rut || "78.460.151-K",
      address: business?.address || "Rosita Renard 1525, Local 2",
      commune: business?.commune || "Ñuñoa",
    },
    employees,
    slips,
    databaseReady: true,
  };
}
