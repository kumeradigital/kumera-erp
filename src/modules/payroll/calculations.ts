import type {
  PayrollCalculation,
  PayrollEmployee,
  PayrollInput,
} from "./types";

export const OCTOBER_2026_PARAMETERS = {
  gratificationMonthlyCap: 213354,
  incomeTaxExemptLimit: 974038.5,
  incomeTaxFirstBracketLimit: 2164530,
  incomeTaxFirstBracketFactor: 0.04,
  incomeTaxFirstBracketRebate: 38961.54,
};

const pesos = (value: number) => Math.max(0, Math.round(value || 0));

export function calculatePayroll(
  employee: PayrollEmployee,
  input: PayrollInput,
): PayrollCalculation {
  const contractualDays = Math.max(1, pesos(input.contractualDays));
  const workedDays = Math.min(contractualDays, pesos(input.workedDays));
  const proportion = workedDays / contractualDays;
  const baseEarned = pesos(employee.baseSalary * proportion);
  const proportionalGratificationCap =
    OCTOBER_2026_PARAMETERS.gratificationMonthlyCap * proportion;
  const gratification = pesos(
    Math.min(baseEarned * 0.25, proportionalGratificationCap),
  );
  const otherTaxableEarnings = pesos(input.otherTaxableEarnings);
  const taxableEarnings = baseEarned + gratification + otherTaxableEarnings;
  const mealAllowance = pesos(employee.mealAllowance * proportion);
  const transportAllowance = pesos(employee.transportAllowance * proportion);
  const otherNonTaxableEarnings = pesos(input.otherNonTaxableEarnings);
  const nonTaxableEarnings =
    mealAllowance + transportAllowance + otherNonTaxableEarnings;
  const totalEarnings = taxableEarnings + nonTaxableEarnings;
  const afpDeduction = pesos(taxableEarnings * employee.afpRate);
  const healthDeduction = pesos(taxableEarnings * employee.healthRate);
  // Ambos contratos son a plazo fijo; no corresponde aporte AFC del trabajador.
  const unemploymentDeduction = 0;
  const taxableIncome = Math.max(
    0,
    taxableEarnings - afpDeduction - healthDeduction - unemploymentDeduction,
  );
  let incomeTax = 0;
  if (
    taxableIncome > OCTOBER_2026_PARAMETERS.incomeTaxExemptLimit &&
    taxableIncome <= OCTOBER_2026_PARAMETERS.incomeTaxFirstBracketLimit
  ) {
    incomeTax = pesos(
      taxableIncome * OCTOBER_2026_PARAMETERS.incomeTaxFirstBracketFactor -
        OCTOBER_2026_PARAMETERS.incomeTaxFirstBracketRebate,
    );
  }
  const advances = pesos(input.advances);
  const otherDeductions = pesos(input.otherDeductions);
  const legalDeductions =
    afpDeduction + healthDeduction + unemploymentDeduction + incomeTax;
  const totalDeductions = legalDeductions + advances + otherDeductions;
  const netBeforeAdvances = totalEarnings - legalDeductions;
  const netPay = totalEarnings - totalDeductions;
  return {
    baseEarned,
    gratification,
    taxableEarnings,
    mealAllowance,
    transportAllowance,
    nonTaxableEarnings,
    totalEarnings,
    afpDeduction,
    healthDeduction,
    unemploymentDeduction,
    incomeTax,
    legalDeductions,
    totalDeductions,
    netBeforeAdvances,
    netPay,
  };
}
