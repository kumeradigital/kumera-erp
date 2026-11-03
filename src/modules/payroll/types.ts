export type PayrollEmployee = {
  id: string;
  fullName: string;
  rut: string;
  jobTitle: string;
  afpName: string;
  afpRate: number;
  healthSystem: string;
  healthRate: number;
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
};

export type PayrollInput = {
  workedDays: number;
  contractualDays: number;
  otherTaxableEarnings: number;
  otherNonTaxableEarnings: number;
  advances: number;
  otherDeductions: number;
};

export type PayrollCalculation = {
  baseEarned: number;
  gratification: number;
  taxableEarnings: number;
  mealAllowance: number;
  transportAllowance: number;
  nonTaxableEarnings: number;
  totalEarnings: number;
  afpDeduction: number;
  healthDeduction: number;
  unemploymentDeduction: number;
  incomeTax: number;
  legalDeductions: number;
  totalDeductions: number;
  netBeforeAdvances: number;
  netPay: number;
};

export type PayrollSavedSlip = PayrollInput &
  PayrollCalculation & {
    id?: string;
    employeeId: string;
    period: string;
    paymentStatus: "draft" | "paid";
    paidOn?: string;
    notes?: string;
  };

export type PayrollPageData = {
  business: {
    legalName: string;
    rut: string;
    address: string;
    commune: string;
  };
  employees: PayrollEmployee[];
  slips: PayrollSavedSlip[];
  databaseReady: boolean;
};
