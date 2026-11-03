import { describe, expect, it } from "vitest";
import { calculatePayroll } from "@/modules/payroll/calculations";
import type { PayrollEmployee } from "@/modules/payroll/types";

const javiera: PayrollEmployee = {
  id: "javiera",
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
};

const hector: PayrollEmployee = {
  ...javiera,
  id: "hector",
  fullName: "Héctor Lorenzo Cerda Lumán",
  rut: "9.617.854-9",
  jobTitle: "Maestro Panadero",
  afpName: "Capital",
  afpRate: 0.1144,
  baseSalary: 853359,
};

const fullMonth = {
  workedDays: 30,
  contractualDays: 30,
  otherTaxableEarnings: 0,
  otherNonTaxableEarnings: 0,
  advances: 0,
  otherDeductions: 0,
};

describe("calculatePayroll", () => {
  it("reconstruye el líquido mensual de Javiera", () => {
    expect(calculatePayroll(javiera, fullMonth).netPay).toBe(620000);
  });

  it("reconstruye el líquido mensual de Héctor", () => {
    expect(calculatePayroll(hector, fullMonth).netPay).toBe(920000);
  });

  it("calcula octubre proporcional de Javiera y descuenta el anticipo", () => {
    const result = calculatePayroll(javiera, {
      ...fullMonth,
      workedDays: 21,
      advances: 83000,
    });
    expect(result.netBeforeAdvances).toBe(434001);
    expect(result.netPay).toBe(351001);
  });
});
