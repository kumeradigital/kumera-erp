"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/server/supabase/server";
import { calculatePayroll } from "./calculations";
import type { PayrollEmployee } from "./types";

const payloadSchema = z.object({
  employeeId: z.string().uuid(),
  period: z.literal("2026-10-01"),
  workedDays: z.number().int().min(0).max(30),
  contractualDays: z.literal(30),
  otherTaxableEarnings: z.number().int().min(0),
  otherNonTaxableEarnings: z.number().int().min(0),
  advances: z.number().int().min(0),
  otherDeductions: z.number().int().min(0),
  paymentStatus: z.enum(["draft", "paid"]),
  paidOn: z.string().optional(),
  notes: z.string().max(600).optional(),
});

export async function savePayrollSlipAction(raw: unknown) {
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success)
    return { ok: false, message: "Revisa los datos ingresados." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ya no es válida." };
  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!membership)
    return { ok: false, message: "No tienes un negocio asignado." };
  const { data: row } = await supabase
    .from("employees")
    .select("*")
    .eq("id", parsed.data.employeeId)
    .eq("business_id", membership.business_id)
    .single();
  if (!row) return { ok: false, message: "No encontramos al trabajador." };
  const employee: PayrollEmployee = {
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
  };
  const calculation = calculatePayroll(employee, parsed.data);
  const { error } = await supabase.from("payroll_slips").upsert(
    {
      business_id: membership.business_id,
      employee_id: employee.id,
      period: parsed.data.period,
      worked_days: parsed.data.workedDays,
      contractual_days: parsed.data.contractualDays,
      base_earned: calculation.baseEarned,
      gratification: calculation.gratification,
      other_taxable_earnings: parsed.data.otherTaxableEarnings,
      meal_allowance: calculation.mealAllowance,
      transport_allowance: calculation.transportAllowance,
      other_non_taxable_earnings: parsed.data.otherNonTaxableEarnings,
      afp_deduction: calculation.afpDeduction,
      health_deduction: calculation.healthDeduction,
      unemployment_deduction: calculation.unemploymentDeduction,
      income_tax: calculation.incomeTax,
      advances: parsed.data.advances,
      other_deductions: parsed.data.otherDeductions,
      net_pay: calculation.netPay,
      payment_status: parsed.data.paymentStatus,
      paid_on: parsed.data.paidOn || null,
      notes: parsed.data.notes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,employee_id,period" },
  );
  if (error) {
    console.error("No se pudo guardar la liquidación", error);
    return { ok: false, message: "No pudimos guardar la liquidación." };
  }
  revalidatePath("/remuneraciones");
  return { ok: true, message: "Liquidación guardada." };
}
